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

function createChart() {
  if (chartInstance) {
    chartInstance.destroy()
  }

  const ctx = chartCanvas.value.getContext('2d')
  const labels = Object.keys(props.data || {})
  const values = Object.values(props.data || {})
  
  const colors = [
    'rgba(34, 211, 238, 0.8)',
    'rgba(168, 85, 247, 0.8)',
    'rgba(59, 130, 246, 0.8)',
    'rgba(236, 72, 153, 0.8)'
  ]

  chartInstance = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels: labels.map(l => l.toUpperCase()),
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94a3b8',
            font: {
              family: "'JetBrains Mono', monospace",
              size: 11
            },
            padding: 16,
            usePointStyle: true
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
          }
        }
      },
      scales: {
        r: {
          ticks: {
            color: '#94a3b8',
            backdropColor: 'transparent',
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
        animateRotate: true,
        animateScale: true
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
