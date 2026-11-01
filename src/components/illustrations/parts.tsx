"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

/*
 * 톡클 일러스트 공통 규칙 (한 사람이 그린 것처럼 맞춰요)
 * - 모양: 둥근 사각형·원·둥근 삼각형만 써요. 뾰족한 모서리와 원근은 없어요(정면, 평면).
 * - 면: 외곽선 없이 칠해요. 장면마다 뒤에 연한 덩어리(Blob) 하나 + 주인공 색 1~2개 + 잉크색 눈·입.
 * - 색: 토큰 클래스만 써요(fill-primary, fill-coral, fill-sun, fill-mint, fill-sky, fill-lilac, fill-skin-*).
 * - 움직임: 소품이 둥실 뜨고(Float) 반짝여요(Sparkle). 움직임 줄이기 설정이면 멈춰 있어요(MotionConfig).
 */

export type IllustrationProps = {
  className?: string;
  /** 의미가 있는 그림이면 설명을 넣어요. 없으면 장식으로 보고 스크린리더에서 숨겨요. */
  title?: string;
};

export function Illustration({ viewBox, className, title, children }: IllustrationProps & { viewBox: string; children: React.ReactNode }) {
  return (
    <svg viewBox={viewBox} fill="none" strokeLinecap="round" strokeLinejoin="round" className={cn("h-auto w-full max-w-64", className)} {...(title ? { role: "img", "aria-label": title } : { "aria-hidden": true })}>
      {children}
    </svg>
  );
}

const TONE = {
  primary: "fill-primary",
  coral: "fill-coral",
  sun: "fill-sun",
  mint: "fill-mint",
  sky: "fill-sky",
  lilac: "fill-lilac",
} as const;
const STROKE = {
  primary: "stroke-primary",
  coral: "stroke-coral",
  sun: "stroke-sun",
  mint: "stroke-mint",
  sky: "stroke-sky",
  lilac: "stroke-lilac",
} as const;
export type Tone = keyof typeof TONE;

const SOFT = {
  primary: "fill-primary-soft",
  coral: "fill-coral-soft",
  sun: "fill-sun-soft",
  mint: "fill-mint-soft",
  sky: "fill-sky-soft",
  lilac: "fill-lilac-soft",
} as const;

/** 장면 뒤의 연한 덩어리. (cx, cy) 중심, r 반지름. */
export function Blob({ cx, cy, r, tone = "primary" }: { cx: number; cy: number; r: number; tone?: Tone }) {
  const k = r / 100;
  return (
    <path
      transform={`translate(${cx} ${cy}) scale(${k})`}
      d="M68 -62 C98 -34 104 14 84 50 C62 90 12 104 -34 92 C-80 80 -106 40 -100 -6 C-94 -52 -58 -88 -12 -96 C24 -102 46 -82 68 -62 Z"
      className={SOFT[tone]}
    />
  );
}

/** 둥실 떠 있는 소품. delay로 서로 엇갈려요. */
export function Float({ children, delay = 0, distance = 6, duration = 4 }: { children: React.ReactNode; delay?: number; distance?: number; duration?: number }) {
  return (
    <motion.g animate={{ y: [0, -distance, 0] }} transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}>
      {children}
    </motion.g>
  );
}

