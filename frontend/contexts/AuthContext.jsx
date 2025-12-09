"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL } from "@/utils/api-config";

const AuthContext = createContext(null);

const AUTH_CACHE_KEY = "auth_user";
const AUTH_TOKEN_KEY = "auth_token";
const AUTH_TOKEN_EXPIRY_KEY = "auth_token_expiry";
const AUTH_LAST_VALIDATED_KEY = "auth_last_validated";
const VALIDATION_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  // Load cached user data immediately
  const loadCachedAuth = useCallback(() => {
    if (typeof window === "undefined") return null;

    try {
      const cachedUser = localStorage.getItem(AUTH_CACHE_KEY);
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      const lastValidated = localStorage.getItem(AUTH_LAST_VALIDATED_KEY);

      if (cachedUser && token) {
        const userData = JSON.parse(cachedUser);
        const lastValidatedTime = lastValidated ? parseInt(lastValidated, 10) : 0;
        const now = Date.now();

        // If validated recently (within validation interval), use cached data
        if (now - lastValidatedTime < VALIDATION_INTERVAL) {
          return { user: userData, token, needsValidation: false };
        }

        // Otherwise, needs validation but can show cached data
        return { user: userData, token, needsValidation: true };
      }
    } catch (error) {
      console.error("Error loading cached auth:", error);
    }

    return null;
  }, []);

  // Validate token with backend
  const validateToken = useCallback(
    async (token, showLoading = false) => {
      if (!token) {
        return { valid: false, user: null };
      }

      if (showLoading) {
        setIsValidating(true);
      }

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            // Token invalid, clear auth
            localStorage.removeItem(AUTH_TOKEN_KEY);
            localStorage.removeItem(AUTH_CACHE_KEY);
            localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
            localStorage.removeItem(AUTH_LAST_VALIDATED_KEY);
            return { valid: false, user: null };
          }
          // Other errors - return cached data if available
          throw new Error(`Server error: ${response.status}`);
        }

        const payload = await response.json();
        const userData = payload.user || payload;

        // Update cache
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(userData));
        localStorage.setItem(AUTH_LAST_VALIDATED_KEY, Date.now().toString());

        return { valid: true, user: userData };
      } catch (error) {
        if (error.name === "AbortError") {
          // Timeout - return cached data if available
          const cached = loadCachedAuth();
          if (cached) {
            return { valid: true, user: cached.user, fromCache: true };
          }
        }
        // Network error - return cached data if available
        const cached = loadCachedAuth();
        if (cached) {
          return { valid: true, user: cached.user, fromCache: true };
        }
        return { valid: false, user: null };
      } finally {
        if (showLoading) {
          setIsValidating(false);
        }
      }
    },
    [loadCachedAuth]
  );

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      // Load cached data first for instant UI
      const cached = loadCachedAuth();

      if (cached) {
        setUser(cached.user);
        setIsAuthenticated(true);
        setIsLoading(false);

        // Validate in background if needed
        if (cached.needsValidation) {
          const validation = await validateToken(cached.token, false);
          if (validation.valid && validation.user) {
            setUser(validation.user);
          } else if (!validation.valid) {
            setUser(null);
            setIsAuthenticated(false);
            router.push("/login");
          }
        }
      } else {
        // No cached data, check for token
        const token = localStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          const validation = await validateToken(token, true);
          if (validation.valid && validation.user) {
            setUser(validation.user);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
            router.push("/login");
          }
        } else {
          setIsAuthenticated(false);
        }
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [loadCachedAuth, validateToken, router]);

  // Periodic validation (every 5 minutes)
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        const validation = await validateToken(token, false);
        if (validation.valid && validation.user) {
          setUser(validation.user);
        } else if (!validation.valid) {
          setUser(null);
          setIsAuthenticated(false);
          router.push("/login");
        }
      }
    }, VALIDATION_INTERVAL);

    return () => clearInterval(interval);
  }, [isAuthenticated, validateToken, router]);

  const login = useCallback(
    async (email, password, rememberMe = false) => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
            device_name: "web",
          }),
        });

        if (response.status === 422) {
          const payload = await response.json();
          return {
            success: false,
            error: payload.message || "We couldn't verify those details. Please try again.",
            errors: payload.errors || {},
          };
        }

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          return {
            success: false,
            error: payload.message || `Something went wrong (HTTP ${response.status}). Please try again.`,
          };
        }

        const payload = await response.json();
        const token = payload.token;
        const userData = payload.user;

        // Store token
        localStorage.setItem(AUTH_TOKEN_KEY, token);

        // Set expiration if remember me is checked (30 days), otherwise 24 hours
        if (rememberMe) {
          const expiry = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
          localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, expiry.toString());
        } else {
          const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
          localStorage.setItem(AUTH_TOKEN_EXPIRY_KEY, expiry.toString());
        }

        // Store user data
        localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify(userData));
        localStorage.setItem(AUTH_LAST_VALIDATED_KEY, Date.now().toString());

        setUser(userData);
        setIsAuthenticated(true);

        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error.message || "Login failed",
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    
    // Call logout endpoint to invalidate token on server (non-blocking)
    if (token) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).catch(() => {
        // Ignore errors - continue with logout anyway
      });
    }

    // Clear all auth data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_CACHE_KEY);
    localStorage.removeItem(AUTH_TOKEN_EXPIRY_KEY);
    localStorage.removeItem(AUTH_LAST_VALIDATED_KEY);
    setUser(null);
    setIsAuthenticated(false);
    router.push("/login");
  }, [router]);

  const refreshAuth = useCallback(async () => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      const validation = await validateToken(token, true);
      if (validation.valid && validation.user) {
        setUser(validation.user);
        setIsAuthenticated(true);
        return true;
      } else {
        logout();
        return false;
      }
    }
    return false;
  }, [validateToken, logout]);

  const value = {
    user,
    isAuthenticated,
    isLoading,
    isValidating,
    login,
    logout,
    refreshAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

