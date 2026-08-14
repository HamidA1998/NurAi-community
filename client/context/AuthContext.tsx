import React, { createContext, useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ApiRequestError, apiRequest } from "@/lib/query-client";
import {
  fullSync,
  pushToServer,
  clearSyncCache,
  clearSyncedLocalData,
  enableSync,
  disableSync,
} from "@/lib/progress-sync";
import { clearNurAIWidgetSnapshot } from "@/lib/widget-snapshot";

const AUTH_SYNC_USER_ID_KEY = "nurai_auth_sync_user_id";
const AUTH_USER_CACHE_KEY = "nurai_auth_user_cache_v1";
// Shorter than apiRequest's generic 12s default so a degraded connection
// surfaces a retryable error well before the sign-in button feels "stuck".
const AUTH_REQUEST_TIMEOUT_MS = 8000;

type AuthUser = {
  id: string;
  email: string | null;
  username: string;
  displayName: string | null;
  profilePhoto: string | null;
  authProvider: string;
};

const ENABLE_QA_AUTH_BYPASS =
  typeof __DEV__ !== "undefined" &&
  __DEV__ &&
  process.env.EXPO_PUBLIC_QA_AUTH_BYPASS === "true";

const QA_AUTH_USER: AuthUser = {
  id: "preview-local-user",
  email: "preview@nurai.invalid",
  username: "preview",
  displayName: "Guest",
  profilePhoto: null,
  authProvider: "local_preview",
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    displayName: string,
  ) => Promise<void>;
  loginWithApple: (
    identityToken: string,
    fullName?: { givenName?: string; familyName?: string },
    email?: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (changes: {
    displayName?: string;
    profilePhoto?: string | null;
  }) => Promise<void>;
};

export const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  loginWithApple: async () => {},
  logout: async () => {},
  deleteAccount: async () => {},
  refreshUser: async () => {},
  updateProfile: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setUserAndStoreEmail = useCallback((data: AuthUser | null) => {
    setUser(data);
    if (data) {
      AsyncStorage.setItem(AUTH_USER_CACHE_KEY, JSON.stringify(data)).catch(
        () => {},
      );
      if (data.email) {
        AsyncStorage.setItem("userEmail", data.email).catch(() => {});
      }
    }
  }, []);

  const prepareAuthenticatedSession = useCallback(async (data: AuthUser) => {
    const previousUserId = await AsyncStorage.getItem(AUTH_SYNC_USER_ID_KEY);
    if (previousUserId && previousUserId !== data.id) {
      await clearSyncedLocalData();
      await clearNurAIWidgetSnapshot();
    }
    await AsyncStorage.setItem(AUTH_SYNC_USER_ID_KEY, data.id);
  }, []);

  const triggerSync = useCallback(async () => {
    try {
      enableSync();
      await fullSync();
    } catch (err) {
      console.warn("Progress sync failed:", err);
    }
  }, []);

  const checkAuth = useCallback(async () => {
    if (ENABLE_QA_AUTH_BYPASS) {
      await AsyncStorage.setItem("onboarding_completed", "true");
      await prepareAuthenticatedSession(QA_AUTH_USER);
      setUserAndStoreEmail(QA_AUTH_USER);
      setIsLoading(false);
      return;
    }

    try {
      const res = await apiRequest("GET", "/api/auth/me", undefined, {
        timeoutMs: 5000,
      });
      const data = await res.json();
      await prepareAuthenticatedSession(data);
      setUserAndStoreEmail(data);
      setTimeout(() => triggerSync(), 500);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
        setUser(null);
      } else {
        const cachedUser = await AsyncStorage.getItem(AUTH_USER_CACHE_KEY);
        if (cachedUser) {
          try {
            const parsed = JSON.parse(cachedUser) as AuthUser;
            await prepareAuthenticatedSession(parsed);
            setUser(parsed);
          } catch {
            await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [prepareAuthenticatedSession, setUserAndStoreEmail, triggerSync]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const res = await apiRequest(
        "POST",
        "/api/auth/login",
        { identifier, email: identifier, password },
        { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
      );
      const data = await res.json();
      await prepareAuthenticatedSession(data);
      setUserAndStoreEmail(data);
      setTimeout(() => triggerSync(), 500);
    },
    [prepareAuthenticatedSession, triggerSync, setUserAndStoreEmail],
  );

  const register = useCallback(
    async (email: string, password: string, displayName: string) => {
      const res = await apiRequest(
        "POST",
        "/api/auth/register",
        { email, password, displayName },
        { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
      );
      const data = await res.json();
      await prepareAuthenticatedSession(data);
      setUserAndStoreEmail(data);
      setTimeout(() => triggerSync(), 500);
    },
    [prepareAuthenticatedSession, triggerSync, setUserAndStoreEmail],
  );

  const loginWithApple = useCallback(
    async (
      identityToken: string,
      fullName?: { givenName?: string; familyName?: string },
      email?: string,
    ) => {
      const res = await apiRequest(
        "POST",
        "/api/auth/apple",
        { identityToken, fullName, email },
        { timeoutMs: AUTH_REQUEST_TIMEOUT_MS },
      );
      const data = await res.json();
      await prepareAuthenticatedSession(data);
      setUserAndStoreEmail(data);
      setTimeout(() => triggerSync(), 500);
    },
    [prepareAuthenticatedSession, triggerSync, setUserAndStoreEmail],
  );

  const logout = useCallback(async () => {
    try {
      await pushToServer();
    } catch {}
    disableSync();
    try {
      await apiRequest("POST", "/api/auth/logout");
    } catch {}
    await clearSyncedLocalData();
    await clearNurAIWidgetSnapshot();
    await AsyncStorage.removeItem(AUTH_SYNC_USER_ID_KEY);
    await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
    setUser(null);
  }, []);

  const deleteAccount = useCallback(async () => {
    disableSync();
    await apiRequest("DELETE", "/api/auth/account");
    await clearSyncCache();
    await clearSyncedLocalData();
    await clearNurAIWidgetSnapshot();
    await AsyncStorage.removeItem(AUTH_SYNC_USER_ID_KEY);
    await AsyncStorage.removeItem(AUTH_USER_CACHE_KEY);
    setUser(null);
  }, []);

  const updateProfile = useCallback(
    async (changes: { displayName?: string; profilePhoto?: string | null }) => {
      const res = await apiRequest("PUT", "/api/auth/profile", changes);
      const data = (await res.json()) as AuthUser;
      setUserAndStoreEmail(data);
    },
    [setUserAndStoreEmail],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        loginWithApple,
        logout,
        deleteAccount,
        refreshUser: checkAuth,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
