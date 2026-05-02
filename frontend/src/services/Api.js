import axios from "axios"

const apiBaseURL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api
const api = axios.create({
baseURL: apiBaseURL
})

// Attach auth token automatically for protected backend routes.
api.interceptors.request.use((config) => {
	const token = localStorage.getItem("token")

	if (token) {
		config.headers = config.headers || {}
		config.headers.Authorization = `Bearer ${token}`
	}

	return config
})

export default api