/** 반짝이(네 갈래 별). */
export function Sparkle({ x, y, size = 8, tone = "sun", delay = 0 }: { x: number; y: number; size?: number; tone?: Tone; delay?: number }) {
  const s = size;
  return (
    <motion.path
      d={`M${x} ${y - s} Q${x + s * 0.18} ${y - s * 0.18} ${x + s} ${y} Q${x + s * 0.18} ${y + s * 0.18} ${x} ${y + s} Q${x - s * 0.18} ${y + s * 0.18} ${x - s} ${y} Q${x - s * 0.18} ${y - s * 0.18} ${x} ${y - s} Z`}
      className={TONE[tone]}
      style={{ transformBox: "fill-box", transformOrigin: "center" }}
      animate={{ scale: [0.6, 1, 0.6], opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2.4, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

/** 작은 동그라미 장식 */
export function Dot({ x, y, r = 3, tone = "coral" }: { x: number; y: number; r?: number; tone?: Tone }) {
  return <circle cx={x} cy={y} r={r} className={TONE[tone]} />;
}

type Mood = "happy" | "calm" | "sad" | "wow" | "grin";
const SKIN = { 1: "fill-skin-1", 2: "fill-skin-2", 3: "fill-skin-3" } as const;

/** 사람 한 명. (x, y)는 머리 중심, 어깨 아래는 y+50까지 그려요. */
export function Person({
  x,
  y,
  body = "primary",
  skin = 1,
  hair = "short",
  mood = "happy",
  arm,
  scale = 1,
}: {
  x: number;
  y: number;
  body?: Tone;
  skin?: 1 | 2 | 3;
  hair?: "short" | "long" | "bun" | "curly";
  mood?: Mood;
  arm?: "up" | "wave" | "point";
  scale?: number;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      {hair === "long" && <path d="M-15 0 q-2 22 4 30 h22 q6 -8 4 -30 z" className="fill-hair" />}
      {/* 몸: 둥근 어깨 */}
      <path d="M-21 50 v-12 q0 -22 21 -22 q21 0 21 22 v12 z" className={TONE[body]} />
      <path d="M-6 16.5 q6 6 12 0" className="fill-none stroke-surface/60" strokeWidth={2} />
      {/* 팔 */}
      {arm === "up" && (
        <g>
          <path d="M14 24 Q26 10 24 -12" className={cn("fill-none", STROKE[body])} strokeWidth={9} />
          <circle cx={24} cy={-15} r={5} className={SKIN[skin]} />
        </g>
      )}
      {arm === "wave" && (
        <motion.g style={{ transformBox: "fill-box", transformOrigin: "0% 100%" }} animate={{ rotate: [0, -14, 0, -14, 0] }} transition={{ duration: 1.6, repeat: Infinity, repeatDelay: 1.6 }}>
          <path d="M14 26 Q30 18 30 -2" className={cn("fill-none", STROKE[body])} strokeWidth={9} />
          <circle cx={30} cy={-6} r={5} className={SKIN[skin]} />
        </motion.g>
      )}
      {arm === "point" && (
        <g>
          <path d="M14 26 Q30 22 40 12" className={cn("fill-none", STROKE[body])} strokeWidth={9} />
          <circle cx={42} cy={10} r={5} className={SKIN[skin]} />
        </g>
      )}
      {/* 머리 */}
      <circle r={14} className={SKIN[skin]} />
      {hair === "short" && <path d="M-14 -1 q-1 -16 14 -16 q15 0 14 16 q-5 -8 -14 -8 q-6 0 -10 4 q-2 -3 -4 4 z" className="fill-hair" />}
      {hair === "long" && <path d="M-15 2 q-1 -18 15 -18 q16 0 15 18 q-4 -10 -15 -10 q-11 0 -15 10 z" className="fill-hair" />}
      {hair === "bun" && (
        <g className="fill-hair">
          <circle cy={-17} r={6} />
          <path d="M-14 -1 q-1 -15 14 -15 q15 0 14 15 q-6 -7 -14 -7 q-8 0 -14 7 z" />
        </g>
      )}
      {hair === "curly" && (
        <g className="fill-hair">
          <circle cx={-9} cy={-9} r={7} />
          <circle cx={0} cy={-13} r={7.5} />
          <circle cx={9} cy={-9} r={7} />
        </g>
      )}
      {/* 얼굴 */}
      <circle cx={-5} cy={2} r={1.7} className="fill-ink" />
      <circle cx={5} cy={2} r={1.7} className="fill-ink" />
      <circle cx={-9} cy={7} r={2.6} className="fill-coral/35" />
      <circle cx={9} cy={7} r={2.6} className="fill-coral/35" />
      <g className="fill-none stroke-ink" strokeWidth={1.7}>
        {mood === "happy" && <path d="M-3.5 7 q3.5 3 7 0" />}
        {mood === "calm" && <path d="M-2.5 8 h5" />}
        {mood === "sad" && <path d="M-3.5 9 q3.5 -3 7 0" />}
      </g>
      {mood === "wow" && <ellipse cy={8.5} rx={2} ry={2.4} className="fill-ink" />}
      {mood === "grin" && <path d="M-4.5 6 h9 q0 5 -4.5 5 q-4.5 0 -4.5 -5 z" className="fill-ink" />}
    </g>
  );
}

/** 말풍선. 꼬리는 왼쪽 아래 또는 오른쪽 아래로 나요. */
export function Bubble({
  x,
  y,
  w = 40,
  h = 28,
  tail = "left",
  tone = "surface",
  children,
}: {
  x: number;
  y: number;
  w?: number;
  h?: number;
  tail?: "left" | "right";
  tone?: Tone | "surface";
  children?: React.ReactNode;
}) {
  const r = Math.min(10, h / 2);
  const tx = tail === "left" ? x + 12 : x + w - 12;
  const d =
    tail === "left"
      ? `M${x + r} ${y} h${w - 2 * r} q${r} 0 ${r} ${r} v${h - 2 * r} q0 ${r} -${r} ${r} H${tx + 8} l-9 7 q-2 1 -2 -1 l0 -6 H${x + r} q-${r} 0 -${r} -${r} v-${h - 2 * r} q0 -${r} ${r} -${r}z`
      : `M${x + r} ${y} h${w - 2 * r} q${r} 0 ${r} ${r} v${h - 2 * r} q0 ${r} -${r} ${r} H${tx} l0 6 q0 2 -2 1 l-9 -7 H${x + r} q-${r} 0 -${r} -${r} v-${h - 2 * r} q0 -${r} ${r} -${r}z`;
  return (
    <g>
      <path d={d} className={tone === "surface" ? "fill-surface" : TONE[tone]} />
      {children}
    </g>
  );
}

/** 포스트잇. 살짝 기울어져 붙어 있어요. */
export function Sticky({ x, y, size = 34, rotate = -4, tone = "sun", lines = 2 }: { x: number; y: number; size?: number; rotate?: number; tone?: Tone; lines?: number }) {
  return (
    <g transform={`rotate(${rotate} ${x + size / 2} ${y + size / 2})`}>
      <rect x={x} y={y} width={size} height={size} rx={4} className={TONE[tone]} />
      <rect x={x + size / 2 - 8} y={y - 4} width={16} height={8} rx={2} className="fill-surface/70" />
      {Array.from({ length: lines }, (_, i) => (
        <path key={i} d={`M${x + 8} ${y + 12 + i * 8} h${size - 16 - i * 6}`} className="stroke-ink/25" strokeWidth={3} />
      ))}
    </g>
  );
}

/** 칠판·화면 (흰 판 + 회색 받침). */
export function Board({ x, y, w, h, children }: { x: number; y: number; w: number; h: number; children?: React.ReactNode }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={10} className="fill-hair" />
      <rect x={x + 6} y={y + 6} width={w - 12} height={h - 12} rx={6} className="fill-surface" />
      {children}
    </g>
  );
}

/** 바닥 그림자 */
export function Shadow({ cx, cy, rx }: { cx: number; cy: number; rx: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={rx * 0.12} className="fill-ink/8" />;
}

/** 아이콘 모양 체크·하트·물음표 (말풍선 안에 넣어요) */
export function Glyph({ kind, x, y, className }: { kind: "check" | "heart" | "question" | "dots" | "plus"; x: number; y: number; className?: string }) {
  if (kind === "heart")
    return <path transform={`translate(${x} ${y})`} d="M0 6 l-7 -7 q-3 -4 1 -7 q4 -2 6 2 q2 -4 6 -2 q4 3 1 7 z" className={cn("fill-surface", className)} />;
  if (kind === "dots")
    return (
      <g className={cn("fill-ink/50", className)}>
        <circle cx={x - 8} cy={y} r={2.4} />
        <circle cx={x} cy={y} r={2.4} />
        <circle cx={x + 8} cy={y} r={2.4} />
      </g>
    );
  const d = kind === "check" ? `M${x - 7} ${y} l5 5 l10 -10` : kind === "plus" ? `M${x} ${y - 7} v14 M${x - 7} ${y} h14` : `M${x - 4} ${y - 3} q0 -5 4 -5 q4 0 4 4 q0 3 -4 5 v2`;
  return (
    <g className={cn("fill-none stroke-surface", className)} strokeWidth={3.2}>
      <path d={d} />
      {kind === "question" && <circle cx={x} cy={y + 8} r={0.6} strokeWidth={3.6} />}
    </g>
  );
}
