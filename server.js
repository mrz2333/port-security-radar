const path = require('node:path');
const fastify = require('fastify')({ logger: false });
const staticPlugin = require('@fastify/static');
const { scan } = require('./scanner');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 9188);
const API_PORT = Number(process.env.API_PORT || 9189);

// API Server (internal)
const apiServer = require('fastify')({ logger: false });
apiServer.get('/api/scan', async () => scan());
apiServer.get('/health', async () => ({ status: 'ok', host: HOST, port: PORT }));

// Static file server (public)
fastify.register(staticPlugin, {
  root: path.join(__dirname, 'dist'),
  prefix: '/',
});

// Fallback to index.html for SPA
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api')) {
    reply.code(404).send({ error: 'Not found' });
  } else {
    reply.sendFile('index.html');
  }
});

// Start servers
async function start() {
  try {
    await apiServer.listen({ host: '127.0.0.1', port: API_PORT });
    console.log(`API server listening on http://127.0.0.1:${API_PORT}`);
    
    await fastify.listen({ host: HOST, port: PORT });
    console.log(`Port Security Radar listening on http://${HOST}:${PORT}`);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

start();
