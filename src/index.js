import Fastify from 'fastify';
import { run } from './lib/runner.js'
import { execSync } from 'child_process';
import fs from 'fs';
import { getState, initState, resetState, setInputs, setVariables } from './lib/state.js';
import fastifyStatic from '@fastify/static';
import websocket from '@fastify/websocket';
import * as dotenv from 'dotenv';
import path from 'path';
import { resolve } from 'path';
import cors from '@fastify/cors'

import { fileURLToPath } from 'url';
import { rm } from 'fs/promises';
import { logClients } from './lib/ws.js';
import { setGithubToken } from './lib/github.js';
import { checkCollisions } from './lib/collisions.js';
import archiver from 'archiver';
import { deleteDropletById } from './lib/digitalocean.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const certPath = '/etc/tofuhub/certs/cert.pem';
const keyPath = '/etc/tofuhub/certs/key.pem';

// const useSSL = fs.existsSync(certPath) && fs.existsSync(keyPath);

const fastify = Fastify({
  logger: true,
  // ...(useSSL && {
  //   https: {
  //     key: fs.readFileSync(keyPath),
  //     cert: fs.readFileSync(certPath)
  //   }
  // })
});

// Serve Vue app + assets
fastify.register(fastifyStatic, {
  root: resolve('public'),
  prefix: '/',
});

// Serve user-generated files
fastify.register(fastifyStatic, {
  root: path.join(resolve('public'), 'outputs'),
  prefix: '/public/',
  decorateReply: false, // ✅ prevent duplicate decorator
});

fastify.get('/api/download/:packageName.zip', async (req, reply) => {
  const { packageName } = req.params;

  const outputsRoot = path.join(resolve('public'), 'outputs');
  if (!fs.existsSync(outputsRoot)) {
    return reply.code(404).send({ error: 'No outputs folder' });
  }

  reply
    .type('application/zip')
    .header('Content-Disposition', `attachment; filename="tofuhub-bundle.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });

  // 1️⃣  Pipe archive into the HTTP response first
  archive.pipe(reply.raw);

  // 2️⃣  Add every package sub-folder
  fs.readdirSync(outputsRoot, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .forEach(d => {
      archive.directory(path.join(outputsRoot, d.name), d.name); // keep folder name
    });

  // 3️⃣  Finalise the archive (starts streaming)
  await archive.finalize();          // ⬅ keep handler alive until done
});

fastify.get('/api/files/:packageName', async (req, reply) => {
  const { packageName } = req.params;
  const baseDir = path.join(__dirname, '..', 'public', 'outputs', packageName);

  if (!fs.existsSync(baseDir)) {
    return reply.code(404).send({ error: 'Package not found' });
  }

  const files = fs.readdirSync(baseDir).filter(f => fs.statSync(path.join(baseDir, f)).isFile());
  return { files };
});


fastify.register(cors)
fastify.register(websocket);
fastify.register(async function (app) {
  app.get('/logs', { websocket: true }, (conn, req) => {
    logClients.push(conn)
  });
});

// POST /state/var
fastify.post('/deploy', async (request, reply) => {
  console.info(request.body)
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

// POST /collisions/check checks for collisions
fastify.post('/collisions/check', async (request) => {
  return checkCollisions(request.body);
});

fastify.post('/destroy/by-id', async (request, reply) => {
  const { droplet_id, token, deployer } = request.body;

  if (!droplet_id || !token) {
    return reply.code(400).send({ error: 'Missing droplet_id or token' });
  }

  try {
    const result = await deleteDropletById(droplet_id, token);
    return { ...result, deployer };
  } catch (err) {
    request.log.error(err);
    return reply.code(500).send({ error: err.message });
  }
});

fastify.setNotFoundHandler((req, reply) => {
  const indexPath = path.join(__dirname, '..', 'public', 'index.html');

  // If it's a request for a frontend route (not an API or file)
  if (
    req.raw.method === 'GET' &&
    !req.raw.url.includes('.') &&           // skip file requests like .js, .css
    !req.raw.url.startsWith('/api') &&      // skip API routes
    !req.raw.url.startsWith('/outputs')     // skip file output routes
  ) {
    return reply.type('text/html').send(fs.readFileSync(indexPath));
  }

  // For all else (bad API/static request), send a normal 404
  reply.code(404).send({ error: 'Not found' });
});


async function start() {
  try {
    const address = await fastify.listen({ port: 80, host: '0.0.0.0' });

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
      execSync('docker compose version', { stdio: 'inherit' });
      break;
    } catch {
      if (Date.now() - startd > timeout) throw new Error('Docker did not become ready in time.');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500); // Sleep 500ms
    }
  }

  start();
}

waitForDockerReady();