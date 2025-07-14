import { getState, getSteps, getInputs } from "./state.js"
import path from 'path';
import os, { homedir } from 'os';
import fs, { readFileSync } from 'fs';
import https from 'https';
import { execSync } from "child_process";
// import { createGithubRepoAndPush, getGithubToken } from "./github.js";
import { sendToClients } from "./ws.js";
import { fetchPackage } from "./repo.js";
import { runDockerComposeService } from "./docker.js";

async function processStep(stepWithDetails) {
  console.info(`Processing step ${stepWithDetails.name}`)
    
  const { package: packageName, name, org } = stepWithDetails;

  if (!packageName) {
    console.error(`Package is null, returning..`);
    return;
  }

  if (!name) {
    console.error(`Step name is null, returning...`);
    return;
  }

  
  const pkgDetails = await fetchPackage(
    `https://api.tofuhub.co/functions/v1/packages/${packageName}`,
    process.env.TOFUHUB_API_TOKEN
  );

  const privKeyPath = path.join(homedir(), '.ssh', 'id_rsa')
  const pubKeyPath = path.join(homedir(), '.ssh', 'id_rsa.pub')
  const pubKey = readFileSync(pubKeyPath, 'utf8').trim()
    
  // Upload SSH key to all relevant providers
  const keyIds = await uploadPublicKeyToAllProviders(pubKey, pkgDetails.versions.configuration.inputs, getInputs());
  
  // If the tofuhub directory does not exist, then create it. This is where
  // all the repos will be cloned into by the runner
  const cwd = process.cwd();
  const tofuhubDir = path.join(cwd, 'tofuhub');
  if (!fs.existsSync(tofuhubDir)) fs.mkdirSync(tofuhubDir);

  const packageType = pkgDetails.package_types.name;
  const repoUrl = pkgDetails.versions.repository;
  const repoDir = path.join(tofuhubDir, packageName);

  // Clone the repo
  console.log(`📥 Cloning ${repoUrl} to ${repoDir}`);
  execSync(`git clone ${repoUrl} ${repoDir}`, { stdio: 'inherit' });

  // TODO: add collision checking also before it runs
  // await checkCollisions();

  // const githubToken = await getGithubToken(); // new line
  let renamedRepoDir = repoDir;
  
  // console.info(process.env)
  // console.info(githubToken)
  // We only make a copy of the package and push it to the
  // user's repo if it's a deploy package.
  // if (packageType === 'PACKAGE') {
    // console.log(`🔄 Creating/pushing to user GitHub repo for ${name}`);
    // console.log(`🔄 Preparing to push to user's GitHub...`);
    // Push a copy of the repo to the personal/org account of the user
    // const { repoUrl: userRepoUrl, repoDir: pushedRenamedRepoDir } = await createGithubRepoAndPush(repoDir, name, githubToken, org); // updated call
    // renamedRepoDir = pushedRenamedRepoDir;
  // }
  
  // Read the Dockerfile and build an image with it
  const dockerfilePath = path.join(renamedRepoDir, 'Dockerfile'); 

  if (!fs.existsSync(dockerfilePath)) {
    console.error(`❌ No Dockerfile found for ${name}`);
    process.exit(1);
  }

  console.log(`🐳 Building Docker image for ${name}`);
  
  // await runDockerBuild(`tofuhub-${name}`, renamedRepoDir);
  const overridePath = path.join(os.tmpdir(), 'tofuhub.override.yml');
  const serviceName = 'tofuhub-runner';
  const resolvedRepoDir = path.resolve(repoDir);
    // === Generate override file for volumes ===
  const volumeMappings = [
    [os.homedir() + '/.ssh', '/root/.ssh:ro'],
    [resolvedRepoDir, '/repo'],
    // ['/var/run/docker.sock', '/var/run/docker.sock'],
  ];
  
  const overrideYml = `
  version: '3.9'
  services:
    ${serviceName}:
      network_mode: host
      build:
        context: .
        dockerfile: Dockerfile
      volumes:
  ${volumeMappings.map(([local, container]) => `      - "${path.resolve(local)}:${container}"`).join('\n')}
  `;
  
  fs.writeFileSync(overridePath, overrideYml);

  // const env = {
  //   githubToken,
  //   ...getInputs()
  // };

  console.log(`🚀 Running container for ${name}`);
  return runDockerComposeService({
    repoDir: renamedRepoDir,
    env: {
      // githubToken,
      ...getInputs(),
      private_key_path: privKeyPath,
      do_ssh_key_ids: keyIds.digitalocean ? [keyIds.digitalocean] : undefined
    },
    useUp: true
  });
}

function pushPublicKeyToDigitalOcean(publicKey, keyName, accessToken) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      name: keyName,
      public_key: publicKey
    })

    const options = {
      hostname: 'api.digitalocean.com',
      path: '/v2/account/keys',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }

    const req = https.request(options, (res) => {
      let body = ''

      res.on('data', (chunk) => {
        body += chunk
      })

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            const parsed = JSON.parse(body)
            return resolve(parsed.ssh_key.id)
          } catch (err) {
            return reject(new Error(`Failed to parse DigitalOcean response: ${body}`))
          }
        } else {
          reject(new Error(`DigitalOcean API error ${res.statusCode}: ${body}`))
        }
      })
    })

    req.on('error', (err) => {
      reject(err)
    })

    req.write(data)
    req.end()
  })
}

function findAccessTokenForProvider(provider, configMap, inputs) {
  for (const key in configMap) {
    const entry = configMap[key]
    if (entry.provider === provider && entry.primitive === 'access_token') {
      return inputs[key]
    }
  }
  return undefined
}

/**
 * Uploads the SSH public key to all relevant providers found in the configMap.
 * @param {string} pubKey - The SSH public key contents
 * @param {Object} configMap - Configuration describing each input
 * @param {Object} inputs - Actual values for each input
 */
async function uploadPublicKeyToAllProviders(pubKey, configMap, inputs) {
  const providers = new Set()
  const keyIds = {}; // <-- result we return

  // Step 1: Extract all providers
  for (const key in configMap) {
    const entry = configMap[key]
    if (entry.provider) {
      providers.add(entry.provider)
    }
  }

  // Step 2: Upload to each provider
  for (const provider of providers) {
    const token = findAccessTokenForProvider(provider, configMap, inputs)

    if (!token) {
      console.warn(`⚠️  No access token found for provider "${provider}", skipping.`)
      continue
    }

    if (provider === 'digitalocean') {
      try {
        console.log(`🔐 Uploading SSH key to DigitalOcean...`)
        const id = await pushPublicKeyToDigitalOcean(pubKey, 'tofuhub-deployer', token)
        keyIds[provider] = id.toString(); // store as string for TF

        console.log(`✅ SSH key uploaded to DigitalOcean.`)
      } catch (err) {
        console.error(`❌ Failed to upload SSH key to DigitalOcean:`, err)
      }
    } else {
      console.warn(`⚠️  No handler defined for provider "${provider}", skipping.`)
    } 
  }

  return keyIds;
}


export async function run() {
  console.debug(`Started processing steps..`)
  const steps = getSteps();

  for (const step of steps) {
    await processStep(step)
  }

  return getState();
}