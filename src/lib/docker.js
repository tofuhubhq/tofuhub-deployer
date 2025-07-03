import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn } from "child_process";
import { sendToClients } from './ws.js';

export function runDockerComposeService({
  repoDir,
  serviceName = 'tofuhub-worker',
  env = {},                       // key-value map
  command = null,                 // command override (e.g. 'node src/index.js')
  extraVolumes = [],              // [ [local, container], ... ]
  extraPorts = ["6080:6080"]                 // [ "6080:6080", "3000:3000", ... ]
}) {

  const resolvedRepoDir = path.resolve(repoDir);
  const overridePath = path.join(os.tmpdir(), 'tofuhub.override.yml');

  // === Generate override file for volumes ===
  const volumeMappings = [
    [os.homedir() + '/.ssh', '/root/.ssh:ro'],
    [resolvedRepoDir, '/repo'],
    ['/var/run/docker.sock', '/var/run/docker.sock'],
    ...extraVolumes
  ];

  const overrideYml = `
version: '3.9'
services:
  ${serviceName}:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
${volumeMappings.map(([local, container]) => `      - "${path.resolve(local)}:${container}"`).join('\n')}
`;

  fs.writeFileSync(overridePath, overrideYml);

  // === Build docker compose run command ===
  const composeArgs = [
    'compose',
    '-f', 'docker-compose.yml',
    '-f', overridePath,
    '--network', 'host', //TODO: figure out why it does not work without this in the deployer
    'run',
    '--rm',
    ...Object.keys(env).flatMap(key => ['-e', key]),
    ...extraPorts.flatMap(port => ['-p', port]),
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
    sendToClients(data.toString());
  });

  container.stderr.on('data', (data) => {
    sendToClients(data.toString());
  });

  container.on('close', (code) => {
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
      fs.rmSync(overridePath, { force: true });
      return reject(err);
    });
  });
}