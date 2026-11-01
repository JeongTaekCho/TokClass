"use client";

import { useEffect } from "react";
import { AnimatePresence, MotionConfig, animate, motion, useAnimationControls, useMotionValue, useReducedMotion, useTransform, type HTMLMotionProps, type Transition } from "motion/react";

/*
 * 톡클 움직임 키트 (motion 라이브러리)
 * - 움직임은 상태 변화를 설명할 때만 써요: 등장(enter), 목록 추가·삭제(presence), 현재 위치 이동(layoutId), 숫자 변화(count).
 * - transform·opacity만 움직여요. 레이아웃을 밀어내지 않아요.
 * - MotionProvider가 reducedMotion="user"라서 운영체제의 '동작 줄이기'를 켜면 위치 이동 없이 바로 바뀌어요.
 */

export { AnimatePresence, motion, useAnimationControls };

export const spring: Transition = { type: "spring", stiffness: 420, damping: 34, mass: 0.8 };
export const springSoft: Transition = { type: "spring", stiffness: 260, damping: 26 };
export const ease = [0.22, 1, 0.36, 1] as const;

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** 화면에 들어올 때 아래에서 살짝 떠올라요. */
export function FadeIn({ delay = 0, y = 12, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return <motion.div initial={{ opacity: 0, y }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease, delay }} {...props} />;
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};
const staggerItem = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease } },
};

/** 자식(StaggerItem)이 차례로 떠올라요. 카드 그리드에 써요. 목록이면 StaggerList + StaggerLi를 써요. */
export function Stagger(props: HTMLMotionProps<"div">) {
  return <motion.div variants={stagger} initial="hidden" animate="show" {...props} />;
}

export function StaggerItem(props: HTMLMotionProps<"div">) {
  return <motion.div variants={staggerItem} {...props} />;
}

export function StaggerList(props: HTMLMotionProps<"ul">) {
  return <motion.ul variants={stagger} initial="hidden" animate="show" {...props} />;
}

export function StaggerLi(props: HTMLMotionProps<"li">) {
  return <motion.li variants={staggerItem} {...props} />;
}

/** 실시간으로 추가·삭제되는 목록 항목. AnimatePresence 안에서 써요. */
export function PresenceItem(props: HTMLMotionProps<"li">) {
  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, y: 10, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.15 } }}
      transition={spring}
      {...props}
    />
  );
}

/** 숫자가 바뀌면 굴러가듯 세어요. 스크린리더에는 최종 값만 읽혀요. */
export function AnimatedNumber({ value, className, suffix = "" }: { value: number; className?: string; suffix?: string }) {
  const reduce = useReducedMotion();
  const mv = useMotionValue(value);
  const text = useTransform(mv, (v) => `${Math.round(v).toLocaleString("ko-KR")}${suffix}`);
  useEffect(() => {
    if (reduce) {
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.6, ease });
    return () => controls.stop();
  }, [value, reduce, mv]);
  return (
    <span className={className}>
      <motion.span aria-hidden>{text}</motion.span>
      <span className="sr-only">
        {value.toLocaleString("ko-KR")}
        {suffix}
      </span>
    </span>
  );
}

/** 배지·알림 점이 톡 튀어나와요. key가 바뀌면 다시 튀어요. */
export function Pop({ className, children, ...props }: HTMLMotionProps<"span">) {
  return (
    <motion.span initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 600, damping: 18 }} className={className} {...props}>
      {children}
    </motion.span>
  );
}

/** 탭·메뉴의 현재 위치 표시. 같은 layoutId끼리 미끄러지듯 옮겨 가요. */
export function ActiveIndicator({ layoutId, className }: { layoutId: string; className?: string }) {
  return <motion.span layoutId={layoutId} aria-hidden className={className} transition={spring} />;
}
