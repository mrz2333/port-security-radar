const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const execFileAsync = promisify(execFile);

const PUBLIC_OK_PORTS = new Set(['22', '80', '443']);
const SENSITIVE_PORTS = new Set(['2375', '2376', '3306', '5432', '6379', '27017', '9200', '9300', '11211', '15672', '5672', '8080', '8443', '9000', '9443']);

// Scan cache
let lastScan = null;
let lastScanTime = 0;
const CACHE_TTL = 10000; // 10 seconds

function normalizeAddress(address) {
  return (address || '').replace(/^\[|\]$/g, '').replace(/%.*$/, '');
}

function classifyAddress(address) {
  const clean = normalizeAddress(address);
  if (!clean) return 'unknown';
  if (clean === '127.0.0.1' || clean === '::1' || clean === 'localhost' || clean === '127.0.0.53') return 'loopback';
  if (clean === '0.0.0.0' || clean === '::' || clean === '*') return 'public-bind';
  if (clean.startsWith('10.') || clean.startsWith('192.168.')) return 'private-lan';
  const m = clean.match(/^172\.(\d+)\./);
  if (m && Number(m[1]) >= 16 && Number(m[1]) <= 31) return 'private-lan';
  if (clean.startsWith('fe80:') || clean.startsWith('fc') || clean.startsWith('fd')) return 'private-lan';
  return 'specific';
}

function parseProcess(proc) {
  if (!proc) return { process: '', pid: '', cmdline: '' };
  const m = proc.match(/users:\(\("([^"]+)",pid=(\d+)/);
  if (m) return { process: m[1], pid: m[2], cmdline: '' };
  return { process: proc, pid: '', cmdline: '' };
}

async function getProcessCmdline(pid) {
  if (!pid) return '';
  try {
    const { stdout } = await execFileAsync('cat', [`/proc/${pid}/cmdline`], { timeout: 1000 });
    return stdout.replace(/\0/g, ' ').trim();
  } catch {
    return '';
  }
}

function parseSsLine(line) {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 5 || parts[0] === 'State' || parts[0] === 'Netid') return null;
  const netid = parts[0];
  const state = parts[1];
  const local = parts[4];
  const proc = parts.slice(6).join(' ');
  let address = local;
  let port = '';

  if (local.startsWith('[')) {
    const m = local.match(/^\[([^\]]+)\]:(\d+)$/);
    if (m) { address = m[1]; port = m[2]; }
  } else {
    const idx = local.lastIndexOf(':');
    if (idx >= 0) { address = local.slice(0, idx); port = local.slice(idx + 1); }
  }

  const bindType = classifyAddress(address);
  const p = parseProcess(proc);
  const isTcpListen = netid === 'tcp' && state === 'LISTEN';
  const isUdp = netid === 'udp';
  let severity = 'low';
  let tag = '本机安全';
  let advice = '仅本机或明确地址监听，风险较低。';

  if (bindType === 'public-bind') {
    if (PUBLIC_OK_PORTS.has(port)) {
      severity = 'medium';
      tag = '公网入口';
      advice = '常见公网入口端口。请确认安全组、防火墙、SSH 密钥/登录策略和反代配置。';
    } else if (SENSITIVE_PORTS.has(port)) {
      severity = 'critical';
      tag = '敏感端口公网';
      advice = '高危敏感服务疑似公网监听。若只给反代/内网用，建议立即改为 127.0.0.1:' + port + ' 或限制来源 IP。';
    } else if (isUdp && port === '5353') {
      severity = 'medium';
      tag = 'UDP 广播';
      advice = 'mDNS/广播类 UDP 端口监听所有地址，建议确认是否必须；公网服务器通常不需要暴露。';
    } else {
      severity = 'high';
      tag = '公网绑定';
      advice = '监听在所有网卡。如服务只应由反代访问，建议改为 127.0.0.1:' + port + ' 绑定。Docker Compose 写法：127.0.0.1:' + port + ':容器端口。';
    }
  } else if (bindType === 'private-lan') {
    severity = 'medium';
    tag = '内网绑定';
    advice = '监听在内网地址，确认安全组/防火墙和访问来源；跨机器内网可访问时也要加认证。';
  } else if (!isTcpListen && isUdp) {
    tag = 'UDP 服务';
  }

  return { netid, state, address, port, bindType, severity, tag, advice, process: p.process, pid: p.pid, cmdline: p.cmdline, raw: line };
}

// Docker container detection
async function getDockerContainers() {
  try {
    const { stdout } = await execFileAsync('docker', ['ps', '--format', '{{.Names}}\t{{.Ports}}\t{{.Image}}'], { timeout: 5000 });
    const containers = {};
    stdout.split('\n').filter(Boolean).forEach(line => {
      const [name, ports, image] = line.split('\t');
      if (ports) {
        const portMatches = ports.match(/0\.0\.0\.0:(\d+)->/g) || [];
        portMatches.forEach(match => {
          const port = match.match(/:(\d+)->/)[1];
          containers[port] = { name, image };
        });
      }
    });
    return containers;
  } catch {
    return {};
  }
}

// Get established connections count per port
async function getEstablishedConnections() {
  try {
    const { stdout } = await execFileAsync('ss', ['-tunp', 'state', 'established'], { timeout: 5000, maxBuffer: 1024 * 1024 });
    const connections = {};
    stdout.split('\n').forEach(line => {
      const parts = line.trim().split(/\s+/);
      if (parts.length >= 5 && parts[0] === 'ESTAB') {
        const local = parts[4];
        const idx = local.lastIndexOf(':');
        if (idx >= 0) {
          const port = local.slice(idx + 1);
          connections[port] = (connections[port] || 0) + 1;
        }
      }
    });
    return connections;
  } catch {
    return {};
  }
}

