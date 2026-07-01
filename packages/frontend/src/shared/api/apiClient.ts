import axios from "axios";

export const apiClient = axios.create({
  baseURL: "https://api.grk.pw/dis",
  withCredentials: true,
  validateStatus: (status) => (status >= 200 && status < 300) || status === 401,
});
