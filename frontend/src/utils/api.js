import axios from 'axios'

const rawApiUrl = (import.meta.env.VITE_API_URL || '').trim()
const resolvedApiUrl = rawApiUrl.length > 0 ? rawApiUrl : '/api'

const API = axios.create({
	baseURL: resolvedApiUrl,
	timeout: Number(import.meta.env.VITE_API_TIMEOUT_MS || 900000),
})

export const detectDeepfake = (videoFile, onProgress, signal) => {
	const formData = new FormData()
	formData.append('video', videoFile)
	return API.post('/detect', formData, {
		headers: { 'Content-Type': 'multipart/form-data' },
		onUploadProgress: onProgress,
		signal,
	})
}

export const sendChatMessage = (message, history) => API.post('/chat', { message, history })

export const downloadReport = (analysisData) =>
	API.post('/report', analysisData, { responseType: 'blob' })

export const healthCheck = () => API.get('/health')

