import axios from "axios";
import Cookies from "js-cookie";

// Create the base Axios instance
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Central place to read user and tokens
const getUser = () => {
  const access_token = Cookies.get("access_token");
  const refresh_token = Cookies.get("refresh_token");
  return {
    access_token,
    refresh_token
  };
};
// Add request interceptor to attach access token if needed
api.interceptors.request.use(
  (config) => {
    const user = getUser();
    const accessToken = user?.access_token;

    if (config.headers?.requiresAuth && accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const user = getUser();
    const refreshToken = user?.refresh_token;

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      refreshToken
    ) {
      originalRequest._retry = true;
      try {
        const res = await axios.post(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/refresh`,
          null,
          {
            params: {
              refresh_token:refreshToken,
            },
            headers: {
              Accept: "application/json",
            },
          },
        );

        const newAccessToken = res.data.access_token;
        Cookies.set("access_token", newAccessToken);

        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("user_role");
        Cookies.remove("user");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
