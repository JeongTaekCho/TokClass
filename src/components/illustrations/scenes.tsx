"use client";

import { motion } from "motion/react";

import { cn } from "@/lib/utils";

import { Blob, Board, Bubble, Dot, Float, Glyph, Illustration, Person, Shadow, Sparkle, Sticky, type IllustrationProps } from "./parts";

/* 빈 상태·안내 화면용 장면. 모두 viewBox 240×180 기준이에요. */

/** 아직 만든 방이 없어요: 빈 칠판 앞에서 + 포스트잇을 들고 있는 강사 */
export function EmptyRoomsArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={92} r={82} tone="primary" />
      <Board x={40} y={30} w={120} h={84}>
        <rect x={56} y={48} width={52} height={8} rx={4} className="fill-primary/25" />
        <rect x={56} y={64} width={36} height={8} rx={4} className="fill-sunken" />
        <rect x={56} y={80} width={44} height={8} rx={4} className="fill-sunken" />
      </Board>
      <path d="M86 114 l-8 36 M114 114 l8 36" className="stroke-hair" strokeWidth={5} />
      <Shadow cx={170} cy={156} rx={38} />
      <Person x={172} y={104} body="coral" skin={2} hair="bun" arm="up" />
      <Float delay={0.3}>
        <g transform="rotate(10 196 70)">
          <rect x={182} y={56} width={30} height={30} rx={6} className="fill-sun" />
          <Glyph kind="plus" x={197} y={71} className="stroke-ink" />
        </g>
      </Float>
      <Sparkle x={30} y={40} size={7} tone="sun" />
      <Sparkle x={210} y={36} size={6} tone="primary" delay={0.8} />
      <Dot x={28} y={120} r={4} tone="mint" />
    </Illustration>
  );
}

/** 슬라이드를 올려 주세요: 화면 위로 올라가는 문서 */
export function UploadSlidesArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={94} r={80} tone="sky" />
      <Board x={46} y={44} w={148} h={96}>
        <rect x={60} y={58} width={120} height={68} rx={4} className="fill-sky-soft" />
      </Board>
      <path d="M120 140 v20 M100 162 h40" className="stroke-hair" strokeWidth={5} />
      <Float distance={8}>
        <g>
          <rect x={98} y={22} width={44} height={56} rx={6} className="fill-surface" />
          <path d="M98 30 q0 -8 8 -8 h22 l14 14 v6 h-44 z" className="fill-coral" />
          <text x={120} y={36} textAnchor="middle" className="fill-surface text-[11px] font-bold">PDF</text>
          <rect x={106} y={50} width={28} height={5} rx={2.5} className="fill-sunken" />
          <rect x={106} y={60} width={20} height={5} rx={2.5} className="fill-sunken" />
        </g>
      </Float>
      <g className="fill-none stroke-primary" strokeWidth={4}>
        <path d="M120 116 v-26 M110 100 l10 -10 l10 10" />
      </g>
      <Sparkle x={196} y={34} size={7} tone="sun" />
      <Sparkle x={42} y={30} size={5} tone="coral" delay={1} />
    </Illustration>
  );
}

/** 아직 들어온 수강생이 없어요: 빈 의자 세 개와 기다리는 말풍선 */
export function NoStudentsArt(props: IllustrationProps) {
  const chairs = [
    { x: 40, fill: "fill-mint" },
    { x: 98, fill: "fill-sun" },
    { x: 156, fill: "fill-lilac" },
  ];
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={100} r={80} tone="sky" />
      {chairs.map((c) => (
        <g key={c.x}>
          <rect x={c.x} y={86} width={44} height={40} rx={10} className={c.fill} />
          <rect x={c.x - 4} y={118} width={52} height={14} rx={7} className={c.fill} />
          <rect x={c.x - 4} y={118} width={52} height={5} rx={2.5} className="fill-surface/40" />
          <path d={`M${c.x + 4} 132 v22 M${c.x + 40} 132 v22`} className="stroke-hair" strokeWidth={4} />
        </g>
      ))}
      <Float>
        <Bubble x={140} y={30} w={58} h={34} tone="primary" tail="left">
          <g className="fill-surface">
            <motion.circle cx={157} cy={47} r={3} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
            <motion.circle cx={169} cy={47} r={3} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
            <motion.circle cx={181} cy={47} r={3} animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }} />
          </g>
        </Bubble>
      </Float>
      <Sparkle x={42} y={44} size={7} tone="sun" />
      <Dot x={214} y={96} r={4} tone="coral" />
    </Illustration>
  );
}

