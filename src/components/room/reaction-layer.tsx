"use client";

import { useEffect, useRef, useState } from "react";

import { useRoomEvent } from "@/lib/realtime/provider";

type Floating = { id: number; emoji: string; left: number };

/** 이모지 반응이 교안 위로 잠깐 떠올라요. 부모는 relative여야 해요. */
export function ReactionLayer() {
  const [items, setItems] = useState<Floating[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);

  useRoomEvent("reaction.float", ({ emoji }) => {
    const id = ++seq.current;
    setItems((prev) => [...prev.slice(-29), { id, emoji, left: 8 + Math.random() * 84 }]);
    timers.current.push(window.setTimeout(() => setItems((prev) => prev.filter((i) => i.id !== id)), 2500));
  });
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => clearTimeout(t));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {items.map((i) => (
        <span key={i.id} className="absolute bottom-4 animate-float-up text-4xl drop-shadow" style={{ left: `${i.left}%` }}>
          {i.emoji}
        </span>
      ))}
    </div>
  );
}
