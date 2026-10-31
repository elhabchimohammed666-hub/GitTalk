import { createContext, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "../../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["current-user"],
    queryFn: () => apiRequest("/api/auth/me"),
    retry: (count, error) => error.status !== 401 && count < 1
  });

  const value = {
    user: data?.user ?? null,
    isLoading,
    refreshUser: refetch
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
