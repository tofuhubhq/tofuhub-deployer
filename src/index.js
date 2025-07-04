import Fastify from 'fastify';
import { run } from './lib/runner.js'
import { execSync } from 'child_process';
import fs from 'fs';
import { getState, initState, resetState, setInputs, setVariables } from './lib/state.js';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import * as dotenv from 'dotenv';

dotenv.config();

const certPath = '/etc/tofuhub/certs/cert.pem';
const keyPath = '/etc/tofuhub/certs/key.pem';

const useSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

const fastify = Fastify({
  logger: true,
  ...(useSSL && {
    https: {
      key: fs.readFileSync(keyPath),
      cert: fs.readFileSync(certPath)
    }
  })
});
import { resolve } from 'path';

import { rm } from 'fs/promises';
import { logClients } from './lib/ws.js';
import { setGithubToken } from './lib/github.js';

// Serve static files from the "public" folder
fastify.register(fastifyStatic, {
  root: resolve('public'),
  prefix: '/', // optional: serve at root
});

fastify.register(websocket);
fastify.register(async function (app) {
  app.get('/logs', { websocket: true }, (conn, req) => {
    logClients.push(conn)
  });
});

// POST /state/var
fastify.post('/deploy', async (request, reply) => {
  setInputs(request.body);
  run();
  return getState()
});

// GET /health
fastify.get('/health', async () => {
  return {};
});

// GET /state (optional debug endpoint)
fastify.get('/state', async () => {
  return getState();
});

// POST /state/init initialises the state
fastify.post('/state/init', async (request) => {
  let packageNames = request.body;
  return initState(packageNames)
});

// POST /state/reset resets the state
fastify.post('/state/reset', async () => {
  return resetState();
});

// POST /state/reset resets the state
fastify.post('/auth/github', async (request) => {
  let { github_token } = request.body;
  const res = setGithubToken(github_token);
  return {
    "github_token": res
  }
});

async function start() {
  try {
    const address = await fastify.listen({ port: 443, host: '0.0.0.0' });

    // Clean up current tofuhub folder on start
    try {
      const pathToCleanUp = resolve('tofuhub')
      await rm(pathToCleanUp, { recursive: true, force: true });
    } catch (err) {
      console.error(`❌ Failed to remove folder ${pathToCleanUp}:`, err);
    }
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

function waitForDockerReady(timeout = 15000) {
  const startd = Date.now();
  while (true) {
    try {
      execSync('docker info', { stdio: 'ignore' });
      break;
    } catch {
      if (Date.now() - startd > timeout) throw new Error('Docker did not become ready in time.');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); // Sleep 500ms
    }
  }

  start();
}

waitForDockerReady();