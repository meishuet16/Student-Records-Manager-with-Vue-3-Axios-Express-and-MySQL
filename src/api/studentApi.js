// src/api/studentApi.js
import axios from 'axios'

const apiClient = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
})

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`)
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error(`[API ERROR] ${error.response.status} - ${error.response.statusText}`)
    } else if (error.request) {
      console.error('[API ERROR] No response from server (is the API running?)')
    } else {
      console.error('[API ERROR]', error.message)
    }
    return Promise.reject(error)
  }
)

// CRUD helpers
export const getStudents = (params = {}) =>
  apiClient.get('/students', { params })

export const getStudent = (id) => apiClient.get(`/students/${id}`)

export const createStudent = (s) => apiClient.post('/students', s)

export const updateStudent = (id, s) => apiClient.put(`/students/${id}`, s)

// Extension B: PATCH for partial update (e.g. toggle active)
export const patchStudent = (id, fields) => apiClient.patch(`/students/${id}`, fields)

export const deleteStudent = (id) => apiClient.delete(`/students/${id}`)

// Extension D: Faculty stats
export const getFacultyStats = () => apiClient.get('/students/stats')

export default apiClient