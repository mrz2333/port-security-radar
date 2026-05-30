const path = require('node:path');
const fastify = require('fastify')({ logger: false });
const staticPlugin = require('@fastify/static');
const { scan, generateFirewallRules } = require('./scanner');
const { saveScan, detectChanges, saveChanges, getHistory, getChanges, getStats, getLatestScan } = require('./history');
const { alertIfNeeded } = require('./alerts');

const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 9188);
const API_KEY = process.env.API_KEY;

// Authentication middleware
async function authenticate(request, reply) {
  if (!API_KEY) return; // No auth if API_KEY not set
  
  const authHeader = request.headers.authorization;
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    reply.code(401).send({ error: 'Unauthorized' });
  }
}

// CORS headers
fastify.addHook('onSend', async (request, reply) => {
  reply.header('Access-Control-Allow-Origin', '*');
  reply.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  reply.header('Access-Control-Allow-Headers', 'Authorization, Content-Type');
});

// API routes
fastify.get('/api/scan', { preHandler: authenticate }, async (request) => {
  const result = await scan();
  
  // Save to history and detect changes
  try {
    const scanId = saveScan(result);
    const history = getHistory(2);
    if (history.length >= 2) {
      const previous = JSON.parse(history[1].raw_data);
      const changes = detectChanges(result.ports, previous.ports);
      if (changes.length > 0) {
        saveChanges(scanId, changes);
        // Alert on critical changes
        const criticalChanges = changes.filter(c => 
          c.severity === 'critical' || c.severity === 'high'
        );
        if (criticalChanges.length > 0) {
          alertIfNeeded(criticalChanges).catch(console.error);
        }
      }
    }
  } catch (e) {
    console.error('History save error:', e);
  }
  
  return result;
});

fastify.get('/api/history', { preHandler: authenticate }, async (request) => {
  const limit = Number(request.query.limit) || 100;
  return getHistory(limit);
});

fastify.get('/api/changes', { preHandler: authenticate }, async (request) => {
  const limit = Number(request.query.limit) || 50;
  return getChanges(limit);
});

fastify.get('/api/stats', { preHandler: authenticate }, async (request) => {
  const days = Number(request.query.days) || 7;
  return getStats(days);
});

fastify.get('/api/firewall', { preHandler: authenticate }, async () => {
  const result = await scan();
  return { rules: generateFirewallRules(result.ports) };
});

fastify.get('/api/export/csv', { preHandler: authenticate }, async (request, reply) => {
  const result = await scan();
  const headers = ['Port', 'Protocol', 'Address', 'Severity', 'Process', 'PID', 'BindType', 'Docker', 'Advice'];
  const rows = result.ports.map(p => [
    p.port,
    p.netid,
    p.address,
    p.severity,
    p.process || '',
    p.pid || '',
    p.bindType,
    p.docker ? `${p.docker.name} (${p.docker.image})` : '',
    `"${p.advice.replace(/"/g, '""')}"`
  ]);
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  reply.header('Content-Type', 'text/csv');
  reply.header('Content-Disposition', `attachment; filename="port-scan-${new Date().toISOString().slice(0, 10)}.csv"`);
  return csv;
});

fastify.get('/health', async () => ({ 
  status: 'ok', 
  host: HOST, 
  port: PORT,
  auth: !!API_KEY,
  features: ['history', 'alerts', 'docker', 'firewall']
}));

// Static file serving
fastify.register(staticPlugin, {
  root: path.join(__dirname, 'dist'),
  prefix: '/',
});

// SPA fallback
fastify.setNotFoundHandler((request, reply) => {
  if (request.url.startsWith('/api')) {
    reply.code(404).send({ error: 'Not found' });
  } else {
    reply.sendFile('index.html');
  }
});

// Start server
fastify.listen({ host: HOST, port: PORT }).then(() => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║           🛡️  Port Security Radar v3.0                   ║
╠═══════════════════════════════════════════════════════════╣
║  Server:  http://${HOST}:${PORT}                           ║
║  Auth:    ${API_KEY ? '✅ Enabled' : '❌ Disabled (set API_KEY to enable)'}                      ║
║  Features: History, Alerts, Docker, Firewall             ║
╚═══════════════════════════════════════════════════════════╝
  `);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
