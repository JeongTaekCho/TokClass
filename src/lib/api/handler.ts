import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { ZodError, type ZodType } from "zod";

import { resolveActor, type Actor, type ActorKind } from "@/lib/auth/actor";
import { ApiError, forbidden, notFound, unauthorized } from "@/lib/api/errors";
import { isRoomOwnerBlocked } from "@/lib/rooms/lookup";
import { db } from "@/lib/supabase/admin";
import { getInstructorAccess, type InstructorAccess } from "@/lib/supabase/server";

type RouteCtx = { params?: Promise<Record<string, string | string[] | undefined>> };

export type RoomCtx<B> = {
  req: NextRequest;
  actor: Actor;
  roomId: string;
  body: B;
  params: Record<string, string>;
  search: URLSearchParams;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function errorResponse(e: unknown) {
  if (e instanceof ApiError) {
    return NextResponse.json({ error: e.message, code: e.code, ...e.extra }, { status: e.status });
  }
  if (e instanceof ZodError) {
    const first = e.issues[0];
    return NextResponse.json({ error: first?.message || "입력값을 확인해 주세요.", code: "invalid" }, { status: 400 });
  }
  console.error("[api] 처리 중 오류", e);
  return NextResponse.json({ error: "잠시 문제가 생겼어요. 다시 시도해 주세요." }, { status: 500 });
}

async function readJson(req: NextRequest) {
  if (req.method === "GET" || req.method === "HEAD") return undefined;
  const text = await req.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError(400, "요청 형식이 올바르지 않아요.");
  }
}

function flatParams(p: Record<string, string | string[] | undefined> | undefined) {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p ?? {})) if (typeof v === "string") out[k] = v;
  return out;
}

/** 방 단위 API 핸들러: 권한 확인 + zod 검증 + 친근한 에러 응답 */
export function roomHandler<B = undefined>(
  opts: { roles?: ActorKind[]; body?: ZodType<B>; allowEnded?: boolean },
  fn: (ctx: RoomCtx<B>) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    try {
      const params = flatParams(await ctx.params);
      const roomId = params.roomId;
      if (!isUuid(roomId)) throw notFound("방을 찾을 수 없어요.");
      const prefer = req.headers.get("x-tk-as") === "instructor" ? "instructor" : null;
      const actor = await resolveActor(roomId, prefer);
      if (!actor) throw unauthorized();
      if (opts.roles && !opts.roles.includes(actor.kind)) throw forbidden();
      if (actor.kind === "participant" && (await isRoomOwnerBlocked(actor.room.owner_id))) throw roomSuspended();
      const isWrite = req.method !== "GET";
      if (isWrite && actor.kind === "participant" && actor.room.status === "ended" && !opts.allowEnded) {
        throw new ApiError(409, "수업이 끝나서 더 이상 참여할 수 없어요.");
      }
      const raw = await readJson(req);
      const body = (opts.body ? opts.body.parse(raw) : undefined) as B;

      if (isWrite && actor.kind === "participant") {
        const last = new Date(actor.participant.last_active_at).getTime();
        if (Date.now() - last > 30_000) {
          await db().from("participants").update({ last_active_at: new Date().toISOString() }).eq("id", actor.participant.id);
        }
      }

      const result = await fn({ req, actor, roomId, body, params, search: req.nextUrl.searchParams });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** 방과 무관한 API 핸들러 */
export function apiHandler<B = undefined>(
  opts: { body?: ZodType<B> },
  fn: (ctx: { req: NextRequest; body: B; params: Record<string, string> }) => Promise<unknown>,
) {
  return async (req: NextRequest, ctx: RouteCtx) => {
    try {
      const params = flatParams(await ctx.params);
      const raw = await readJson(req);
      const body = (opts.body ? opts.body.parse(raw) : undefined) as B;
      const result = await fn({ req, body, params });
      if (result instanceof Response) return result;
      return NextResponse.json(result ?? { ok: true });
    } catch (e) {
      return errorResponse(e);
    }
  };
}

type InstructorCtx<B> = { req: NextRequest; body: B; params: Record<string, string>; access: InstructorAccess };

/** 승인된 강사만 쓰는 API (방과 무관). 승인 전·거절·정지 상태면 403 */
export function instructorHandler<B = undefined>(opts: { body?: ZodType<B> }, fn: (ctx: InstructorCtx<B>) => Promise<unknown>) {
  return apiHandler(opts, async (ctx) => {
    const access = await getInstructorAccess();
    if (!access) throw unauthorized("로그인이 필요해요.");
    if (access.profile.status !== "approved") throw new ApiError(403, "관리자 승인 후 이용할 수 있어요.", "not_approved");
    return fn({ ...ctx, access });
  });
}

/** 관리자 API: 승인된 강사 + is_admin */
export function adminHandler<B = undefined>(opts: { body?: ZodType<B> }, fn: (ctx: InstructorCtx<B>) => Promise<unknown>) {
  return instructorHandler(opts, async (ctx) => {
    if (!ctx.access.profile.isAdmin) throw forbidden("관리자만 할 수 있어요.");
    return fn(ctx);
  });
}

export const roomSuspended = () => new ApiError(403, "지금은 이 수업에 들어갈 수 없어요. 강사님께 문의해 주세요.", "room_suspended");

/** Supabase 에러를 던지기 */
export function must<T>(res: { data: T; error: unknown }): T {
  if (res.error) throw res.error;
  return res.data;
}
