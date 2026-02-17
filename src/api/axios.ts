import axios from "axios";

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_URL ??"/api",
  baseURL: "https://api.caramellologistica.com",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem("@CaramelloLogistica:token");
      if (token && config.headers) {
        // eslint-disable-next-line no-param-reassign
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // ignore
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
