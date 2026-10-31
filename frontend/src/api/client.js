const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers
    },
    ...options
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || "Une erreur est survenue.");
    error.status = response.status;
    throw error;
  }
  return payload;
}

export { API_URL };
