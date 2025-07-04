import path from 'path';
import fs from 'fs';
import { spawn } from "child_process";
import { sendToClients } from './ws.js';

export function runDockerComposeBuild(serviceName, overridePath, resolvedRepoDir, env) {
  spawn('docker', [
    'compose',
    '-f', 'docker-compose.yml',
    'build',
    'test-service'
  ]);

  console.info(`did not crash`)
  return;
  const args = [
    'compose',
    '-f', 'docker-compose.yml',
    '-f', overridePath,
    'build',
    serviceName
  ]
  console.info(args)
  console.log('🚧 Checking environment before spawn:');
  console.log('cwd:', resolvedRepoDir);
  console.log('docker exists:', fs.existsSync('/usr/bin/docker'));
  console.log('PATH:', process.env.PATH);
  const build = spawn('docker', args, {
    cwd: resolvedRepoDir,
    env: { ...process.env, ...env }
  });

  build.stdout.on('data', (data) => {
    sendToClients(data.toString());
  });

  build.stderr.on('data', (data) => {
    sendToClients(data.toString());
  });

  build.on('close', (code) => {
    if (code === 0) {
      resolve();
    } else {
      reject(new Error(`docker compose build failed with code ${code}`));
    }
  });

  build.on('error', reject);
}

export function runDockerComposeService({
  resolvedRepoDir,
  serviceName = 'tofuhub-worker',
  env = {},                       // key-value map
  command = null,                 // command override (e.g. 'node src/index.js')
  extraPorts = ["6080:6080"],                 // [ "6080:6080", "3000:3000", ... ]
  overridePath
}) {

  // === Build docker compose run command ===
  const composeArgs = [
    'compose',
    '-f', 'docker-compose.yml',
    '-f', overridePath,
    'run',
    // '--rm',
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
    console.info(data)
    sendToClients(data.toString());
  });

  container.stderr.on('data', (data) => {
    console.info(data)
    sendToClients(data.toString());
  });

  container.on('close', (code) => {
    console.info(code)
    sendToClients(`[container exited with code ${code}]\n`);
  });

  return new Promise((resolve, reject) => {
    container.on('exit', (code) => {
      console.info(`exiting`, code)
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