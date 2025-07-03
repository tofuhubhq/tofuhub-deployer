import Fastify from 'fastify';
import { run } from './lib/runner.js'
import fs from 'fs';
import { getState, initState, resetState, setInputs, setVariables } from './lib/state.js';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
const fastify = Fastify({
  logger: true,
  https: {
    key: fs.readFileSync('/etc/tofuhub/certs/key.pem'),
    cert: fs.readFileSync('/etc/tofuhub/certs/cert.pem')
  }
});
import { resolve } from 'path';

import { rm } from 'fs/promises';
import { logClients } from './lib/ws.js';

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

start();


