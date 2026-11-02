import "server-only";

import { forbidden, notFound } from "@/lib/api/errors";
import { must } from "@/lib/api/handler";
import { writeAudit, type AuditAction } from "@/lib/admin/server";
import { LESSON_COLORS, type LessonColor } from "@/lib/lessons/rules";
import { broadcast } from "@/lib/realtime/server";
import { db } from "@/lib/supabase/admin";
import type { InstructorAccess } from "@/lib/supabase/server";
import type { LessonCard, LessonPack, LessonPackSummary, RoomLessonGroup } from "@/lib/types";
import type { LessonCardInput } from "@/lib/validation/lessons";

export const CARD_COLS = "id, kind, name, org, description, url, body, icon, color, category, position";

export type CardRow = {
  id: string;
  kind: "link" | "copy";
  name: string;
  org: string | null;
  description: string;
  url: string | null;
  body: string | null;
  icon: string;
  color: string;
  category: string | null;
  position: number;
  hidden?: boolean;
  group_id?: string;
  pack_id?: string;
};

type GroupRow = { id: string; source_pack_id: string | null; title: string; intro: string; categories: string[]; position: number; hidden: boolean };
type PackRow = {
  id: string;
  owner_id: string | null;
  title: string;
  intro: string;
  categories: string[];
  is_published: boolean;
  position: number;
  updated_at: string;
};

export function toLessonCard(r: CardRow): LessonCard {
  return {
    id: r.id,
    kind: r.kind,
    name: r.name,
    org: r.org,
    description: r.description,
    url: r.kind === "link" ? r.url : null,
    body: r.kind === "copy" ? r.body : null,
    icon: r.icon,
    color: (LESSON_COLORS as readonly string[]).includes(r.color) ? (r.color as LessonColor) : "slate",
    category: r.category,
    hidden: Boolean(r.hidden),
  };
}

/** 검증된 카드 입력 → DB 행 (종류에 맞지 않는 칸은 비워요) */
export function cardRow(c: LessonCardInput) {
  return {
    kind: c.kind,
    name: c.name,
    org: c.org,
    description: c.description,
    url: c.kind === "link" ? c.url : null,
    body: c.kind === "copy" ? c.body : null,
    icon: c.icon,
    color: c.color,
    category: c.category,
  };
}

/** DB 행 → 카드 입력 모양 (복사·합치기용) */
export function cardInputOf(r: CardRow): Record<string, unknown> {
  return { kind: r.kind, name: r.name, org: r.org, description: r.description, url: r.url, body: r.body, icon: r.icon, color: r.color, category: r.category };
}

// ─────────────────────────────────────────────────────────────
// 방 교안 (사본)
// ─────────────────────────────────────────────────────────────

/** 방 교안 전체. 수강생·읽기 전용은 숨긴 그룹·카드를 빼고 받아요. */
export async function listRoomLessons(roomId: string, includeHidden: boolean): Promise<RoomLessonGroup[]> {
  const d = db();
  const [gRes, cRes] = await Promise.all([
    d.from("room_lesson_groups").select("id, source_pack_id, title, intro, categories, position, hidden").eq("room_id", roomId).order("position").order("created_at"),
    d.from("room_lesson_cards").select(`${CARD_COLS}, group_id, hidden`).eq("room_id", roomId).order("position").order("created_at"),
  ]);
  const groups = must(gRes) as GroupRow[];
  const cards = must(cRes) as CardRow[];
  const byGroup = new Map<string, LessonCard[]>();
  for (const c of cards) {
    if (!includeHidden && c.hidden) continue;
    const list = byGroup.get(c.group_id!) ?? [];
    list.push(toLessonCard(c));
    byGroup.set(c.group_id!, list);
  }
  return groups
    .filter((g) => includeHidden || !g.hidden)
    .map((g) => ({ id: g.id, sourcePackId: g.source_pack_id, title: g.title, intro: g.intro, categories: g.categories ?? [], hidden: g.hidden, cards: byGroup.get(g.id) ?? [] }));
}

export async function countRoomLessons(roomId: string) {
  const d = db();
  const [g, c] = await Promise.all([
    d.from("room_lesson_groups").select("id", { count: "exact", head: true }).eq("room_id", roomId),
    d.from("room_lesson_cards").select("id", { count: "exact", head: true }).eq("room_id", roomId),
  ]);
  if (g.error) throw g.error;
  if (c.error) throw c.error;
  return { groups: g.count ?? 0, cards: c.count ?? 0 };
}

export async function loadRoomGroup(roomId: string, groupId: string) {
  const row = must(await db().from("room_lesson_groups").select("id, source_pack_id, title, intro, categories, position, hidden").eq("id", groupId).eq("room_id", roomId).maybeSingle()) as GroupRow | null;
  if (!row) throw notFound("교안 묶음을 찾을 수 없어요.");
  return row;
}

