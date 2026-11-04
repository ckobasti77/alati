"use client";

// Doslovno izvuceno iz app/narudzbine/page.tsx (refaktor bez promene ponasanja).
import { useCallback, useEffect, useRef, type MouseEvent, type TouchEvent } from "react";

export function useLongPress() {
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const lastTriggeredAtRef = useRef(0);
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  const consumeLongPressClick = useCallback((event: MouseEvent<HTMLElement>) => {
    if (!longPressTriggeredRef.current) return false;
    event.preventDefault();
    event.stopPropagation();
    longPressTriggeredRef.current = false;
    return true;
  }, []);

  const createLongPressHandlers = useCallback(
    (onLongPress: () => void, delay = 650) => ({
      onTouchStart: (event: TouchEvent<HTMLElement>) => {
        if (event.touches.length !== 1) return;
        clearLongPressTimer();
        longPressTriggeredRef.current = false;
        longPressTimerRef.current = window.setTimeout(() => {
          longPressTriggeredRef.current = true;
          lastTriggeredAtRef.current = Date.now();
          onLongPress();
        }, delay);
      },
      onTouchEnd: () => {
        clearLongPressTimer();
      },
      onTouchMove: () => {
        clearLongPressTimer();
      },
      onTouchCancel: () => {
        clearLongPressTimer();
      },
      onClick: (event: MouseEvent<HTMLElement>) => {
        consumeLongPressClick(event);
      },
      onContextMenu: (event: MouseEvent<HTMLElement>) => {
        if (longPressTriggeredRef.current) {
          event.preventDefault();
        }
      },
    }),
    [clearLongPressTimer, consumeLongPressClick],
  );


  /** Long-press se upravo desio (klik posle podizanja prsta treba ignorisati). */
  const wasRecentLongPress = useCallback((windowMs = 600) => Date.now() - lastTriggeredAtRef.current < windowMs, []);

  return { consumeLongPressClick, createLongPressHandlers, wasRecentLongPress };
}

