import { getState, getSteps, getInputs } from "./state.js"
import path from 'path';
import os from 'os';
import fs from 'fs';
import { execSync, spawn } from "child_process";
import { createGithubRepoAndPush, getGithubToken } from "./github.js";
import { sendToClients } from "./ws.js";
import { fetchPackage } from "./repo.js";
import { runDockerComposeBuild, runDockerComposeService } from "./docker.js";

function runDockerBuild(stepName, path) {
  return new Promise((resolve, reject) => {
    const dockerBuild = spawn('docker', ['build', '--network', 'host', '-t', `tofuhub-${stepName}`, '.'], {
      cwd: path,
    });

    dockerBuild.stdout.on('data', (data) => {
      sendToClients(data.toString());
    });

    dockerBuild.stderr.on('data', (data) => {
      sendToClients(data.toString());
    });

    dockerBuild.on('close', (code) => {
      sendToClients(`[build done: exit code ${code}]`);
      if (code === 0) {
        return resolve();
      } else {
        return reject(new Error(`Docker build failed with exit code ${code}`));
      }
    });

    dockerBuild.on('error', (err) => {
      return reject(err);
    });
  });
}

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
  
  console.info(pkgDetails)
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

  const githubToken = await getGithubToken(); // new line
  let renamedRepoDir = repoDir;
  
  console.info(process.env)
  console.info(githubToken)
  // We only make a copy of the package and push it to the
  // user's repo if it's a deploy package.
  if (packageType === 'PACKAGE') {
    console.log(`🔄 Creating/pushing to user GitHub repo for ${name}`);
    console.log(`🔄 Preparing to push to user's GitHub...`);
  
    // Push a copy of the repo to the personal/org account of the user
    const { repoUrl: userRepoUrl, repoDir: pushedRenamedRepoDir } = await createGithubRepoAndPush(repoDir, name, githubToken, org); // updated call
    renamedRepoDir = pushedRenamedRepoDir;
  }
  
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
    // === Generate override file for volumes ===
  const volumeMappings = [
    [os.homedir() + '/.ssh', '/root/.ssh:ro'],
    [resolvedRepoDir, '/repo'],
    // ['/var/run/docker.sock', '/var/run/docker.sock'],
    ...extraVolumes
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

  const resolvedRepoDir = path.resolve(repoDir);

  const env = {
    githubToken,
    ...getInputs()
  };

  await runDockerComposeBuild(serviceName, overridePath, resolvedRepoDir, env);

  console.log(`🚀 Running container for ${name}`);
  return runDockerComposeService({
    resolvedRepoDir,
    serviceName,
    env,
    useUp: true,
    overridePath
  });
}

export async function run() {
  console.debug(`Started processing steps..`)
  const steps = getSteps();

  for (const step of steps) {
    await processStep(step)
  }

  return getState();
}