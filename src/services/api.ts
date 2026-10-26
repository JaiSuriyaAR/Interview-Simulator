const API_BASE = "/api";

const getAuthToken = () => localStorage.getItem("auth_token");

const request = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || "Request failed");
  }

  return response.json();
};

export const api = {
  auth: {
    login: async (credentials: any) => {
      const data = await request("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      localStorage.setItem("auth_token", data.token);
      return data.user;
    },
    register: async (userData: any) => {
      const data = await request("/auth/register", {
        method: "POST",
        body: JSON.stringify(userData),
      });
      localStorage.setItem("auth_token", data.token);
      return data.user;
    },
    logout: () => {
      localStorage.removeItem("auth_token");
    },
  },
  sessions: {
    getAll: () => request("/sessions"),
    create: (sessionData: any) => request("/sessions", {
      method: "POST",
      body: JSON.stringify(sessionData),
    }),
    update: (id: string, sessionData: any) => request(`/sessions/${id}`, {
      method: "PUT",
      body: JSON.stringify(sessionData),
    }),
  },
};
