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
  data: Array
})

const chartCanvas = ref(null)
let chartInstance = null

function createChart() {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  
  const labels = props.data.map(d => d.date)
  const criticalData = props.data.map(d => d.avg_critical || 0)
  const highData = props.data.map(d => d.avg_high || 0)
  const totalData = props.data.map(d => d.avg_total || 0)
  
  chartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '总端口',
          data: totalData,
          borderColor: 'rgba(56, 189, 248, 0.8)',
          backgroundColor: 'rgba(56, 189, 248, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: '高危',
          data: criticalData,
          borderColor: 'rgba(239, 68, 68, 0.8)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: '高风险',
          data: highData,
          borderColor: 'rgba(249, 115, 22, 0.8)',
          backgroundColor: 'rgba(249, 115, 22, 0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#94a3b8',
            font: {
              family: "'JetBrains Mono', monospace",
              size: 11
            },
            padding: 16,
            usePointStyle: true,
            pointStyleWidth: 10
          }
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
          },
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}`
            }
          }
        }
      },
      scales: {
        x: {
          ticks: {
            color: '#94a3b8',
            font: {
              family: "'JetBrains Mono', monospace",
              size: 10
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
              size: 10
            }
          },
          grid: {
            color: 'rgba(56, 189, 248, 0.1)'
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
  if (props.data && props.data.length > 0) {
    createChart()
  }
})

watch(() => props.data, (newData) => {
  if (newData && newData.length > 0) {
    createChart()
  }
}, { deep: true })
</script>

<style scoped>
.chart-container {
  height: 300px;
  position: relative;
}
</style>
