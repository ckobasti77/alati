"use client";

type ListState<T, P> = {
  items: T[];
  page: number;
  pagination: P;
  scrollY: number;
  savedAt: number;
  extra?: Record<string, unknown>;
};

const isBrowser = () => typeof window !== "undefined";

export function readListState<T, P>(key: string): ListState<T, P> | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed as ListState<T, P>;
  } catch {
    return null;
  }
}

export function writeListState<T, P>(key: string, state: ListState<T, P>) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.setItem(key, JSON.stringify(state));
  } catch {
    // Ignore storage failures (quota/private mode).
  }
}

export function clearListState(key: string) {
  if (!isBrowser()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // Ignore storage failures (quota/private mode).
  }
}
