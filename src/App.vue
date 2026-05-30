<template>
  <div class="app" :class="{ 'light-theme': isLightTheme }">
    <!-- Animated background -->
    <div class="bg-grid"></div>
    <div class="bg-glow"></div>
    
    <!-- Header -->
    <header class="header">
      <div class="logo-section">
        <div class="radar-icon" @click="playRadarAnimation">
          <div class="radar-sweep"></div>
          <div class="radar-dot"></div>
        </div>
        <div>
          <h1 class="title">PORT SECURITY RADAR</h1>
          <p class="subtitle">端口暴露风险扫描面板 v4.0</p>
        </div>
      </div>
      <div class="header-actions">
        <!-- System Info -->
        <div class="system-info" v-if="scanData?.system">
          <span class="sys-item" title="主机名">🖥️ {{ scanData.system.hostname }}</span>
          <span class="sys-item" title="运行时间">⏱️ {{ scanData.system.uptime }}</span>
          <span class="sys-item" title="负载">📊 {{ scanData.system.loadavg }}</span>
        </div>
        
        <div class="scan-time" v-if="scanData">
          <span class="pulse"></span>
          {{ formatTime(scanData.scannedAt) }}
          <span v-if="scanData.cached" class="cached-badge">缓存</span>
          <span v-if="scanData.summary.totalConnections" class="connections-badge">
            🔗 {{ scanData.summary.totalConnections }} 连接
          </span>
        </div>
        
        <div class="header-btns">
          <button class="btn-icon" @click="toggleTheme" :title="isLightTheme ? '切换深色' : '切换浅色'">
            {{ isLightTheme ? '🌙' : '☀️' }}
          </button>
          <button class="btn-icon" @click="showHistory = !showHistory" title="历史记录 (H)">
            📊
          </button>
          <button class="btn-icon" @click="exportCSV" title="导出 CSV (C)">📥</button>
          <button class="btn-icon" @click="exportJSON" title="导出 JSON (J)">📋</button>
          <button class="btn-icon" @click="generatePDF" title="生成 PDF 报告 (P)">📄</button>
          <button class="btn-scan" @click="performScan" :class="{ scanning: loading }" title="扫描 (Space)">
            <span class="btn-icon-sm">⟲</span>
            {{ loading ? '扫描中...' : '重新扫描' }}
          </button>
        </div>
      </div>
    </header>

    <!-- Keyboard Shortcuts Help -->
    <div class="shortcuts-hint" v-if="showShortcuts">
      <div class="shortcut-item"><kbd>Space</kbd> 重新扫描</div>
      <div class="shortcut-item"><kbd>H</kbd> 历史记录</div>
      <div class="shortcut-item"><kbd>T</kbd> 切换主题</div>
      <div class="shortcut-item"><kbd>C</kbd> 导出 CSV</div>
      <div class="shortcut-item"><kbd>J</kbd> 导出 JSON</div>
      <div class="shortcut-item"><kbd>P</kbd> 生成 PDF</div>
      <div class="shortcut-item"><kbd>?</kbd> 显示/隐藏快捷键</div>
      <div class="shortcut-item"><kbd>Esc</kbd> 关闭面板</div>
    </div>

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
        <div class="stat-card connections" v-if="scanData.summary.totalConnections">
          <div class="stat-icon">🔗</div>
          <div class="stat-value">{{ scanData.summary.totalConnections }}</div>
          <div class="stat-label">活跃连接</div>
        </div>
        <div class="stat-card docker" v-if="scanData.summary.dockerContainers">
          <div class="stat-icon">🐳</div>
          <div class="stat-value">{{ scanData.summary.dockerContainers }}</div>
          <div class="stat-label">Docker 容器</div>
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

      <!-- History Trend Chart -->
      <section class="trend-section" v-if="stats.length > 0">
        <div class="chart-card full-width">
          <h3 class="chart-title">📈 7天趋势</h3>
          <TrendChart :data="stats" />
        </div>
      </section>

      <!-- Firewall Rules -->
      <section class="firewall-section" v-if="firewallRules">
        <div class="section-header">
          <h3>🔥 防火墙规则建议</h3>
          <button class="btn-copy" @click="copyFirewallRules">复制规则</button>
        </div>
        <pre class="firewall-code">{{ firewallRules }}</pre>
      </section>

      <!-- Search & Filters -->
      <section class="filters-section">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            v-model="searchQuery" 
            placeholder="搜索端口、进程、地址... (按 / 聚焦)"
            class="search-input"
            ref="searchInput"
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
            <span v-if="f.count" class="chip-count">{{ f.count }}</span>
          </button>
        </div>
      </section>

      <!-- Ports Table -->
      <section class="ports-section">
        <div class="table-container">
          <table class="ports-table">
            <thead>
              <tr>
                <th @click="sortBy('severity')" class="sortable">风险 {{ sortIcon('severity') }}</th>
                <th @click="sortBy('netid')" class="sortable">协议 {{ sortIcon('netid') }}</th>
                <th @click="sortBy('address')" class="sortable">监听地址 {{ sortIcon('address') }}</th>
                <th @click="sortBy('port')" class="sortable">端口 {{ sortIcon('port') }}</th>
                <th @click="sortBy('process')" class="sortable">进程 {{ sortIcon('process') }}</th>
                <th>PID</th>
                <th>连接数</th>
                <th>绑定类型</th>
                <th>Docker</th>
                <th>安全建议</th>
              </tr>
            </thead>
            <tbody>
              <tr 
                v-for="port in sortedPorts" 
                :key="port.port + port.address"
                :class="'severity-' + port.severity"
                @click="showProcessDetail(port)"
                class="port-row"
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
                  <span class="connections-count" :class="{ 'has-connections': port.connections > 0 }">
                    {{ port.connections || 0 }}
                  </span>
                </td>
                <td>
                  <span class="bind-badge">{{ port.bindType }}</span>
                </td>
                <td>
                  <span v-if="port.docker" class="docker-badge" :title="port.docker.image">
                    🐳 {{ port.docker.name }}
                  </span>
                  <span v-else>-</span>
                </td>
                <td class="advice-cell">{{ port.advice }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Mobile Cards -->
        <div class="mobile-cards">
          <div 
            v-for="port in sortedPorts" 
            :key="port.port + port.address + '-mobile'"
            class="port-card"
            :class="'severity-' + port.severity"
            @click="showProcessDetail(port)"
          >
            <div class="port-card-header">
              <div class="port-info">
                <span class="port-number">:{{ port.port }}</span>
                <span class="protocol-badge">{{ port.netid }}</span>
                <span v-if="port.docker" class="docker-badge">🐳 {{ port.docker.name }}</span>
                <span v-if="port.connections" class="connections-badge-sm">🔗 {{ port.connections }}</span>
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

    <!-- Process Detail Modal -->
    <div class="modal-overlay" v-if="selectedPort" @click.self="selectedPort = null">
      <div class="modal-content">
        <div class="modal-header">
          <h3>📋 进程详情</h3>
          <button class="btn-close" @click="selectedPort = null">✕</button>
        </div>
        <div class="modal-body">
          <div class="detail-grid">
            <div class="detail-item">
              <span class="detail-label">端口</span>
              <span class="detail-value mono">:{{ selectedPort.port }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">协议</span>
              <span class="detail-value">{{ selectedPort.netid.toUpperCase() }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">地址</span>
              <span class="detail-value mono">{{ selectedPort.address }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">状态</span>
              <span class="detail-value">{{ selectedPort.state }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">进程名</span>
              <span class="detail-value mono">{{ selectedPort.process || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">PID</span>
              <span class="detail-value mono">{{ selectedPort.pid || '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">绑定类型</span>
              <span class="detail-value">{{ selectedPort.bindType }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">风险等级</span>
              <span class="severity-badge" :class="selectedPort.severity">
                {{ severityText(selectedPort.severity) }}
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">活跃连接</span>
              <span class="detail-value">{{ selectedPort.connections || 0 }}</span>
            </div>
            <div class="detail-item" v-if="selectedPort.docker">
              <span class="detail-label">Docker</span>
              <span class="detail-value">{{ selectedPort.docker.name }} ({{ selectedPort.docker.image }})</span>
            </div>
          </div>
          
          <div class="detail-section" v-if="selectedPort.cmdline">
            <h4>命令行</h4>
            <pre class="cmdline">{{ selectedPort.cmdline }}</pre>
          </div>
          
          <div class="detail-section">
            <h4>安全建议</h4>
            <p class="advice-text">{{ selectedPort.advice }}</p>
          </div>
          
          <div class="detail-section">
            <h4>原始数据</h4>
            <pre class="raw-data">{{ selectedPort.raw }}</pre>
          </div>
        </div>
      </div>
    </div>

    <!-- History Panel -->
    <aside class="history-panel" v-if="showHistory">
      <div class="history-header">
        <h3>📊 扫描历史</h3>
        <button class="btn-close" @click="showHistory = false">✕</button>
      </div>
      <div class="history-tabs">
        <button 
          :class="{ active: historyTab === 'scans' }" 
          @click="historyTab = 'scans'"
        >
          扫描记录
        </button>
        <button 
          :class="{ active: historyTab === 'changes' }" 
          @click="historyTab = 'changes'"
        >
          端口变化
        </button>
        <button 
          :class="{ active: historyTab === 'stats' }" 
          @click="historyTab = 'stats'"
        >
          统计趋势
        </button>
      </div>
      
      <div class="history-content">
        <!-- Scans History -->
        <div v-if="historyTab === 'scans'" class="history-list">
          <div v-for="scan in history" :key="scan.id" class="history-item">
            <div class="history-time">{{ formatTime(scan.scanned_at) }}</div>
            <div class="history-stats">
              <span class="critical">{{ scan.critical }}</span> /
              <span class="high">{{ scan.high }}</span> /
              <span class="medium">{{ scan.medium }}</span> /
              <span class="low">{{ scan.low }}</span>
            </div>
            <div class="history-total">共 {{ scan.total }} 个端口</div>
          </div>
        </div>
        
        <!-- Changes History -->
        <div v-if="historyTab === 'changes'" class="history-list">
          <div v-for="change in changes" :key="change.id" class="history-item change-item">
            <div class="change-type" :class="change.change_type">
              {{ change.change_type === 'added' ? '➕ 新增' : change.change_type === 'removed' ? '➖ 关闭' : '⚠️ 变化' }}
            </div>
            <div class="change-port">:{{ change.port }}</div>
            <div class="change-time">{{ formatTime(change.detected_at) }}</div>
          </div>
        </div>
        
        <!-- Stats Trend -->
        <div v-if="historyTab === 'stats'" class="stats-trend">
          <div v-for="stat in stats" :key="stat.date" class="trend-item">
            <div class="trend-date">{{ stat.date }}</div>
            <div class="trend-bar">
              <div class="trend-fill critical" :style="{ width: (stat.avg_critical / stat.avg_total * 100) + '%' }"></div>
              <div class="trend-fill high" :style="{ width: (stat.avg_high / stat.avg_total * 100) + '%' }"></div>
            </div>
            <div class="trend-value">{{ stat.scan_count }} 次扫描</div>
          </div>
        </div>
      </div>
    </aside>

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
      <p>🛡️ Port Security Radar v4.0 · Built with Vue 3 + Fastify</p>
      <p class="footer-features">History · Alerts · Docker · Firewall · PDF Export · Themes · Keyboard Shortcuts</p>
      <p class="footer-shortcuts">按 <kbd>?</kbd> 查看快捷键</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useIntervalFn, useLocalStorage } from '@vueuse/core'
import RiskChart from './components/RiskChart.vue'
import ProtocolChart from './components/ProtocolChart.vue'
import BindChart from './components/BindChart.vue'
import TrendChart from './components/TrendChart.vue'

const scanData = ref(null)
const loading = ref(false)
const searchQuery = ref('')
const activeFilter = ref('all')
const showHistory = ref(false)
const historyTab = ref('scans')
const history = ref([])
const changes = ref([])
const stats = ref([])
const firewallRules = ref(null)
const selectedPort = ref(null)
const showShortcuts = ref(false)
const searchInput = ref(null)
const sortField = ref('severity')
const sortAsc = ref(true)

// Theme
const isLightTheme = useLocalStorage('psr-light-theme', false)

const filters = computed(() => {
  if (!scanData.value) return []
  return [
    { label: '全部', value: 'all', count: scanData.value.summary.total },
    { label: '风险端口', value: 'risky', count: scanData.value.summary.exposed },
    { label: '高危敏感', value: 'critical', count: scanData.value.summary.critical },
    { label: '公网绑定', value: 'public-bind', count: scanData.value.summary.bindTypes['public-bind'] || 0 },
    { label: '本机回环', value: 'loopback', count: scanData.value.summary.bindTypes['loopback'] || 0 },
    { label: 'Docker', value: 'docker', count: scanData.value.summary.dockerContainers || 0 },
    { label: '有连接', value: 'connected', count: scanData.value.ports.filter(p => p.connections > 0).length }
  ]
})

const riskScore = computed(() => {
  if (!scanData.value) return 0
  const s = scanData.value.summary
  const raw = (s.critical || 0) * 18 + (s.high || 0) * 8 + (s.medium || 0) * 3
  return Math.min(100, raw)
})

const filteredPorts = computed(() => {
  if (!scanData.value) return []
  let ports = scanData.value.ports
  
  if (searchQuery.value) {
    const q = searchQuery.value.toLowerCase()
    ports = ports.filter(p => 
      JSON.stringify(p).toLowerCase().includes(q)
    )
  }
  
  if (activeFilter.value === 'risky') {
    ports = ports.filter(p => ['critical', 'high', 'medium'].includes(p.severity))
  } else if (activeFilter.value === 'critical') {
    ports = ports.filter(p => p.severity === 'critical')
  } else if (activeFilter.value === 'public-bind') {
    ports = ports.filter(p => p.bindType === 'public-bind')
  } else if (activeFilter.value === 'loopback') {
    ports = ports.filter(p => p.bindType === 'loopback')
  } else if (activeFilter.value === 'docker') {
    ports = ports.filter(p => p.docker)
  } else if (activeFilter.value === 'connected') {
    ports = ports.filter(p => p.connections > 0)
  }
  
  return ports
})

const sortedPorts = computed(() => {
  const ports = [...filteredPorts.value]
  const rank = { critical: 0, high: 1, medium: 2, low: 3 }
  
  ports.sort((a, b) => {
    let valA, valB
    if (sortField.value === 'severity') {
      valA = rank[a.severity]
      valB = rank[b.severity]
    } else if (sortField.value === 'port') {
      valA = Number(a.port)
      valB = Number(b.port)
    } else {
      valA = a[sortField.value] || ''
      valB = b[sortField.value] || ''
    }
    
    if (valA < valB) return sortAsc.value ? -1 : 1
    if (valA > valB) return sortAsc.value ? 1 : -1
    return 0
  })
  
  return ports
})

function sortBy(field) {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortField.value = field
    sortAsc.value = true
  }
}

function sortIcon(field) {
  if (sortField.value !== field) return ''
  return sortAsc.value ? '↑' : '↓'
}

function severityText(s) {
  const map = { critical: '高危', high: '高', medium: '中', low: '低' }
  return map[s] || s
}

function formatTime(iso) {
  return new Date(iso).toLocaleString('zh-CN')
}

function toggleTheme() {
  isLightTheme.value = !isLightTheme.value
}

function playRadarAnimation() {
  // Trigger radar spin animation
  const icon = document.querySelector('.radar-icon')
  icon.style.animation = 'none'
  icon.offsetHeight // Trigger reflow
  icon.style.animation = 'radarSpin 1s linear'
}

function showProcessDetail(port) {
  selectedPort.value = port
}

async function performScan() {
  loading.value = true
  try {
    const res = await fetch('/api/scan?ts=' + Date.now())
    scanData.value = await res.json()
    
    // Fetch firewall rules
    const fwRes = await fetch('/api/firewall')
    const fwData = await fwRes.json()
    firewallRules.value = fwData.rules
    
    // Play sound for critical findings
    if (scanData.value.summary.critical > 0) {
      playAlertSound()
    }
  } catch (e) {
    console.error('Scan failed:', e)
  } finally {
    loading.value = false
  }
}

async function fetchHistory() {
  try {
    const [histRes, changesRes, statsRes] = await Promise.all([
      fetch('/api/history?limit=20'),
      fetch('/api/changes?limit=30'),
      fetch('/api/stats?days=7')
    ])
    history.value = await histRes.json()
    changes.value = await changesRes.json()
    stats.value = await statsRes.json()
  } catch (e) {
    console.error('Failed to fetch history:', e)
  }
}

async function exportCSV() {
  try {
    const res = await fetch('/api/export/csv')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `port-scan-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  } catch (e) {
    console.error('Export failed:', e)
  }
}

function exportJSON() {
  if (!scanData.value) return
  const blob = new Blob([JSON.stringify(scanData.value, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `port-scan-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

async function generatePDF() {
  // Simple HTML-to-PDF using print
  const printWindow = window.open('', '_blank')
  printWindow.document.write(`
    <html>
      <head>
        <title>Port Security Report</title>
        <style>
          body { font-family: monospace; padding: 20px; }
          h1 { color: #333; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f5f5f5; }
          .critical { color: red; font-weight: bold; }
          .high { color: orange; }
          .medium { color: #999; }
          .low { color: green; }
        </style>
      </head>
      <body>
        <h1>🛡️ Port Security Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <p>Host: ${scanData.value?.system?.hostname || 'Unknown'}</p>
        <h2>Risk Score: ${riskScore.value}/100</h2>
        <h3>Summary</h3>
        <ul>
          <li>Total Ports: ${scanData.value?.summary?.total}</li>
          <li>Critical: ${scanData.value?.summary?.critical}</li>
          <li>High: ${scanData.value?.summary?.high}</li>
          <li>Medium: ${scanData.value?.summary?.medium}</li>
          <li>Low: ${scanData.value?.summary?.low}</li>
        </ul>
        <h3>Port Details</h3>
        <table>
          <tr><th>Port</th><th>Protocol</th><th>Address</th><th>Severity</th><th>Process</th><th>Advice</th></tr>
          ${scanData.value?.ports?.map(p => `
            <tr>
              <td>${p.port}</td>
              <td>${p.netid}</td>
              <td>${p.address}</td>
              <td class="${p.severity}">${severityText(p.severity)}</td>
              <td>${p.process || '-'}</td>
              <td>${p.advice}</td>
            </tr>
          `).join('')}
        </table>
      </body>
    </html>
  `)
  printWindow.document.close()
  printWindow.print()
}

function copyFirewallRules() {
  if (firewallRules.value) {
    navigator.clipboard.writeText(firewallRules.value)
    alert('已复制到剪贴板！')
  }
}

function playAlertSound() {
  // Simple beep sound
  const audioContext = new (window.AudioContext || window.webkitAudioContext)()
  const oscillator = audioContext.createOscillator()
  const gainNode = audioContext.createGain()
  oscillator.connect(gainNode)
  gainNode.connect(audioContext.destination)
  oscillator.frequency.value = 800
  oscillator.type = 'sine'
  gainNode.gain.value = 0.3
  oscillator.start()
  setTimeout(() => oscillator.stop(), 200)
}

// Keyboard shortcuts
function handleKeyboard(e) {
  // Don't trigger if typing in input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') {
      e.target.blur()
    }
    return
  }
  
  switch (e.key) {
    case ' ':
      e.preventDefault()
      performScan()
      break
    case 'h':
    case 'H':
      showHistory.value = !showHistory.value
      break
    case 't':
    case 'T':
      toggleTheme()
      break
    case 'c':
    case 'C':
      exportCSV()
      break
    case 'j':
    case 'J':
      exportJSON()
      break
    case 'p':
    case 'P':
      generatePDF()
      break
    case '/':
      e.preventDefault()
      searchInput.value?.focus()
      break
    case '?':
      showShortcuts.value = !showShortcuts.value
      break
    case 'Escape':
      selectedPort.value = null
      showHistory.value = false
      showShortcuts.value = false
      break
  }
}

// Auto-refresh every 60 seconds
useIntervalFn(performScan, 60000)

onMounted(() => {
  performScan()
  fetchHistory()
  window.addEventListener('keydown', handleKeyboard)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboard)
})
</script>

<style>
/* CSS Variables */
:root {
  --bg-primary: #0a0e1a;
  --bg-secondary: #111827;
  --bg-card: rgba(17, 24, 39, 0.8);
  --bg-card-solid: #111827;
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
  --docker: #2496ed;
  --connections: #8b5cf6;
  --font-mono: 'JetBrains Mono', monospace;
  --font-display: 'Orbitron', sans-serif;
}

/* Light Theme */
.light-theme {
  --bg-primary: #f8fafc;
  --bg-secondary: #ffffff;
  --bg-card: rgba(255, 255, 255, 0.9);
  --bg-card-solid: #ffffff;
  --border: rgba(59, 130, 246, 0.2);
  --text-primary: #1e293b;
  --text-secondary: #64748b;
}

.light-theme .bg-grid {
  background-image: 
    linear-gradient(rgba(59, 130, 246, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(59, 130, 246, 0.05) 1px, transparent 1px);
}

.light-theme .bg-glow {
  background: 
    radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.1), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.08), transparent 40%);
}

.light-theme .header {
  background: rgba(255, 255, 255, 0.9);
}

.light-theme .title {
  background: linear-gradient(135deg, #3b82f6, #8b5cf6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.light-theme .stat-card,
.light-theme .chart-card,
.light-theme .ports-section {
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.light-theme .mono {
  color: #3b82f6;
}

.light-theme .search-input {
  background: white;
  border-color: #e2e8f0;
}

.light-theme .search-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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
  transition: background-color 0.3s ease, color 0.3s ease;
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
  transition: background-image 0.3s ease;
}

.bg-glow {
  position: fixed;
  inset: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(34, 211, 238, 0.15), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(168, 85, 247, 0.1), transparent 40%);
  z-index: -1;
  animation: pulseGlow 8s ease-in-out infinite;
  transition: background 0.3s ease;
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
  transition: background 0.3s ease;
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
  cursor: pointer;
  transition: transform 0.3s ease;
}

.radar-icon:hover {
  transform: scale(1.1);
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.system-info {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--text-secondary);
}

.sys-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.scan-time {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

.cached-badge {
  padding: 2px 6px;
  background: rgba(234, 179, 8, 0.2);
  color: var(--medium);
  border-radius: 4px;
  font-size: 10px;
}

.connections-badge {
  padding: 2px 6px;
  background: rgba(139, 92, 246, 0.2);
  color: var(--connections);
  border-radius: 4px;
  font-size: 10px;
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

.btn-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-icon:hover {
  border-color: var(--accent-cyan);
  background: rgba(34, 211, 238, 0.1);
  transform: translateY(-2px);
}

.btn-icon-sm {
  font-size: 16px;
  animation: spin 2s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
  transform: translateY(-2px);
}

.btn-scan.scanning {
  opacity: 0.7;
  cursor: not-allowed;
}

/* Shortcuts Hint */
.shortcuts-hint {
  position: fixed;
  bottom: 80px;
  right: 20px;
  background: var(--bg-card-solid);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 16px;
  z-index: 300;
  backdrop-filter: blur(20px);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
}

.shortcut-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.shortcut-item kbd {
  display: inline-block;
  padding: 2px 8px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent-cyan);
  min-width: 30px;
  text-align: center;
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
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
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
.stat-card.docker { border-color: rgba(36, 150, 237, 0.5); }
.stat-card.connections { border-color: rgba(139, 92, 246, 0.5); }

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
.charts-section,
.trend-section {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.trend-section {
  grid-template-columns: 1fr;
}

.chart-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  backdrop-filter: blur(10px);
}

.chart-card.full-width {
  grid-column: span 3;
}

.chart-title {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 16px;
  font-weight: 600;
}

/* Firewall Section */
.firewall-section {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-header h3 {
  font-size: 16px;
  color: var(--text-primary);
}

.btn-copy {
  padding: 8px 16px;
  background: rgba(34, 211, 238, 0.2);
  border: 1px solid var(--accent-cyan);
  border-radius: 6px;
  color: var(--accent-cyan);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-copy:hover {
  background: rgba(34, 211, 238, 0.3);
}

.firewall-code {
  background: rgba(0, 0, 0, 0.3);
  padding: 16px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent-cyan);
  overflow-x: auto;
  line-height: 1.6;
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
  display: flex;
  align-items: center;
  gap: 6px;
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

.chip-count {
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 11px;
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

.ports-table th.sortable {
  cursor: pointer;
  user-select: none;
}

.ports-table th.sortable:hover {
  color: var(--accent-cyan);
}

.ports-table td {
  padding: 12px 16px;
  font-size: 13px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: top;
}

.port-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.port-row:hover {
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

.docker-badge {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(36, 150, 237, 0.2);
  color: var(--docker);
  border-radius: 4px;
  font-size: 11px;
  cursor: help;
}

.connections-count {
  display: inline-block;
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 4px;
  font-size: 12px;
  color: var(--text-secondary);
}

.connections-count.has-connections {
  background: rgba(139, 92, 246, 0.2);
  color: var(--connections);
  font-weight: 600;
}

.connections-badge-sm {
  font-size: 11px;
  color: var(--connections);
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
  cursor: pointer;
  transition: all 0.3s ease;
}

.port-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
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
  flex-wrap: wrap;
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

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  z-index: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-content {
  background: var(--bg-card-solid);
  border: 1px solid var(--border);
  border-radius: 16px;
  width: 100%;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.modal-header h3 {
  font-size: 18px;
  color: var(--text-primary);
}

.btn-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-close:hover {
  border-color: var(--critical);
  color: var(--critical);
}

.modal-body {
  padding: 20px;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item .detail-label {
  font-size: 12px;
  color: var(--text-secondary);
}

.detail-item .detail-value {
  font-size: 14px;
  color: var(--text-primary);
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h4 {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.cmdline,
.raw-data {
  background: rgba(0, 0, 0, 0.3);
  padding: 12px;
  border-radius: 8px;
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--accent-cyan);
  overflow-x: auto;
  word-break: break-all;
}

.advice-text {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* History Panel */
.history-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  background: var(--bg-card-solid);
  border-left: 1px solid var(--border);
  backdrop-filter: blur(20px);
  z-index: 200;
  overflow-y: auto;
  transform: translateX(0);
  transition: transform 0.3s ease;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.history-header h3 {
  font-size: 16px;
  color: var(--text-primary);
}

.history-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
}

.history-tabs button {
  flex: 1;
  padding: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.history-tabs button.active {
  color: var(--accent-cyan);
  border-bottom: 2px solid var(--accent-cyan);
}

.history-content {
  padding: 16px;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.history-item {
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.history-time {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.history-stats {
  font-size: 14px;
  margin-bottom: 4px;
}

.history-stats .critical { color: var(--critical); }
.history-stats .high { color: var(--high); }
.history-stats .medium { color: var(--medium); }
.history-stats .low { color: var(--low); }

.history-total {
  font-size: 11px;
  color: var(--text-secondary);
}

.change-item {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 8px;
  align-items: center;
}

.change-type {
  font-size: 12px;
  font-weight: 600;
}

.change-type.added { color: var(--low); }
.change-type.removed { color: var(--critical); }
.change-type.severity_changed { color: var(--medium); }

.change-port {
  font-family: var(--font-mono);
  color: var(--accent-cyan);
}

.change-time {
  font-size: 11px;
  color: var(--text-secondary);
}

.stats-trend {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.trend-item {
  padding: 12px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 8px;
}

.trend-date {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.trend-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  overflow: hidden;
  display: flex;
  margin-bottom: 4px;
}

.trend-fill {
  height: 100%;
}

.trend-fill.critical { background: var(--critical); }
.trend-fill.high { background: var(--high); }

.trend-value {
  font-size: 11px;
  color: var(--text-secondary);
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

.footer-features {
  margin-top: 4px;
  font-size: 11px;
  color: var(--accent-cyan);
}

.footer-shortcuts {
  margin-top: 8px;
  font-size: 11px;
}

.footer-shortcuts kbd {
  display: inline-block;
  padding: 1px 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 3px;
  font-family: var(--font-mono);
  font-size: 10px;
}

/* Responsive */
@media (max-width: 1024px) {
  .charts-section,
  .trend-section {
    grid-template-columns: 1fr;
  }
  
  .chart-card.full-width {
    grid-column: span 1;
  }
  
  .history-panel {
    width: 100%;
  }
  
  .system-info {
    display: none;
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
  
  .shortcuts-hint {
    display: none;
  }
}
</style>
