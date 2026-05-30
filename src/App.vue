<template>
  <div class="app">
    <!-- Animated background -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>
    
    <!-- Header -->
    <header class="header">
      <div class="logo-section">
        <div class="radar-icon">
          <div class="radar-sweep"></div>
          <div class="radar-dot"></div>
        </div>
        <div>
          <h1 class="title">PORT SECURITY RADAR</h1>
          <p class="subtitle">端口暴露风险扫描面板</p>
        </div>
      </div>
      <div class="header-actions">
        <div class="scan-time" v-if="scanData">
          <span class="pulse"></span>
          {{ formatTime(scanData.scannedAt) }}
        </div>
        <button class="btn-scan" @click="performScan" :class="{ scanning: loading }">
          <span class="btn-icon">⟲</span>
          {{ loading ? '扫描中...' : '重新扫描' }}
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main" v-if="scanData">
      <!-- Stats Row -->
      <section class="stats-row">
        <div class="stat-card risk-score">
          <div class="stat-icon">🎯</div>
          <div class="stat-value">{{ riskScore }}</div>
          <div class="stat-label">风险指数</div>
          <div class="stat-bar">
            <div class="stat-bar-fill" :style="{ width: riskScore + '%' }"></div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📡</div>
          <div class="stat-value">{{ scanData.summary.total }}</div>
          <div class="stat-label">监听端口</div>
        </div>
        <div class="stat-card critical">
          <div class="stat-icon">🔴</div>
          <div class="stat-value">{{ scanData.summary.critical }}</div>
          <div class="stat-label">高危敏感</div>
        </div>
        <div class="stat-card high">
          <div class="stat-icon">🟠</div>
          <div class="stat-value">{{ scanData.summary.high }}</div>
          <div class="stat-label">高风险</div>
        </div>
        <div class="stat-card medium">
          <div class="stat-icon">🟡</div>
          <div class="stat-value">{{ scanData.summary.medium }}</div>
          <div class="stat-label">中风险</div>
        </div>
        <div class="stat-card low">
          <div class="stat-icon">🟢</div>
          <div class="stat-value">{{ scanData.summary.low }}</div>
          <div class="stat-label">低风险</div>
        </div>
      </section>

      <!-- Charts Section -->
      <section class="charts-section">
        <div class="chart-card">
          <h3 class="chart-title">风险分布</h3>
          <RiskChart :data="scanData.summary" />
        </div>
        <div class="chart-card">
          <h3 class="chart-title">协议分布</h3>
          <ProtocolChart :data="scanData.summary.protocols" />
        </div>
        <div class="chart-card">
          <h3 class="chart-title">绑定类型</h3>
          <BindChart :data="scanData.summary.bindTypes" />
        </div>
      </section>

      <!-- Search & Filters -->
      <section class="filters-section">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            placeholder="搜索端口、进程、地址..."
            class="search-input"
          >
        </div>
        <div class="filter-chips">
          <button 
            v-for="f in filters" 
            :key="f.value"
            class="chip"
            :class="{ active: activeFilter === f.value }"
            @click="activeFilter = f.value"
          >
            {{ f.label }}
          </button>
        </div>
      </section>

      <!-- Ports Table -->
      <section class="ports-section">
        <div class="table-container">
          <table class="ports-table">
            <thead>
              <tr>
                <th>风险等级</th>
                <th>协议</th>
                <th>监听地址</th>
                <th>端口</th>
                <th>进程</th>
                <th>PID</th>
                <th>绑定类型</th>
                <th>安全建议</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="port in filteredPorts" 
                :key="port.port + port.address"
                :class="'severity-' + port.severity"
              >
                <td>
                  <span class="severity-badge" :class="port.severity">
                    {{ severityText(port.severity) }}
                  </span>
                </td>
                <td>
                  <span class="protocol-badge">{{ port.netid }}</span>
                </td>
                <td class="mono">{{ port.address }}</td>
                <td class="mono port-num">{{ port.port }}</td>
                <td class="mono">{{ port.process || '-' }}</td>
                <td class="mono">{{ port.pid || '-' }}</td>
                <td>
                  <span class="bind-badge">{{ port.bindType }}</span>
                </td>
                <td class="advice-cell">{{ port.advice }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="mobile-cards">
          <div 
            v-for="port in filteredPorts" 
            :key="port.port + port.address + '-mobile'"
            class="port-card"
            :class="'severity-' + port.severity"
          >
            <div class="port-card-header">
              <div class="port-info">
                <span class="port-number">:{{ port.port }}</span>
                <span class="protocol-badge">{{ port.netid }}</span>
              </div>
              <span class="severity-badge" :class="port.severity">
                {{ severityText(port.severity) }}
              </span>
            </div>
            <div class="port-card-body">
              <div class="port-detail">
                <span class="detail-label">地址</span>
                <span class="detail-value mono">{{ port.address }}</span>
              </div>
              <div class="port-detail">
                <span class="detail-label">进程</span>
                <span class="detail-value mono">{{ port.process || '-' }}</span>
              </div>
              <div class="port-detail">
                <span class="detail-label">类型</span>
                <span class="detail-value">{{ port.bindType }}</span>
              </div>
            </div>
            <div class="port-card-advice">
              {{ port.advice }}
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Loading State -->
    <div v-else-if="loading" class="loading-state">
      <div class="scanner-animation">
        <div class="scanner-ring"></div>
        <div class="scanner-ring"></div>
        <div class="scanner-ring"></div>
        <div class="scanner-dot"></div>
      </div>
      <p class="loading-text">正在扫描端口...</p>
    </div>

    <!-- Footer -->
    <footer class="footer">
      <p>🛡️ Port Security Radar v2.0 · Built with Vue 3</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useIntervalFn } from '@vueuse/core'