/** 검색 결과가 없어요: 카드 더미 위를 맴도는 돋보기 */
export function NoResultsArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={96} r={78} tone="lilac" />
      <g transform="rotate(-8 92 108)">
        <rect x={56} y={80} width={72} height={56} rx={10} className="fill-surface" />
        <rect x={68} y={94} width={40} height={7} rx={3.5} className="fill-lilac-soft" />
        <rect x={68} y={108} width={28} height={7} rx={3.5} className="fill-sunken" />
      </g>
      <g transform="rotate(6 140 116)">
        <rect x={104} y={92} width={72} height={56} rx={10} className="fill-surface" />
        <rect x={116} y={106} width={44} height={7} rx={3.5} className="fill-primary-soft" />
        <rect x={116} y={120} width={30} height={7} rx={3.5} className="fill-sunken" />
      </g>
      <motion.g animate={{ x: [0, -14, 0], y: [0, 6, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}>
        <path d="M168 76 l22 22" className="stroke-hair" strokeWidth={10} />
        <circle cx={150} cy={58} r={26} className="fill-primary" />
        <circle cx={150} cy={58} r={18} className="fill-surface" />
        <path d="M140 50 q5 -6 12 -4" className="fill-none stroke-primary/30" strokeWidth={4} />
      </motion.g>
      <Sparkle x={46} y={48} size={7} tone="sun" />
      <Dot x={206} y={140} r={4} tone="mint" />
    </Illustration>
  );
}

/** 승인을 기다리고 있어요: 차 한 잔 들고 편지를 기다리는 사람 */
export function PendingArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={96} r={80} tone="sun" />
      <Shadow cx={96} cy={158} rx={46} />
      <rect x={60} y={124} width={74} height={30} rx={10} className="fill-sky" />
      <Person x={96} y={86} body="primary" skin={1} hair="short" mood="calm" />
      <g>
        <rect x={116} y={112} width={18} height={18} rx={4} className="fill-surface" />
        <path d="M134 116 q7 0 7 5 q0 5 -7 5" className="fill-none stroke-surface" strokeWidth={3} />
        <motion.path d="M121 106 q3 -5 0 -10 M128 106 q3 -5 0 -10" className="fill-none stroke-ink/30" strokeWidth={2.4} animate={{ y: [0, -4, 0], opacity: [0.2, 0.8, 0.2] }} transition={{ duration: 2.6, repeat: Infinity }} />
      </g>
      <Float distance={8} delay={0.4}>
        <g transform="rotate(-8 180 52)">
          <rect x={152} y={34} width={56} height={38} rx={6} className="fill-coral" />
          <path d="M154 38 l26 18 l26 -18" className="fill-none stroke-surface" strokeWidth={3} />
        </g>
      </Float>
      <g className="fill-surface">
        <circle cx={196} cy={120} r={16} />
      </g>
      <circle cx={196} cy={120} r={16} className="fill-none stroke-primary" strokeWidth={3} />
      <path d="M196 120 v-9 M196 120 h6" className="stroke-primary" strokeWidth={3} />
      <Sparkle x={36} y={50} size={6} tone="coral" />
    </Illustration>
  );
}

