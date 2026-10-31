import "server-only";

import { must } from "@/lib/api/handler";
import { db } from "@/lib/supabase/admin";
import type { InstructorAccess } from "@/lib/supabase/server";

export type AuditAction =
  | "instructor.approve"
  | "instructor.reject"
  | "instructor.suspend"
  | "instructor.unsuspend"
  | "instructor.grant_admin"
  | "instructor.revoke_admin"
  | "room.end"
  | "room.delete";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  "instructor.approve": "강사 승인",
  "instructor.reject": "강사 거절",
  "instructor.suspend": "강사 정지",
  "instructor.unsuspend": "정지 해제",
  "instructor.grant_admin": "관리자 지정",
  "instructor.revoke_admin": "관리자 회수",
  "room.end": "방 강제 종료",
  "room.delete": "방 삭제",
};

export type AuditLog = {
  id: number;
  actor_id: string | null;
  actor_email: string;
  action: AuditAction;
  target_type: "instructor" | "room";
  target_id: string;
  target_label: string;
  reason: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

/** 관리자 작업 기록. 실패하면 요청도 실패로 돌려서 기록 없는 작업이 조용히 지나가지 않게 해요. */
export async function writeAudit(
  actor: InstructorAccess,
  entry: { action: AuditAction; targetType: "instructor" | "room"; targetId: string; targetLabel: string; reason?: string | null; meta?: Record<string, unknown> },
) {
  must(
    await db()
      .from("admin_audit_logs")
      .insert({
        actor_id: actor.user.id,
        actor_email: actor.profile.email || actor.user.email || "",
        action: entry.action,
        target_type: entry.targetType,
        target_id: entry.targetId,
        target_label: entry.targetLabel.slice(0, 200),
        reason: entry.reason ?? null,
        meta: entry.meta ?? {},
      }),
  );
}

export async function countAdmins() {
  const { count, error } = await db().from("instructor_profiles").select("user_id", { count: "exact", head: true }).eq("is_admin", true);
  if (error) throw error;
  return count ?? 0;
}

/**
 * 가입 이메일 인증 시각 (auth.users.email_confirmed_at). 프로필 테이블에 복사하지 않고 Auth 관리 API로 바로 읽어요.
 * ids가 적으면 한 명씩, 많으면 사용자 목록을 쪽 단위로 훑어요.
 */
export async function loadEmailConfirmedAt(ids: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (ids.length === 0) return out;
  const auth = db().auth.admin;
  if (ids.length <= 20) {
    const results = await Promise.all(ids.map((id) => auth.getUserById(id)));
    results.forEach((r, i) => {
      if (r.error) throw r.error;
      out.set(ids[i]!, r.data.user?.email_confirmed_at ?? null);
    });
    return out;
  }
  const want = new Set(ids);
  for (let page = 1; page <= 20 && out.size < want.size; page++) {
    const { data, error } = await auth.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    for (const u of data.users) if (want.has(u.id)) out.set(u.id, u.email_confirmed_at ?? null);
    if (data.users.length < 1000) break;
  }
  return out;
}
