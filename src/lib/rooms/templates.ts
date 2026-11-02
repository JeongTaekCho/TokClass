export const TAB_KEYS = ["slides", "chat", "qa", "board", "resources", "lessons"] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const TAB_LABELS: Record<TabKey, string> = {
  slides: "슬라이드",
  chat: "채팅",
  qa: "Q&A",
  board: "산출물",
  resources: "자료실",
  lessons: "교안",
};

export type TabSetting = { key: TabKey; enabled: boolean };

export type GroupMode = "random" | "manual" | "choice";

export type RoomSettings = {
  tabs: TabSetting[];
  defaultTab: TabKey;
  qaRevealAuthor: boolean;
  /** 작성자 확인을 켠 시각. 이 시각 이후에 올라온 익명 질문만 강사에게 작성자가 보여요. */
  qaRevealSince: string | null;
  redThreshold: number;
  aiDailyLimit: number;
  sections: string[];
  groups: { active: boolean; mode: GroupMode };
};

export const BUILTIN_TEMPLATES = ["lecture", "practice", "workshop"] as const;
export type BuiltinTemplate = (typeof BUILTIN_TEMPLATES)[number];

export const TEMPLATE_INFO: Record<BuiltinTemplate, { name: string; description: string; tabs: TabSetting[]; defaultTab: TabKey }> = {
  lecture: {
    name: "강의형",
    description: "슬라이드 중심 강의. 슬라이드·Q&A·채팅·자료실을 켜요.",
    tabs: [
      { key: "slides", enabled: true },
      { key: "qa", enabled: true },
      { key: "chat", enabled: true },
      { key: "resources", enabled: true },
      { key: "board", enabled: false },
      { key: "lessons", enabled: false },
    ],
    defaultTab: "slides",
  },
  practice: {
    name: "실습형",
    description: "따라 하며 결과물을 공유해요. 모든 탭을 켜요.",
    tabs: [
      { key: "slides", enabled: true },
      { key: "lessons", enabled: true },
      { key: "board", enabled: true },
      { key: "chat", enabled: true },
      { key: "qa", enabled: true },
      { key: "resources", enabled: true },
    ],
    defaultTab: "slides",
  },
  workshop: {
    name: "워크숍형",
    description: "토론·아이디어 중심. 산출물 보드가 첫 화면이에요.",
    tabs: [
      { key: "board", enabled: true },
      { key: "lessons", enabled: true },
      { key: "chat", enabled: true },
      { key: "qa", enabled: true },
      { key: "slides", enabled: true },
      { key: "resources", enabled: false },
    ],
    defaultTab: "board",
  },
};

export function defaultSettings(template: BuiltinTemplate = "lecture"): RoomSettings {
  const info = TEMPLATE_INFO[template];
  return {
    tabs: info.tabs.map((t) => ({ ...t })),
    defaultTab: info.defaultTab,
    qaRevealAuthor: false,
    qaRevealSince: null,
    redThreshold: 30,
    aiDailyLimit: 20,
    sections: [],
    groups: { active: false, mode: "random" },
  };
}

/** DB에 저장된 settings(jsonb)를 안전하게 기본값과 합쳐요. */
export function normalizeSettings(raw: unknown): RoomSettings {
  const base = defaultSettings("lecture");
  if (!raw || typeof raw !== "object") return base;
  const r = raw as Partial<RoomSettings>;
  const seen = new Set<TabKey>();
  const tabs: TabSetting[] = [];
  for (const t of Array.isArray(r.tabs) ? r.tabs : []) {
    if (t && TAB_KEYS.includes(t.key as TabKey) && !seen.has(t.key)) {
      seen.add(t.key);
      tabs.push({ key: t.key, enabled: Boolean(t.enabled) });
    }
  }
  for (const key of TAB_KEYS) if (!seen.has(key)) tabs.push({ key, enabled: false });
  const enabled = tabs.filter((t) => t.enabled).map((t) => t.key);
  const defaultTab = r.defaultTab && enabled.includes(r.defaultTab) ? r.defaultTab : (enabled[0] ?? "chat");
  return {
    tabs,
    defaultTab,
    qaRevealAuthor: Boolean(r.qaRevealAuthor),
    qaRevealSince: r.qaRevealAuthor && typeof r.qaRevealSince === "string" && !Number.isNaN(Date.parse(r.qaRevealSince)) ? r.qaRevealSince : null,
    redThreshold: clampInt(r.redThreshold, 5, 100, 30),
    aiDailyLimit: clampInt(r.aiDailyLimit, 0, 200, 20),
    sections: Array.isArray(r.sections) ? [...new Set(r.sections.filter((s) => typeof s === "string"))].slice(0, 30) : [],
    groups: {
      active: Boolean(r.groups?.active),
      mode: r.groups?.mode === "manual" || r.groups?.mode === "choice" ? r.groups.mode : "random",
    },
  };
}

function clampInt(v: unknown, min: number, max: number, fallback: number) {
  const n = typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback;
  return Math.min(max, Math.max(min, n));
}

/**
 * 익명 질문 작성자를 강사에게 보여도 되는지.
 * 작성자 확인을 켠 뒤에 올라온 질문만 보여요. 켜기 전에 익명으로 올린 질문은 계속 익명이에요.
 */
export function canRevealAnonymousAuthor(settings: Pick<RoomSettings, "qaRevealAuthor" | "qaRevealSince">, questionCreatedAt: string) {
  return settings.qaRevealAuthor && settings.qaRevealSince !== null && Date.parse(questionCreatedAt) >= Date.parse(settings.qaRevealSince);
}