/** 가입이 거절됐거나 정지됐어요: 닫힌 문. 정지면 자물쇠가 걸려요. */
export function ClosedDoorArt({ locked = false, ...props }: IllustrationProps & { locked?: boolean }) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={124} cy={96} r={80} tone="coral" />
      <rect x={96} y={28} width={84} height={132} rx={10} className="fill-hair" />
      <rect x={104} y={36} width={68} height={124} rx={6} className="fill-primary" />
      <rect x={114} y={48} width={48} height={40} rx={4} className="fill-surface/15" />
      <circle cx={160} cy={104} r={4} className="fill-sun" />
      <Float distance={4}>
        <g transform="rotate(-6 138 64)">
          <rect x={116} y={54} width={44} height={20} rx={4} className="fill-sun" />
          <rect x={124} y={62} width={28} height={4} rx={2} className="fill-ink/40" />
        </g>
      </Float>
      {locked && (
        <motion.g initial={{ rotate: -10 }} animate={{ rotate: [-10, 8, -10] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
          <path d="M150 112 v-8 q0 -10 10 -10 q10 0 10 10 v8" className="fill-none stroke-hair" strokeWidth={5} />
          <rect x={144} y={110} width={32} height={26} rx={6} className="fill-coral" />
          <circle cx={160} cy={122} r={3} className="fill-ink" />
        </motion.g>
      )}
      <Shadow cx={62} cy={160} rx={30} />
      <Person x={62} y={112} body="mint" skin={3} hair="curly" mood="calm" scale={0.9} />
      <Sparkle x={206} y={40} size={6} tone="sun" />
    </Illustration>
  );
}

/** 수업이 끝났어요: 체크가 그려진 칠판과 손 흔드는 강사 */
export function ClassEndedArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={96} r={80} tone="mint" />
      <Board x={28} y={32} w={120} h={84}>
        <motion.path d="M66 76 l14 14 l28 -30" className="fill-none stroke-mint" strokeWidth={8} initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.3 }} />
      </Board>
      <path d="M74 116 l-6 34 M102 116 l6 34" className="stroke-hair" strokeWidth={5} />
      <Shadow cx={186} cy={156} rx={34} />
      <Person x={186} y={104} body="coral" skin={2} hair="long" arm="wave" mood="grin" />
      {[
        { x: 164, y: 40, c: "fill-sun", d: 0 },
        { x: 204, y: 52, c: "fill-primary", d: 0.4 },
        { x: 180, y: 24, c: "fill-coral", d: 0.8 },
        { x: 220, y: 30, c: "fill-mint", d: 1.2 },
      ].map((p) => (
        <motion.rect key={p.x} x={p.x} y={p.y} width={8} height={5} rx={1.5} className={p.c} style={{ transformBox: "fill-box", transformOrigin: "center" }} animate={{ y: [0, 10, 0], rotate: [0, 90, 180] }} transition={{ duration: 3, delay: p.d, repeat: Infinity, ease: "easeInOut" }} />
      ))}
    </Illustration>
  );
}

/** 연결이 끊겼어요: 빠진 플러그 (다른 기기·강퇴·재발급·로그아웃 공통) */
export function UnpluggedArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={92} r={80} tone="coral" />
      <path d="M14 100 h40" className="stroke-hair" strokeWidth={6} />
      <motion.g animate={{ x: [0, -4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <rect x={50} y={80} width={46} height={40} rx={10} className="fill-surface" />
        <path d="M96 92 h14 M96 108 h14" className="stroke-hair" strokeWidth={5} />
      </motion.g>
      <motion.g animate={{ x: [0, 4, 0] }} transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}>
        <rect x={142} y={80} width={46} height={40} rx={10} className="fill-primary" />
        <circle cx={160} cy={96} r={2.4} className="fill-surface" />
        <circle cx={170} cy={96} r={2.4} className="fill-surface" />
        <path d="M159 106 q6 -4 12 0" className="fill-none stroke-surface" strokeWidth={2} />
        <path d="M188 100 q22 0 22 24 v14 q0 18 26 18" className="fill-none stroke-hair" strokeWidth={6} />
      </motion.g>
      <g className="fill-none stroke-sun" strokeWidth={4}>
        <motion.path d="M122 66 l-4 -12 M128 134 l4 12 M112 100 h-0" animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.2, repeat: Infinity }} />
      </g>
      <Sparkle x={124} y={100} size={9} tone="sun" />
    </Illustration>
  );
}

