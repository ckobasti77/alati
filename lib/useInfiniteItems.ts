"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Options = {
  batchSize?: number;
  delayMs?: number;
  resetDeps?: unknown[];
};

export function useInfiniteItems<T>(items: T[], options?: Options) {
  const batchSize = options?.batchSize ?? 10;
  const delayMs = options?.delayMs ?? 800;
  const resetDeps = options?.resetDeps ?? [];
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    setVisibleCount(batchSize);
    setIsLoadingMore(false);
  }, [batchSize, items.length, ...resetDeps]);

  const loadMore = useCallback(() => {
    if (isLoadingMore) return;
    if (visibleCount >= items.length) return;
    setIsLoadingMore(true);
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = window.setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + batchSize, items.length));
      setIsLoadingMore(false);
    }, delayMs);
  }, [batchSize, delayMs, isLoadingMore, items.length, visibleCount]);

  useEffect(() => {
    const target = loaderRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [loadMore]);

  const visibleItems = useMemo(() => items.slice(0, visibleCount), [items, visibleCount]);
  const hasMore = visibleCount < items.length;

  return {
    visibleItems,
    loaderRef,
    loadMore,
    isLoadingMore,
    hasMore,
  };
}
