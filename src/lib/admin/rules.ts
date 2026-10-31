/** 강사 상태와 관리자 권한 변경 규칙 (서버·테스트 공용, DB 접근 없음) */

export const INSTRUCTOR_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export type InstructorStatus = (typeof INSTRUCTOR_STATUSES)[number];

export const STATUS_LABEL: Record<InstructorStatus, string> = {
  pending: "승인 대기",
  approved: "승인",
  rejected: "거절",
  suspended: "정지",
};

export const STATUS_ACTIONS = ["approve", "reject", "suspend", "unsuspend"] as const;
export type StatusAction = (typeof STATUS_ACTIONS)[number];

export const STATUS_ACTION_LABEL: Record<StatusAction, string> = {
  approve: "승인",
  reject: "거절",
  suspend: "정지",
  unsuspend: "정지 해제",
};

/** 상태 전이표: 작업 → 허용되는 현재 상태 → 바뀔 상태 */
const TRANSITIONS: Record<StatusAction, { from: readonly InstructorStatus[]; to: InstructorStatus; needsReason: boolean }> = {
  approve: { from: ["pending", "rejected"], to: "approved", needsReason: false },
  reject: { from: ["pending"], to: "rejected", needsReason: true },
  suspend: { from: ["approved"], to: "suspended", needsReason: true },
  unsuspend: { from: ["suspended"], to: "approved", needsReason: false },
};

export function isInstructorStatus(v: unknown): v is InstructorStatus {
  return typeof v === "string" && (INSTRUCTOR_STATUSES as readonly string[]).includes(v);
}

export type RuleResult<T> = { ok: true; value: T } | { ok: false; error: string };

/** 지금 상태에서 할 수 있는 상태 작업들 */
export function availableStatusActions(current: InstructorStatus): StatusAction[] {
  return STATUS_ACTIONS.filter((a) => TRANSITIONS[a].from.includes(current));
}

export function statusActionNeedsReason(action: StatusAction) {
  return TRANSITIONS[action].needsReason;
}

export function planStatusChange(input: {
  actorId: string;
  targetId: string;
  current: InstructorStatus;
  action: StatusAction;
  reason?: string | null;
  /** 가입 이메일 인증 여부. 승인은 인증을 마친 계정만 할 수 있어요. */
  emailConfirmed: boolean;
}): RuleResult<{ status: InstructorStatus; reason: string | null }> {
  const t = TRANSITIONS[input.action];
  if (!t.from.includes(input.current)) {
    return { ok: false, error: `${STATUS_LABEL[input.current]} 상태에서는 ${STATUS_ACTION_LABEL[input.action]}할 수 없어요.` };
  }
  // 관리자가 자기 계정을 거절·정지하면 스스로 잠기게 돼요.
  if (input.actorId === input.targetId && t.to !== "approved") {
    return { ok: false, error: "자기 계정은 거절하거나 정지할 수 없어요." };
  }
  if (input.action === "approve" && !input.emailConfirmed) {
    return { ok: false, error: "이메일 인증을 마친 강사만 승인할 수 있어요." };
  }
  const reason = input.reason?.trim() || null;
  if (t.needsReason && !reason) return { ok: false, error: "사유를 입력해 주세요." };
  // 승인·정지 해제는 이전 사유를 지워요.
  return { ok: true, value: { status: t.to, reason: t.to === "approved" ? null : reason } };
}

export function planAdminChange(input: {
  actorId: string;
  targetId: string;
  grant: boolean;
  targetIsAdmin: boolean;
  targetStatus: InstructorStatus;
  /** 지금 관리자 수 (대상 포함) */
  adminCount: number;
}): RuleResult<{ isAdmin: boolean }> {
  if (input.grant) {
    if (input.targetIsAdmin) return { ok: false, error: "이미 관리자예요." };
    if (input.targetStatus !== "approved") return { ok: false, error: "승인된 강사만 관리자로 지정할 수 있어요." };
    return { ok: true, value: { isAdmin: true } };
  }
  if (!input.targetIsAdmin) return { ok: false, error: "관리자가 아니에요." };
  if (input.actorId === input.targetId) return { ok: false, error: "자기 자신의 관리자 권한은 회수할 수 없어요." };
  if (input.adminCount <= 1) return { ok: false, error: "마지막 관리자의 권한은 회수할 수 없어요." };
  return { ok: true, value: { isAdmin: false } };
}

/** 이 강사의 방에 수강생이 들어올 수 없는 상태 */
export function blocksParticipants(status: InstructorStatus | null | undefined) {
  return status === "suspended" || status === "rejected";
}
