import { adminHandler, isUuid, must } from "@/lib/api/handler";
import { ApiError, notFound } from "@/lib/api/errors";
import { planAdminChange, planStatusChange } from "@/lib/admin/rules";
import { countAdmins, loadEmailConfirmedAt, writeAudit, type AuditAction } from "@/lib/admin/server";
import { db } from "@/lib/supabase/admin";
import { loadInstructorProfile } from "@/lib/supabase/server";
import { instructorActionSchema } from "@/lib/validation/admin";

/**
 * 강사 관리 (관리자)
 * - approve(이메일 인증을 마친 계정만) / reject(사유) / suspend(사유) / unsuspend
 * - grant_admin / revoke_admin (자기 자신·마지막 관리자 회수 금지)
 */
export const POST = adminHandler({ body: instructorActionSchema }, async ({ params, body, access }) => {
  if (!isUuid(params.userId)) throw notFound();
  const target = await loadInstructorProfile(params.userId);
  if (!target) throw notFound("강사를 찾을 수 없어요.");
  const label = target.name ? `${target.name} (${target.email})` : target.email;
  const now = new Date().toISOString();

  if (body.action === "grant_admin" || body.action === "revoke_admin") {
    const grant = body.action === "grant_admin";
    const plan = planAdminChange({
      actorId: access.user.id,
      targetId: target.userId,
      grant,
      targetIsAdmin: target.isAdmin,
      targetStatus: target.status,
      adminCount: grant ? 0 : await countAdmins(),
    });
    if (!plan.ok) throw new ApiError(409, plan.error, "rule");
    // 동시에 회수해도 0명이 되지 않도록, 회수는 "다른 관리자가 남아 있을 때만" 조건으로 한 번 더 확인해요.
    const updated = must(
      await db().from("instructor_profiles").update({ is_admin: plan.value.isAdmin }).eq("user_id", target.userId).eq("is_admin", !grant).select("user_id"),
    ) as { user_id: string }[];
    if (updated.length === 0) throw new ApiError(409, "다른 관리자가 먼저 바꿨어요. 새로고침해 주세요.", "conflict");
    if (!grant && (await countAdmins()) === 0) {
      must(await db().from("instructor_profiles").update({ is_admin: true }).eq("user_id", target.userId));
      throw new ApiError(409, "마지막 관리자의 권한은 회수할 수 없어요.", "rule");
    }
    await writeAudit(access, { action: `instructor.${body.action}`, targetType: "instructor", targetId: target.userId, targetLabel: label });
    return { ok: true };
  }

  const emailConfirmed = body.action === "approve" ? Boolean((await loadEmailConfirmedAt([target.userId])).get(target.userId)) : true;
  const plan = planStatusChange({ actorId: access.user.id, targetId: target.userId, current: target.status, action: body.action, reason: body.reason, emailConfirmed });
  if (!plan.ok) throw new ApiError(409, plan.error, "rule");
  // 낙관적 잠금: 화면에서 본 상태 그대로일 때만 바꿔요.
  const updated = must(
    await db()
      .from("instructor_profiles")
      .update({ status: plan.value.status, status_reason: plan.value.reason, reviewed_at: now, reviewed_by: access.user.id })
      .eq("user_id", target.userId)
      .eq("status", target.status)
      .select("user_id"),
  ) as { user_id: string }[];
  if (updated.length === 0) throw new ApiError(409, "다른 관리자가 먼저 처리했어요. 새로고침해 주세요.", "conflict");

  await writeAudit(access, {
    action: `instructor.${body.action}` as AuditAction,
    targetType: "instructor",
    targetId: target.userId,
    targetLabel: label,
    reason: plan.value.reason,
    meta: { from: target.status, to: plan.value.status },
  });
  return { ok: true, status: plan.value.status };
});