// Get system info
async function getSystemInfo() {
  try {
    const [hostname, uptime, loadavg] = await Promise.all([
      execFileAsync('hostname', [], { timeout: 1000 }).then(r => r.stdout.trim()),
      execFileAsync('uptime', ['-p'], { timeout: 1000 }).then(r => r.stdout.trim()),
      execFileAsync('cat', ['/proc/loadavg'], { timeout: 1000 }).then(r => r.stdout.trim().split(' ').slice(0, 3).join(' '))
    ]);
    return { hostname, uptime, loadavg };
  } catch {
    return { hostname: 'unknown', uptime: 'unknown', loadavg: 'unknown' };
  }
}

async function scan() {
  const now = Date.now();
  
  // Return cached result if within TTL
  if (lastScan && (now - lastScanTime) < CACHE_TTL) {
    return { ...lastScan, cached: true };
  }

  // Get all data in parallel
  const [dockerContainers, { stdout }, connections, systemInfo] = await Promise.all([
    getDockerContainers(),
    execFileAsync('ss', ['-tulnp'], { timeout: 10000, maxBuffer: 1024 * 1024 * 2 }),
    getEstablishedConnections(),
    getSystemInfo()
  ]);

  const rows = stdout.split('\n').map(parseSsLine).filter(Boolean).filter(r => r.port);
  
  // Enrich with Docker info and connections
  const enrichedRows = await Promise.all(rows.map(async row => {
    if (dockerContainers[row.port]) {
      row.docker = dockerContainers[row.port];
      row.tag = `Docker: ${dockerContainers[row.port].name}`;
    }
    row.connections = connections[row.port] || 0;
    if (row.pid) {
      row.cmdline = await getProcessCmdline(row.pid);
    }
    return row;
  }));

  const rank = { critical: 0, high: 1, medium: 2, low: 3 };
  enrichedRows.sort((a, b) => (rank[a.severity] - rank[b.severity]) || Number(a.port) - Number(b.port) || a.address.localeCompare(b.address));
  
  const summary = enrichedRows.reduce((acc, r) => {
    acc.total++;
    acc[r.severity] = (acc[r.severity] || 0) + 1;
    acc.bindTypes[r.bindType] = (acc.bindTypes[r.bindType] || 0) + 1;
    acc.protocols[r.netid] = (acc.protocols[r.netid] || 0) + 1;
    acc.totalConnections += r.connections;
    if (r.docker) acc.dockerContainers = (acc.dockerContainers || 0) + 1;
    return acc;
  }, { total: 0, critical: 0, high: 0, medium: 0, low: 0, bindTypes: {}, protocols: {}, dockerContainers: 0, totalConnections: 0 });
  
  summary.exposed = summary.critical + summary.high + summary.medium;
  
  const result = { 
    scannedAt: new Date().toISOString(), 
    summary, 
    ports: enrichedRows,
    system: systemInfo
  };
  
  // Update cache
  lastScan = result;
  lastScanTime = now;
  
  return result;
}

// Generate firewall rules suggestion
function generateFirewallRules(ports) {
  const rules = ['# Port Security Radar - Firewall Rules', `# Generated: ${new Date().toISOString()}`, ''];
  
  const criticalPorts = ports.filter(p => p.severity === 'critical');
  const highPorts = ports.filter(p => p.severity === 'high');
  
  if (criticalPorts.length > 0) {
    rules.push('# === CRITICAL - Block immediately ===');
    criticalPorts.forEach(p => {
      rules.push(`# ${p.process || 'unknown'} on port ${p.port}`);
      rules.push(`iptables -A INPUT -p ${p.netid} --dport ${p.port} -j DROP`);
    });
    rules.push('');
  }
  
  if (highPorts.length > 0) {
    rules.push('# === HIGH - Restrict to localhost ===');
    highPorts.forEach(p => {
      rules.push(`# ${p.process || 'unknown'} on port ${p.port}`);
      rules.push(`iptables -A INPUT -p ${p.netid} --dport ${p.port} -s 127.0.0.1 -j ACCEPT`);
      rules.push(`iptables -A INPUT -p ${p.netid} --dport ${p.port} -j DROP`);
    });
    rules.push('');
  }
  
  rules.push('# === Allow established connections ===');
  rules.push('iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT');
  rules.push('');
  rules.push('# === Allow SSH (adjust as needed) ===');
  rules.push('iptables -A INPUT -p tcp --dport 22 -j ACCEPT');
  
  return rules.join('\n');
}

if (require.main === module) {
  scan().then(result => {
    if (process.argv.includes('--json')) {
      console.log(JSON.stringify(result, null, 2));
    } else if (process.argv.includes('--firewall')) {
      console.log(generateFirewallRules(result.ports));
    } else {
      console.table(result.ports.map(({port,address,severity,tag,process,pid,connections,docker,advice}) => ({
        port,address,severity,tag,process,pid,
        connections: connections || 0,
        docker: docker ? `${docker.name} (${docker.image})` : '-',
        advice
      })));
    }
  }).catch(err => { console.error(err.message || err); process.exit(1); });
}

module.exports = { scan, generateFirewallRules, getSystemInfo };
