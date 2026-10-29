"use client";

import { useEffect, useRef } from "react";

/** ←/→ 키로 이동 (입력 중일 때는 무시) */
export function useKeyNav(handlers: { prev?: () => void; next?: () => void; escape?: () => void }, enabled = true) {
  const ref = useRef(handlers);
  useEffect(() => {
    ref.current = handlers;
  });
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.altKey || e.metaKey || e.ctrlKey) return;
      if (e.key === "ArrowLeft" || e.key === "PageUp") {
        ref.current.prev?.();
        e.preventDefault();
      } else if (e.key === "ArrowRight" || e.key === "PageDown" || (e.key === " " && ref.current.next)) {
        ref.current.next?.();
        e.preventDefault();
      } else if (e.key === "Escape") {
        ref.current.escape?.();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}

/** 좌우 스와이프 */
export function swipeHandlers(onPrev: () => void, onNext: () => void) {
  let startX = 0;
  let startY = 0;
  return {
    onTouchStart: (e: React.TouchEvent) => {
      startX = e.touches[0]!.clientX;
      startY = e.touches[0]!.clientY;
    },
    onTouchEnd: (e: React.TouchEvent) => {
      const dx = e.changedTouches[0]!.clientX - startX;
      const dy = e.changedTouches[0]!.clientY - startY;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) (dx > 0 ? onPrev : onNext)();
    },
  };
}
