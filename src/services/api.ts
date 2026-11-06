import axios from "axios";
import { storage } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = storage.getToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Un 401 en estas rutas es un error de credenciales del formulario, no una sesion vencida.
    const url: string = error.config?.url ?? "";
    const isCredentialCheck = url.includes("/auth/login") || url.includes("/auth/change-password");

    if (error.response?.status === 401 && !isCredentialCheck) {
      storage.clearToken();
    }

    return Promise.reject(error);
  }
);
