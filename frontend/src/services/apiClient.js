import axios from 'axios'

// Get API base URL from environment variables or use default

const normalizeApiBaseUrl = (value) => {
  const trimmed = (value || 'http://localhost:5000').replace(/\/$/, '')
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`
}

// Get API base URL from environment variables or use default
const apiBaseURL = normalizeApiBaseUrl(import.meta.env.VITE_API_BASE_URL)

console.log('[API Client] Base URL:', apiBaseURL)
  
const axiosInstance = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
})

// Add request interceptor to include auth token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Add response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // If 401, clear auth and redirect to login
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/'
    }
    return Promise.reject(error)
  }
)

// Simple API client without any caching
const apiClient = {
  get: (endpoint, config) => axiosInstance.get(endpoint, config),
  post: (endpoint, data, config) => axiosInstance.post(endpoint, data, config),
  put: (endpoint, data, config) => axiosInstance.put(endpoint, data, config),
  delete: (endpoint, config) => axiosInstance.delete(endpoint, config),
  patch: (endpoint, data, config) => axiosInstance.patch(endpoint, data, config),
}

// Chatbot API functions
export const chatbotAPI = {
  sendQuery: (message) => apiClient.post('/chatbot/query', { message }),
  getSuggestions: () => apiClient.get('/chatbot/suggestions'),
  healthCheck: () => apiClient.get('/chatbot/health')
}

export default apiClient
