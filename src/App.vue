<!-- src/App.vue -->
<!-- latest version(A)、active toggle(B)、server validation(C)、chart(D) -->

<script setup>
import { ref, onMounted } from 'vue'
import StudentForm from './components/StudentForm.vue'
import StudentList from './components/StudentList.vue'
import FacultyChart from './components/FacultyChart.vue'
import {
  getStudents, createStudent, updateStudent,
  deleteStudent, patchStudent, getFacultyStats
} from './api/studentApi.js'

const students = ref([])
const editingStudent = ref(null)
const loading = ref(false)
const errorMsg = ref('')
const serverErrors = ref({}) // Extension C:

// Extension A:
const currentPage = ref(1)
const pageSize = ref(10)
const totalStudents = ref(0)
const totalPages = ref(0)

// Extension D:
const facultyStats = ref([])
const showChart = ref(false)

async function load() {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await getStudents({
      page: currentPage.value,
      size: pageSize.value
    })
   
    students.value = data.data
    totalStudents.value = data.total
    totalPages.value = data.totalPages
  } catch (e) {
    errorMsg.value = 'Failed to load students. Is the API running on :3000?'
  } finally {
    loading.value = false
  }
}

// Extension D: 
async function loadStats() {
  try {
    const { data } = await getFacultyStats()
    facultyStats.value = data
  } catch (e) {
    console.error('Failed to load stats', e)
  }
}

// Extension A: 
function goToPage(page) {
  if (page < 1 || page > totalPages.value) return
  currentPage.value = page
  load()
}

async function handleSave(payload) {
  serverErrors.value = {} 
  try {
    if (editingStudent.value) {
      await updateStudent(editingStudent.value.id, payload)
      editingStudent.value = null
    } else {
      await createStudent(payload)
    }
    await load()
    await loadStats() 
  } catch (e) {
    // Extension C: 
    if (e.response?.status === 400 && e.response.data?.errors) {
      serverErrors.value = e.response.data.errors
    } else {
      errorMsg.value = 'Save failed. Check the console for details.'
    }
  }
}

function handleEdit(s) { editingStudent.value = { ...s } }
function handleCancel() {
  editingStudent.value = null
  serverErrors.value = {}
}

async function handleDelete(id) {
  if (!confirm('Delete this student? This cannot be undone.')) return
  try {
    await deleteStudent(id)

    if (students.value.length === 1 && currentPage.value > 1) {
      currentPage.value--
    }
    await load()
    await loadStats()
  } catch {
    errorMsg.value = 'Delete failed.'
  }
}

// Extension B: 
async function handleToggleActive(student) {
  const originalActive = student.active
  const idx = students.value.findIndex(s => s.id === student.id)
  if (idx !== -1) {
    students.value[idx] = { ...students.value[idx], active: !originalActive }
  }

  try {
    await patchStudent(student.id, { active: !originalActive ? 1 : 0 })
  } catch {

    if (idx !== -1) {
      students.value[idx] = { ...students.value[idx], active: originalActive }
    }
    errorMsg.value = 'Failed to toggle active status.'
  }
}

onMounted(async () => {
  await load()
  await loadStats()
})
</script>

<template>
  <header>
    <h1>Student Records Manager</h1>
    <p class="subtitle">Vue 3 · Axios · Express · MySQL</p>
  </header>

  <main>
    <p v-if="loading" class="loading">Loading…</p>
    <p v-if="errorMsg" class="error">{{ errorMsg }}</p>

    <div style="text-align:right">
      <button class="btn-outline" @click="showChart = !showChart">
        {{ showChart ? 'Hide Chart' : 'Show Faculty Chart' }}
      </button>
    </div>

    <FacultyChart v-if="showChart" :stats="facultyStats" />

    <StudentForm
      :editingStudent="editingStudent"
      :serverErrors="serverErrors"
      @save="handleSave"
      @cancel="handleCancel" />

    <StudentList
      :students="students"
      @edit="handleEdit"
      @delete="handleDelete"
      @toggleActive="handleToggleActive" />

    <!-- Extension A:-->
    <div v-if="totalPages > 1" class="pagination">
      <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1">
        ← Prev
      </button>
      <span>Page {{ currentPage }} of {{ totalPages }} ({{ totalStudents }} total)</span>
      <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages">
        Next →
      </button>
    </div>
  </main>
</template>