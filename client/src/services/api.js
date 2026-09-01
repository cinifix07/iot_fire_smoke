import axios from 'axios'

const DEFAULT_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || ''

export function createApiClient(baseURL = DEFAULT_BASE_URL, config = {}) {
  return axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
    ...config,
  })
}

const api = createApiClient()

export default api
