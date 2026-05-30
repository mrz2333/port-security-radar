<template>
  <div class="chart-container">
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const props = defineProps({
  data: Object
})

const chartCanvas = ref(null)
let chartInstance = null

const bindLabels = {
  'loopback': '本机回环',
  'public-bind': '公网绑定',
  'private-lan': '内网地址',
  'specific': '指定地址',
  'unknown': '未知'
}

function createChart() {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  const labels = Object.keys(props.data || {}).map(k => bindLabels[k] || k)
  const values = Object.values(props.data || {})
  
  const colors = [
    'rgba(34, 197, 94, 0.8)',
    'rgba(239, 68, 68, 0.8)',
    'rgba(234, 179, 8, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(107, 114, 128, 0.8)'
  ]

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2,
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(17, 24, 39, 0.95)',
          titleColor: '#e2e8f0',
          bodyColor: '#e2e8f0',
          borderColor: 'rgba(56, 189, 248, 0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          titleFont: {
            family: "'JetBrains Mono', monospace",
            weight: 600
          },
          bodyFont: {
            family: "'JetBrains Mono', monospace"
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#94a3b8',
            font: {
              family: "'JetBrains Mono', monospace",
              size: 11
            }
          },
          grid: {
            color: 'rgba(56, 189, 248, 0.1)'
          }
        },
        y: {
          ticks: {
            color: '#94a3b8',
            font: {
              family: "'JetBrains Mono', monospace",
              size: 11
            }
          },
          grid: {
            display: false
          }
        }
      },
      animation: {
        duration: 1000,
        easing: 'easeOutQuart'
      }
    }
  })
}

onMounted(() => {
  createChart()
})

watch(() => props.data, () => {
  createChart()
}, { deep: true })
</script>

<style scoped>
.chart-container {
  height: 250px;
  position: relative;
}
</style>
