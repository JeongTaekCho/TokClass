"use client";

import { useEffect, useRef, useState } from "react";

import { AnimatePresence, motion } from "@/components/motion";
import { useRoomEvent } from "@/lib/realtime/provider";

type Floating = { id: number; emoji: string; left: number };

/** 이모지 반응이 슬라이드 위로 잠깐 떠올라요. 부모는 relative여야 해요. */
export function ReactionLayer() {
  const [items, setItems] = useState<Floating[]>([]);
  const seq = useRef(0);
  const timers = useRef<number[]>([]);
  const seen = useRef(new Set<string>());

  useRoomEvent("reaction.float", ({ emoji, nonce }) => {
    // 내가 보낸 반응은 누를 때 이미 띄웠어요. 서버에서 돌아온 같은 반응은 건너뛰어요.
    if (nonce) {
      if (seen.current.has(nonce)) return;
      seen.current.add(nonce);
    }
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
      <AnimatePresence>
        {items.map((i) => (
          <motion.span
            key={i.id}
            className="absolute bottom-4 text-4xl drop-shadow"
            style={{ left: `${i.left}%` }}
            initial={{ y: 0, scale: 0.6, opacity: 0 }}
            animate={{ y: [0, -40, -220], x: [0, i.left > 50 ? -12 : 12, 0], scale: [0.6, 1.15, 1], opacity: [0, 1, 0] }}
            transition={{ duration: 2.4, ease: "easeOut", times: [0, 0.2, 1] }}
            exit={{ opacity: 0 }}
          >
            {i.emoji}
          </motion.span>
        ))}
      </AnimatePresence>
    </div>
  );
}
