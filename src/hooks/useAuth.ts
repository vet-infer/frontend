import { useCallback, useSyncExternalStore } from "react";
import { authService } from "../services/auth.service";
import type { LoginRequest } from "../types/auth";
import { AUTH_EVENT, storage } from "../utils/storage";

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot() {
  return storage.getToken();
}

type DecodedToken = { id: number | null; role: string | null; expiresAt: number | null };

function decodeToken(token: string | null): DecodedToken {
  if (!token) {
    return { id: null, role: null, expiresAt: null };
  }

  try {
    const payload = token.split(".")[1];
    const normalizedPayload = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = JSON.parse(window.atob(normalizedPayload)) as { sub?: string; role?: string; exp?: number };

    return {
      id: decoded.sub ? Number(decoded.sub) : null,
      role: decoded.role ?? null,
      expiresAt: typeof decoded.exp === "number" ? decoded.exp * 1000 : null,
    };
  } catch {
    return { id: null, role: null, expiresAt: null };
  }
}

function isTokenValid(token: string | null, decoded: DecodedToken) {
  if (!token || decoded.id === null) {
    return false;
  }

  return decoded.expiresAt === null || decoded.expiresAt > Date.now();
}

export function useAuth() {
  const token = useSyncExternalStore(subscribe, getSnapshot);
  const user = decodeToken(token);
  const isAuthenticated = isTokenValid(token, user);

  const login = useCallback(async (payload: LoginRequest) => {
    await authService.login(payload);
  }, []);

  const logout = useCallback(() => {
    authService.logout();
  }, []);

  return {
    token,
    user,
    role: isAuthenticated ? user.role : null,
    isAdmin: isAuthenticated && user.role === "admin",
    isAuthenticated,
    login,
    logout,
  };
}