/** 페이지를 찾을 수 없어요: 칠판에서 떨어진 물음표 포스트잇 */
export function NotFoundArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={94} r={82} tone="primary" />
      <Board x={36} y={22} w={168} h={88}>
        <Sticky x={54} y={40} size={32} rotate={-6} tone="mint" lines={2} />
        <Sticky x={152} y={42} size={32} rotate={5} tone="sky" lines={2} />
        <rect x={104} y={42} width={32} height={32} rx={4} strokeDasharray="4 5" className="stroke-border-strong" strokeWidth={2} />
      </Board>
      <motion.g animate={{ rotate: [12, 22, 12], y: [0, 4, 0] }} transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }} style={{ transformBox: "fill-box", transformOrigin: "center" }}>
        <rect x={130} y={118} width={40} height={40} rx={6} className="fill-coral" />
        <Glyph kind="question" x={150} y={136} />
      </motion.g>
      <Shadow cx={64} cy={162} rx={28} />
      <Person x={64} y={116} body="sun" skin={1} hair="short" mood="wow" scale={0.9} />
      <Sparkle x={212} y={130} size={6} tone="sun" delay={0.6} />
    </Illustration>
  );
}

/** 잠시 문제가 생겼어요: 엉킨 말풍선 */
export function ErrorArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={94} r={80} tone="coral" />
      <Float>
        <Bubble x={46} y={38} w={92} h={58} tone="surface" tail="left">
          <path d="M62 68 q8 -16 16 0 t16 0 t16 0 t16 0" className="fill-none stroke-coral" strokeWidth={4} />
        </Bubble>
      </Float>
      <Float delay={0.8}>
        <Bubble x={112} y={86} w={82} h={50} tone="primary" tail="right">
          <path d="M130 112 l7 -7 l7 7 l7 -7 l7 7 l7 -7 l7 7" className="fill-none stroke-surface" strokeWidth={4} />
        </Bubble>
      </Float>
      <Sparkle x={206} y={46} size={7} tone="sun" />
      <Dot x={40} y={140} r={4} tone="mint" />
    </Illustration>
  );
}

/** 채팅이 비어 있어요: 처음 말을 거는 말풍선 */
export function ChatEmptyArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={92} r={76} tone="coral" />
      <Float>
        <Bubble x={52} y={44} w={86} h={44} tone="surface" tail="left">
          <rect x={66} y={58} width={46} height={7} rx={3.5} className="fill-sunken" />
          <rect x={66} y={70} width={30} height={7} rx={3.5} className="fill-sunken" />
        </Bubble>
      </Float>
      <Float delay={0.9}>
        <Bubble x={108} y={98} w={76} h={40} tone="coral" tail="right">
          <Glyph kind="heart" x={146} y={122} />
        </Bubble>
      </Float>
      <Sparkle x={192} y={52} size={8} tone="sun" />
      <Sparkle x={44} y={128} size={5} tone="primary" delay={1} />
    </Illustration>
  );
}

/** 질문이 없어요: 손 든 수강생과 물음표 말풍선 */
export function QaEmptyArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={96} r={78} tone="sun" />
      <Shadow cx={104} cy={160} rx={32} />
      <Person x={104} y={110} body="primary" skin={3} hair="curly" arm="up" mood="happy" />
      <Float>
        <Bubble x={140} y={38} w={50} h={42} tone="coral" tail="left">
          <Glyph kind="question" x={165} y={56} />
        </Bubble>
      </Float>
      <Sparkle x={52} y={54} size={7} tone="primary" />
      <Dot x={196} y={122} r={4} tone="mint" />
    </Illustration>
  );
}

/** 산출물 게시판이 비어 있어요: 포스트잇이 붙기를 기다리는 벽 */
export function BoardEmptyArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={94} r={80} tone="mint" />
      <rect x={40} y={32} width={160} height={110} rx={12} className="fill-surface stroke-border" strokeWidth={3} />
      <Sticky x={58} y={50} size={36} rotate={-6} tone="sun" lines={2} />
      <Sticky x={104} y={56} size={36} rotate={4} tone="sky" lines={2} />
      <rect x={150} y={50} width={36} height={36} rx={4} strokeDasharray="4 5" className="stroke-border-strong" strokeWidth={2} />
      <Float distance={10} delay={0.3}>
        <g transform="rotate(8 168 118)">
          <rect x={150} y={100} width={36} height={36} rx={4} className="fill-coral" />
          <Glyph kind="plus" x={168} y={118} />
        </g>
      </Float>
      <Sparkle x={30} y={140} size={6} tone="sun" />
    </Illustration>
  );
}

