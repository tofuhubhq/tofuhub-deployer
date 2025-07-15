import path from 'path';
import fs from 'fs';
import { spawn } from "child_process";
import { sendToClients } from './ws.js';
import os from 'os';


export function runDockerComposeService({
  packageName,
  repoDir,
  serviceName = 'tofuhub-worker',
  env = {},                       // key-value map
  command = null,                 // command override (e.g. 'node src/index.js')
  extraVolumes = [],              // [ [local, container], ... ]
  extraPorts = ["6080:6080"]                 // [ "6080:6080", "3000:3000", ... ]
}) {

  const resolvedRepoDir = path.resolve(repoDir);
  const overridePath = path.join(os.tmpdir(), 'tofuhub.override.yml');

  const fastifyPublicOutputsPath = path.resolve(process.cwd(), 'public/outputs', packageName);
  console.info(`fastify public path: ${fastifyPublicOutputsPath}`);
  if (!fs.existsSync(fastifyPublicOutputsPath)) {
    fs.mkdirSync(fastifyPublicOutputsPath, { recursive: true });
  }

  // === Generate override file for volumes ===
  const volumeMappings = [
    [os.homedir() + '/.ssh', '/root/.ssh:ro'],
    [fastifyPublicOutputsPath, '/outputs'],
    ['/var/run/docker.sock', '/var/run/docker.sock'],
    ...extraVolumes
  ];

  const overrideYml = `
version: '3.9'
services:
  ${serviceName}:
    environment:
${Object.entries(env).map(([key, val]) => `      ${key}: "${val}"`).join('\n')}    
    build:
      context: .
      dockerfile: Dockerfile
      network: host  # 👈 This makes the build use the host network (like --network=host
    ports:
${extraPorts.map(p => `      - "${p}"`).join('\n')}
    volumes:
${volumeMappings.map(([local, container]) => `      - "${path.resolve(local)}:${container}"`).join('\n')}
`;

  fs.writeFileSync(overridePath, overrideYml);

  // === Build docker compose run command ===
  const composeArgs = [
    'compose',
    '-f', 'docker-compose.yml',
    '-f', overridePath,
    'up',
    serviceName
  ];

  if (command) {
    composeArgs.push(...command.split(' '));
  }

  const container = spawn('docker', composeArgs, {
    cwd: resolvedRepoDir,
    env: { ...process.env, ...env }
  });

  container.stdout.on('data', (data) => {
    console.info(data.toString())
    sendToClients(data.toString());
  });

  container.stderr.on('data', (data) => {
    console.info(data.toString())
    sendToClients(data.toString());
  });

  container.on('close', (code) => {
    console.info(code)
    sendToClients(`[container exited with code ${code}]\n`);
  });

  return new Promise((resolve, reject) => {
    container.on('exit', (code) => {

      fs.rmSync(overridePath, { force: true });
      if (code !== 0) {
        console.info(code)
        return reject(new Error(`Docker Compose exited with code ${code}`));
      } else {
        return resolve();
      }
    });

    container.on('error', (err) => {
      console.info(err)
      fs.rmSync(overridePath, { force: true });
      return reject(err);
    });
  });
}