import RiskChart from './components/RiskChart.vue'
import ProtocolChart from './components/ProtocolChart.vue'
import BindChart from './components/BindChart.vue'

const scanData = ref(null)
const loading = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')

const filters = [
  { label: '全部', value: 'all' },
  { label: '风险端口', value: 'risky' },
  { label: '高危敏感', value: 'critical' },
  { label: '公网绑定', value: 'public-bind' },
  { label: '本机回环', value: 'loopback' }
]

const riskScore = computed(() => {
  if (!scanData.value) return 0
  const s = scanData.value.summary
  const raw = (s.critical || 0) * 18 + (s.high || 0) * 8 + (s.medium || 0) * 3
  return Math.min(100, raw)
})

const filteredPorts = computed(() => {
  if (!scanData.value) return []
  let ports = scanData.value.ports
  
  // Search filter
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    ports = ports.filter(p => 
      JSON.stringify(p).toLowerCase().includes(q)
    )
  }
  
  // Category filter
  if (activeFilter.value === 'risky') {
    ports = ports.filter(p => ['critical', 'high', 'medium'].includes(p.severity))
  } else if (activeFilter.value === 'critical') {
    ports = ports.filter(p => p.severity === 'critical')
  } else if (activeFilter.value === 'public-bind') {
    ports = ports.filter(p => p.bindType === 'public-bind')
  } else if (activeFilter.value === 'loopback') {
    ports = ports.filter(p => p.bindType === 'loopback')
  }
  
  return ports
})

function severityText(s) {
  const map = { critical: '高危', high: '高', medium: '中', low: '低' }
  return map[s] || s
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('zh-CN')
}

async function performScan() {
  loading.value = true
  try {
    const res = await fetch('/api/scan?ts=' + Date.now())
    scanData.value = await res.json()
  } catch (e) {
    console.error('Scan failed:', e)
  } finally {
    loading.value = false
  }
}

// Auto-refresh every 60 seconds
useIntervalFn(performScan, 60000)

onMounted(() => {
  performScan()
})
</script>

<style>
/* CSS Variables */
:root {
  --bg-primary: #0a0e1a;
  --bg-secondary: #111827;
  --bg-card: rgba(17, 24, 39, 0.8);
  --border: rgba(56, 189, 248, 0.2);
  --text-primary: #e2e8f0;
  --text-secondary: #94a3b8;
  --accent-cyan: #22d3ee;
  --accent-blue: #3b82f6;
  --accent-purple: #a855f7;
  --critical: #ef4444;
  --high: #f97316;
  --medium: #eab308;
  --low: #22c55e;
  --font-mono: 'JetBrains Mono', monospace;
  --font-display: 'Orbitron', sans-serif;
}