/** 자료실이 비어 있어요: 열린 폴더 */
export function ResourcesEmptyArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={96} r={78} tone="sky" />
      <path d="M58 60 q0 -8 8 -8 h30 l10 10 h68 q8 0 8 8 v68 q0 8 -8 8 h-108 q-8 0 -8 -8 z" className="fill-primary" />
      <Float distance={8}>
        <rect x={80} y={44} width={58} height={70} rx={6} className="fill-surface" transform="rotate(-6 109 79)" />
        <rect x={110} y={40} width={58} height={70} rx={6} className="fill-sun-soft" transform="rotate(6 139 75)" />
      </Float>
      <path d="M52 86 q0 -8 8 -8 h120 q8 0 8 8 l-6 52 q-1 8 -9 8 h-106 q-8 0 -9 -8 z" className="fill-sky" />
      <rect x={104} y={102} width={32} height={6} rx={3} className="fill-surface/60" />
      <Sparkle x={196} y={40} size={7} tone="sun" />
    </Illustration>
  );
}

/** 로그인·가입: 노트북 앞에서 수업을 준비하는 강사 */
export function TeacherDeskArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 320 260" {...props}>
      <Blob cx={160} cy={136} r={116} tone="primary" />
      <Shadow cx={160} cy={232} rx={92} />
      <Person x={150} y={120} body="coral" skin={2} hair="bun" mood="happy" scale={1.5} />
      <rect x={70} y={190} width={180} height={14} rx={7} className="fill-hair" />
      <path d="M90 204 v28 M230 204 v28" className="stroke-hair" strokeWidth={6} />
      <path d="M112 190 l10 -46 q1 -6 7 -6 h58 q6 0 7 6 l10 46 z" className="fill-sunken stroke-border-strong" strokeWidth={2} />
      <circle cx={158} cy={166} r={7} className="fill-primary-soft" />
      <Float>
        <Bubble x={34} y={46} w={70} h={42} tone="surface" tail="right">
          <rect x={48} y={60} width={34} height={6} rx={3} className="fill-primary/30" />
          <rect x={48} y={70} width={22} height={6} rx={3} className="fill-sunken" />
        </Bubble>
      </Float>
      <Float delay={0.7}>
        <Bubble x={222} y={60} w={58} h={40} tone="mint" tail="left">
          <Glyph kind="check" x={251} y={80} />
        </Bubble>
      </Float>
      <Float delay={1.4} distance={5}>
        <Bubble x={236} y={130} w={46} h={34} tone="coral" tail="left">
          <Glyph kind="heart" x={259} y={150} />
        </Bubble>
      </Float>
      <Sparkle x={52} y={140} size={8} tone="sun" />
      <Sparkle x={270} y={30} size={6} tone="coral" delay={0.9} />
    </Illustration>
  );
}

/** 수강생 입장: 휴대폰 속 참여코드와 손 흔드는 수강생 */
export function JoinPhoneArt(props: IllustrationProps) {
  return (
    <Illustration viewBox="0 0 240 180" {...props}>
      <Blob cx={120} cy={94} r={80} tone="coral" />
      <Float distance={5}>
        <g transform="rotate(-6 92 90)">
          <rect x={62} y={30} width={62} height={118} rx={14} className="fill-hair" />
          <rect x={68} y={40} width={50} height={98} rx={8} className="fill-surface" />
          {[1, 2, 3].map((n, i) => (
            <g key={n}>
              <rect x={73 + i * 14} y={74} width={11} height={16} rx={3} className="fill-primary-soft" />
              <text x={78.5 + i * 14} y={86} textAnchor="middle" className="fill-primary text-[10px] font-bold">
                {n}
              </text>
            </g>
          ))}
          <rect x={74} y={104} width={38} height={12} rx={6} className="fill-primary" />
        </g>
      </Float>
      <Shadow cx={170} cy={160} rx={30} />
      <Person x={170} y={112} body="sky" skin={1} hair="long" arm="wave" mood="grin" scale={0.95} />
      <Sparkle x={196} y={42} size={8} tone="sun" />
      <Dot x={40} y={130} r={4} tone="mint" />
    </Illustration>
  );
}

