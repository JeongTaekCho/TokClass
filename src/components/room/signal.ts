import type { UnderstandingStatus } from "@/lib/types";

/** 이해도 신호등: 색만으로 구분하지 않도록 이모지·텍스트를 함께 써요. */
export const SIGNALS: { status: UnderstandingStatus; emoji: string; label: string; short: string; color: string; soft: string }[] = [
  { status: "green", emoji: "🟢", label: "이해했어요", short: "이해", color: "bg-signal-green", soft: "bg-green-50 text-green-800 border-green-300" },
  { status: "yellow", emoji: "🟡", label: "헷갈려요", short: "헷갈림", color: "bg-signal-yellow", soft: "bg-yellow-50 text-yellow-900 border-yellow-300" },
  { status: "red", emoji: "🔴", label: "막혔어요", short: "막힘", color: "bg-signal-red", soft: "bg-red-50 text-red-800 border-red-300" },
];