/** 맨 뒤 순서 번호 */
export async function nextPosition(table: string, column: string, value: string | null) {
  let q = db().from(table).select("position").order("position", { ascending: false }).limit(1);
  q = value === null ? q.is(column, null) : q.eq(column, value);
  const rows = must(await q) as { position: number }[];
  return rows[0] ? rows[0].position + 1 : 0;
}

/** 방 교안이 바뀌면 수강생 화면에 알리고, 강사 화면에는 전체 목록을 돌려줘요 (자료실 API와 같은 모양). */
export async function roomLessonsChanged(roomId: string) {
  await broadcast(roomId, "lesson.changed", {});
  return { groups: await listRoomLessons(roomId, true) };
}

// ─────────────────────────────────────────────────────────────
// 라이브러리 (원본)
// ─────────────────────────────────────────────────────────────

const PACK_COLS = "id, owner_id, title, intro, categories, is_published, position, updated_at";

function toPackBase(r: PackRow) {
  return { id: r.id, ownerId: r.owner_id, title: r.title, intro: r.intro, categories: r.categories ?? [], isPublished: r.is_published, hidden: false, updatedAt: r.updated_at };
}

/** 묶음 목록 + 카드 수. public은 게시된 것만 (관리자가 includeUnpublished를 주면 전부). */
export async function listPacks(scope: "mine" | "public", userId: string, includeUnpublished = false): Promise<LessonPackSummary[]> {
  let q = db().from("lesson_packs").select(`${PACK_COLS}, lesson_cards(count)`).order("position").order("created_at");
  if (scope === "mine") q = q.eq("owner_id", userId);
  else {
    q = q.is("owner_id", null);
    if (!includeUnpublished) q = q.eq("is_published", true);
  }
  const rows = must(await q) as (PackRow & { lesson_cards: { count: number }[] })[];
  return rows.map((r) => ({ ...toPackBase(r), cardCount: r.lesson_cards?.[0]?.count ?? 0 }));
}

export async function loadPackRow(packId: string) {
  return must(await db().from("lesson_packs").select(PACK_COLS).eq("id", packId).maybeSingle()) as PackRow | null;
}

export async function loadPackCards(packId: string) {
  return must(await db().from("lesson_cards").select(`${CARD_COLS}, pack_id`).eq("pack_id", packId).order("position").order("created_at")) as CardRow[];
}

export async function loadPack(packId: string): Promise<LessonPack | null> {
  const [row, cards] = await Promise.all([loadPackRow(packId), loadPackCards(packId)]);
  if (!row) return null;
  return { ...toPackBase(row), cards: cards.map(toLessonCard) };
}

/**
 * 묶음 권한
 * - read: 내 묶음, 게시된 공용 묶음 (관리자는 게시 전 공용 묶음도)
 * - write: 내 묶음, 공용 묶음은 관리자만
 * 다른 강사의 묶음은 있는지도 알려 주지 않으려고 403으로 똑같이 막아요.
 */
export async function packFor(packId: string, access: InstructorAccess, mode: "read" | "write") {
  const row = await loadPackRow(packId);
  if (!row) throw notFound("교안 묶음을 찾을 수 없어요.");
  const mine = row.owner_id === access.user.id;
  const isPublic = row.owner_id === null;
  const admin = access.profile.isAdmin;
  const ok = mine || (isPublic && (mode === "read" ? row.is_published || admin : admin));
  if (!ok) throw forbidden(isPublic ? "공용 교안은 관리자만 고칠 수 있어요." : "이 교안 묶음을 쓸 권한이 없어요.");
  return row;
}

export async function countOwnerPacks(ownerId: string | null) {
  let q = db().from("lesson_packs").select("id", { count: "exact", head: true });
  q = ownerId === null ? q.is("owner_id", null) : q.eq("owner_id", ownerId);
  const { count, error } = await q;
  if (error) throw error;
  return count ?? 0;
}

export async function countPackCards(packId: string) {
  const { count, error } = await db().from("lesson_cards").select("id", { count: "exact", head: true }).eq("pack_id", packId);
  if (error) throw error;
  return count ?? 0;
}

/** 공용 묶음 작업이면 관리자 감사 로그를 남겨요. */
export async function auditPublicPack(
  access: InstructorAccess,
  pack: { id: string; owner_id: string | null; title: string },
  action: AuditAction,
  meta?: Record<string, unknown>,
) {
  if (pack.owner_id !== null) return;
  await writeAudit(access, { action, targetType: "lesson_pack", targetId: pack.id, targetLabel: pack.title, meta });
}