/**
 * 랜딩 히어로: 강사가 칠판 앞에서 설명하고, 수강생들의 반응이 차례로 떠올라요.
 * 반응은 motion으로 차례대로 떠오르고, 움직임 줄이기 설정에서는 멈춘 채로 다 보여요.
 */
export function ClassroomHeroArt({ className, title }: IllustrationProps) {
  const pop = (delay: number) => ({
    initial: { opacity: 0, y: 12, scale: 0.8 },
    animate: { opacity: [0, 1, 1, 0], y: [12, 0, 0, -8], scale: [0.8, 1, 1, 0.95] },
    transition: { duration: 5, times: [0, 0.12, 0.85, 1], delay, repeat: Infinity, repeatDelay: 0.6 },
    style: { transformBox: "fill-box" as const, transformOrigin: "50% 100%" },
  });
  return (
    <Illustration viewBox="0 0 480 360" className={cn("max-w-none", className)} title={title}>
      <Blob cx={250} cy={190} r={170} tone="primary" />
      <circle cx={420} cy={70} r={34} className="fill-sun-soft" />

      {/* 칠판과 슬라이드 */}
      <Board x={62} y={40} w={236} h={150}>
        <rect x={80} y={58} width={108} height={70} rx={6} className="fill-sky-soft" />
        <path d="M92 112 l22 -22 l16 14 l24 -28 l22 20" className="fill-none stroke-sky" strokeWidth={5} />
        <rect x={204} y={60} width={72} height={8} rx={4} className="fill-primary/25" />
        <rect x={204} y={76} width={50} height={8} rx={4} className="fill-sunken" />
        {/* 이해도 바: 초록·노랑·빨강 비율 */}
        <rect x={204} y={100} width={76} height={14} rx={7} className="fill-sunken" />
        <motion.g initial={{ scaleX: 0.3 }} animate={{ scaleX: [0.3, 1, 1, 0.3] }} transition={{ duration: 8, times: [0, 0.3, 0.85, 1], repeat: Infinity }} style={{ transformBox: "fill-box", transformOrigin: "0% 50%" }}>
          <rect x={204} y={100} width={50} height={14} rx={7} className="fill-signal-green" />
        </motion.g>
        <rect x={204} y={140} width={66} height={30} rx={8} className="fill-primary" />
        <rect x={214} y={152} width={46} height={6} rx={3} className="fill-surface/70" />
        <rect x={80} y={140} width={108} height={30} rx={8} className="fill-sunken" />
      </Board>
      <path d="M150 190 l-12 130 M210 190 l12 130" className="stroke-hair" strokeWidth={6} />

      {/* 강사 */}
      <Shadow cx={64} cy={324} rx={40} />
      <Person x={64} y={258} body="coral" skin={2} hair="bun" arm="point" scale={1.35} />

      {/* 수강생과 책상 */}
      <Person x={330} y={248} body="primary" skin={1} hair="short" />
      <Person x={388} y={244} body="sun" skin={3} hair="curly" mood="wow" />
      <Person x={446} y={248} body="mint" skin={2} hair="long" mood="grin" />
      <rect x={300} y={286} width={176} height={14} rx={7} className="fill-hair" />
      <path d="M318 300 v24 M458 300 v24" className="stroke-hair" strokeWidth={6} />

      {/* 반응: 질문, 공감, 이해 */}
      <motion.g {...pop(0)}>
        <Bubble x={304} y={170} w={48} h={36} tone="coral" tail="left">
          <Glyph kind="question" x={328} y={186} />
        </Bubble>
      </motion.g>
      <motion.g {...pop(1.3)}>
        <Bubble x={362} y={152} w={50} h={38} tone="surface" tail="left">
          <Glyph kind="heart" x={387} y={176} className="fill-coral" />
        </Bubble>
      </motion.g>
      <motion.g {...pop(2.6)}>
        <Bubble x={418} y={170} w={50} h={36} tone="mint" tail="right">
          <Glyph kind="check" x={443} y={188} />
        </Bubble>
      </motion.g>
      <Sparkle x={34} y={60} size={10} tone="sun" />
      <Sparkle x={340} y={60} size={7} tone="coral" delay={0.8} />
      <Sparkle x={460} y={130} size={6} tone="primary" delay={1.6} />
      <Dot x={30} y={190} r={5} tone="mint" />
    </Illustration>
  );
}
