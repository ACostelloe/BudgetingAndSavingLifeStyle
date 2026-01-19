import axios from 'axios';

// Determine API base URL based on environment
const getApiBaseURL = () => {
  // In Electron, always use localhost:5000
  // In web dev, use proxy
  if (window.electronAPI) {
    return 'http://localhost:5000/api';
  }
  return '/api';
};

const api = axios.create({
  baseURL: getApiBaseURL(),
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;

