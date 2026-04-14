import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE_URL;

const apiClient = axios.create({
  baseURL: baseURL,
  timeout: 120000, // 2 minutes — LLM pipeline is slow
});

export default apiClient;