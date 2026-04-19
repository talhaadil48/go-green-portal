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
              refresh_token: refreshToken,
            },
            headers: {
              Accept: "application/json",
            },
          },
        );

        // Extract all the new values from the refresh response
        const { access_token, refresh_token, user: userData } = res.data;

        // Update all cookies with the new values
        Cookies.set("access_token", access_token);
        Cookies.set("refresh_token", refresh_token);
        
        // Store the user object as a JSON string
        Cookies.set("user", JSON.stringify(userData));
        
        

        // Update the authorization header and retry the original request
        originalRequest.headers.Authorization = `Bearer ${access_token}`;
        return api(originalRequest);
        
      } catch (refreshError) {
        // If refresh fails (e.g., token expired or invalid), clear everything out
        Cookies.remove("access_token");
        Cookies.remove("refresh_token");
        Cookies.remove("user_role");
        Cookies.remove("user");
        
        // Optional: Redirect to login page here if you are in a browser environment
        // window.location.href = "/login";
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;