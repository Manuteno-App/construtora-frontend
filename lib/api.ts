import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message: string =
      error?.response?.data?.message ??
      error?.message ??
      "Erro inesperado. Tente novamente.";
    return Promise.reject(new Error(message));
  }
);

export default api;
