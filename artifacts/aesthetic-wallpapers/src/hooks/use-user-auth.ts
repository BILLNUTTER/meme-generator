import { useState, useEffect } from "react";
import type { UserRecord } from "@workspace/api-client-react/src/generated/api.schemas";

export function useUserAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserRecord | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const storedToken = localStorage.getItem("userToken");
    const storedUser = localStorage.getItem("userInfo");

    if (storedToken) {
      setToken(storedToken);
    }
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse stored user info", e);
      }
    }
    setIsReady(true);

    const onAuthChange = () => {
      const t = localStorage.getItem("userToken");
      const u = localStorage.getItem("userInfo");
      setToken(t);
      setUser(u ? JSON.parse(u) : null);
    };
    window.addEventListener("auth-change", onAuthChange);
    return () => window.removeEventListener("auth-change", onAuthChange);
  }, []);

  const login = (newToken: string, userInfo: UserRecord) => {
    localStorage.setItem("userToken", newToken);
    localStorage.setItem("userInfo", JSON.stringify(userInfo));
    setToken(newToken);
    setUser(userInfo);
    window.dispatchEvent(new Event("auth-change"));
  };

  const logout = () => {
    localStorage.removeItem("userToken");
    localStorage.removeItem("userInfo");
    setToken(null);
    setUser(null);
    window.dispatchEvent(new Event("auth-change"));
  };

  return { token, user, login, logout, isAuthenticated: !!token, isReady };
}
