<!-- src/components/FacultyChart.vue -->

<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { Chart, ArcElement, DoughnutController, Tooltip, Legend } from 'chart.js'

// 必須先「登記」要用的 Chart.js 組件，不然會報錯
Chart.register(ArcElement, DoughnutController, Tooltip, Legend)

// 從父組件（App.vue）接收 stats 資料
const props = defineProps({
  stats: { type: Array, required: true }
})

// 用來綁定 canvas 元素的 ref
const canvasRef = ref(null)
// 存放 Chart 實例，方便之後更新或銷毀
let chartInstance = null

// 建立或更新圖表的 function
function renderChart() {
  if (!canvasRef.value || !props.stats.length) return

  // 如果已經有圖表實例，先銷毀（不然會有錯誤）
  if (chartInstance) {
    chartInstance.destroy()
  }

  // 從 stats 資料提取標籤和數值
  const labels = props.stats.map(s => s.faculty)
  const data = props.stats.map(s => s.total)

  // 建立 Doughnut Chart（甜甜圈圖）
  chartInstance = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        label: 'Students per Faculty',
        data,
        backgroundColor: [
          '#0f766e', // 深綠
          '#0369a1', // 深藍
          '#7c3aed', // 紫
          '#b45309', // 棕
          '#be185d', // 粉紅
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom' // 圖例放在圖表下方
        },
        tooltip: {
          callbacks: {
            // 自定義 tooltip 顯示內容
            label: (ctx) => {
              const stat = props.stats[ctx.dataIndex]
              return [
                ` ${ctx.label}: ${ctx.parsed} students`,
                ` Avg GPA: ${stat.avgGpa}`
              ]
            }
          }
        }
      }
    }
  })
}

// 當 stats 資料改變時（例如新增/刪除學生後），重新畫圖
watch(() => props.stats, renderChart, { deep: true })

// 組件掛載後畫圖
onMounted(renderChart)

// 組件銷毀前清理 Chart 實例（防止記憶體洩漏）
onUnmounted(() => {
  if (chartInstance) chartInstance.destroy()
})
</script>

<template>
  <div class="chart-card">
    <h3>Students by Faculty</h3>
    <!-- 如果沒有資料，顯示提示 -->
    <div v-if="!stats.length" class="empty">No data available.</div>
    <!-- canvas 是 Chart.js 畫圖的地方，就像一塊白板 -->
    <canvas v-else ref="canvasRef" style="max-height: 300px;"></canvas>

    <!-- 顯示各學院的詳細統計 -->
    <table class="stats-table" v-if="stats.length">
      <thead>
        <tr>
          <th>Faculty</th>
          <th>Students</th>
          <th>Avg GPA</th>
          <th>Year Range</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stats" :key="s.faculty">
          <td>{{ s.faculty }}</td>
          <td>{{ s.total }}</td>
          <td>{{ s.avgGpa }}</td>
          <td>{{ s.minYear }} – {{ s.maxYear }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>