/* Reset & Base */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: var(--font-mono);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  overflow-x: hidden;
}

.app {
  position: relative;
  min-height: 100vh;
}

/* Animated Background */
.bg-grid {
  position: fixed;
  inset: 0;
  background-image: 
    linear-gradient(rgba(56, 189, 248, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(56, 189, 248, 0.03) 1px, transparent 1px);
  background-size: 60px 60px;
  z-index: -2;
}

.bg-glow {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.15), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1), transparent 40%);
  z-index: -1;
  animation: pulseGlow 8s ease-in-out infinite;
}

@keyframes pulseGlow {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

/* Header */
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 32px;
  border-bottom: 1px solid var(--border);
  backdrop-filter: blur(20px);
  background: rgba(10, 14, 26, 0.8);
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo-section {
  display: flex;
  align-items: center;
  gap: 16px;
}

.radar-icon {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 2px solid var(--accent-cyan);
  position: relative;
  animation: radarSpin 3s linear infinite;
}

.radar-sweep {
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0%, var(--accent-cyan) 100%);
  opacity: 0.3;
}

.radar-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 8px;
  height: 8px;
  background: var(--accent-cyan);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 10px var(--accent-cyan);
}

@keyframes radarSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.title {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  background: linear-gradient(135deg, var(--accent-cyan), var(--accent-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  letter-spacing: 2px;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 2px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.scan-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.pulse {
  width: 8px;
  height: 8px;
  background: var(--low);
  border-radius: 50%;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}

.btn-scan {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2));
  border: 1px solid var(--accent-cyan);
  border-radius: 8px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-scan:hover {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.3), rgba(59, 130, 246, 0.3));
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.3);
}

.btn-scan.scanning {
  opacity: 0.7;
  cursor: not-allowed;
}

.btn-icon {
  font-size: 18px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Main Content */
.main {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 32px;
}

/* Stats Row */
.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-4px);
  border-color: var(--accent-cyan);
  box-shadow: 0 8px 30px rgba(34, 211, 238, 0.2);
}

.stat-card.risk-score {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.1), rgba(168, 85, 247, 0.1));
}

.stat-card.critical { border-color: rgba(239, 68, 68, 0.5); }
.stat-card.high { border-color: rgba(249, 115, 22, 0.5); }
.stat-card.medium { border-color: rgba(234, 179, 8, 0.5); }
.stat-card.low { border-color: rgba(34, 197, 94, 0.5); }

.stat-icon {
  font-size: 24px;
  margin-bottom: 8px;
}

.stat-value {
  font-family: var(--font-display);
  font-size: 36px;
  font-weight: 900;
  color: var(--text-primary);
}

.stat-label {
  color: var(--text-secondary);
  font-size: 12px;
  margin-top: 4px;
}

.stat-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  margin-top: 12px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--low), var(--medium), var(--high), var(--critical));
  border-radius: 2px;
  transition: width 1s ease;
}

/* Charts Section */
.charts-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.chart-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-weight: 600;
}

/* Filters Section */
.filters-section {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.search-box {
  flex: 1;
  min-width: 250px;
  position: relative;
}

.search-icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
}

.search-input {
  width: 100%;
  padding: 12px 16px 12px 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 14px;
  outline: none;
  transition: all 0.3s ease;
}

.search-input:focus {
  border-color: var(--accent-cyan);
  box-shadow: 0 0 0 3px rgba(34, 211, 238, 0.1);
}

.search-input::placeholder {
  color: var(--text-secondary);
}

.filter-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.chip {
  padding: 8px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 20px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.chip:hover {
  border-color: var(--accent-cyan);
  color: var(--text-primary);
}

.chip.active {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(59, 130, 246, 0.2));
  border-color: var(--accent-cyan);
  color: var(--accent-cyan);
}

