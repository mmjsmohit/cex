"use client";

import { useSyncExternalStore } from "react";

import { AUTH_TOKEN_KEY } from "@/lib/auth";

type AuthSnapshot = {
  isHydrated: boolean;
  token: string | null;
  isAuthenticated: boolean;
};

type AuthStore = AuthSnapshot & {
  signIn: (token: string) => void;
  signOut: () => void;
};

let snapshot: AuthSnapshot = {
  isHydrated: false,
  token: null,
  isAuthenticated: false,
};

const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

function updateSnapshot(nextToken: string | null, isHydrated = snapshot.isHydrated) {
  snapshot = {
    isHydrated,
    token: nextToken,
    isAuthenticated: Boolean(nextToken),
  };
  emitChange();
}

function readStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return (
    window.localStorage.getItem(AUTH_TOKEN_KEY) ??
    window.localStorage.getItem("jwt") ??
    window.localStorage.getItem("token")
  );
}

function persistToken(token: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_TOKEN_KEY, token);
}

function clearToken() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  window.localStorage.removeItem("jwt");
  window.localStorage.removeItem("token");
}

function initializeAuthStore() {
  if (snapshot.isHydrated || typeof window === "undefined") {
    return;
  }

  updateSnapshot(readStoredToken(), true);
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  initializeAuthStore();

  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return snapshot;
}

function signIn(token: string) {
  persistToken(token);
  updateSnapshot(token, true);
}

function signOut() {
  clearToken();
  updateSnapshot(null, true);
}

export function useAuthStore<T>(selector: (store: AuthStore) => T): T {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  return selector({
    ...state,
    signIn,
    signOut,
  });
}