/* Ports Table */
.ports-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.table-container {
  overflow-x: auto;
}

.ports-table {
  width: 100%;
  border-collapse: collapse;
}

.ports-table th {
  padding: 12px 16px;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
}

.ports-table td {
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.ports-table tr:hover {
  background: rgba(34, 211, 238, 0.05);
}

.ports-table tr.severity-critical { border-left: 3px solid var(--critical); }
.ports-table tr.severity-high { border-left: 3px solid var(--high); }
.ports-table tr.severity-medium { border-left: 3px solid var(--medium); }
.ports-table tr.severity-low { border-left: 3px solid var(--low); }

.mono {
  font-family: var(--font-mono);
  color: var(--accent-cyan);
}

.port-num {
  font-weight: 700;
  font-size: 14px;
}

.severity-badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 700;
}

.severity-badge.critical {
  background: rgba(239, 68, 68, 0.2);
  color: var(--critical);
  border: 1px solid rgba(239, 68, 68, 0.3);
}

.severity-badge.high {
  background: rgba(249, 115, 22, 0.2);
  color: var(--high);
  border: 1px solid rgba(249, 115, 22, 0.3);
}

.severity-badge.medium {
  background: rgba(234, 179, 8, 0.2);
  color: var(--medium);
  border: 1px solid rgba(234, 179, 8, 0.3);
}

.severity-badge.low {
  background: rgba(34, 197, 94, 0.2);
  color: var(--low);
  border: 1px solid rgba(34, 197, 94, 0.3);
}

.protocol-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(168, 85, 247, 0.2);
  color: var(--accent-purple);
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
}

.bind-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(59, 130, 246, 0.2);
  color: var(--accent-blue);
  border-radius: 4px;
  font-size: 11px;
}

.advice-cell {
  max-width: 300px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

/* Mobile Cards */
.mobile-cards {
  display: none;
}

.port-card {
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.port-card.severity-critical { border-left: 4px solid var(--critical); }
.port-card.severity-high { border-left: 4px solid var(--high); }
.port-card.severity-medium { border-left: 4px solid var(--medium); }
.port-card.severity-low { border-left: 4px solid var(--low); }

.port-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.port-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.port-number {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 900;
  color: var(--accent-cyan);
}

.port-card-body {
  display: grid;
  gap: 8px;
  margin-bottom: 12px;
}

.port-detail {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.detail-label {
  color: var(--text-secondary);
}

.detail-value {
  color: var(--text-primary);
}

.port-card-advice {
  padding: 10px;
  background: rgba(34, 211, 238, 0.05);
  border-radius: 8px;
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* Loading State */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.scanner-animation {
  position: relative;
  width: 120px;
  height: 120px;
}

.scanner-ring {
  position: absolute;
  inset: 0;
  border: 2px solid var(--accent-cyan);
  border-radius: 50%;
  animation: radarExpand 2s ease-out infinite;
}

.scanner-ring:nth-child(2) { animation-delay: 0.5s; }
.scanner-ring:nth-child(3) { animation-delay: 1s; }

@keyframes radarExpand {
  0% { transform: scale(0.3); opacity: 1; }
  100% { transform: scale(1.5); opacity: 0; }
}

.scanner-dot {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 12px;
  height: 12px;
  background: var(--accent-cyan);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  box-shadow: 0 0 20px var(--accent-cyan);
}

.loading-text {
  margin-top: 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

/* Footer */
.footer {
  text-align: center;
  padding: 24px;
  color: var(--text-secondary);
  font-size: 12px;
  border-top: 1px solid var(--border);
  margin-top: 40px;
}

/* Responsive */
@media (max-width: 1024px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
  }
  
  .charts-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .header {
    flex-direction: column;
    gap: 16px;
    padding: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .main {
    padding: 16px;
  }
  
  .stats-row {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .stat-card.risk-score {
    grid-column: span 2;
  }
  
  .table-container {
    display: none;
  }
  
  .mobile-cards {
    display: block;
  }
  
  .filters-section {
    flex-direction: column;
  }
  
  .search-box {
    width: 100%;
  }
  
  .filter-chips {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 8px;
  }
}
</style>
