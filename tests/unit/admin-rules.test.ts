import { describe, expect, it } from "vitest";

import { availableStatusActions, blocksParticipants, planAdminChange, planStatusChange, type InstructorStatus, type StatusAction } from "@/lib/admin/rules";

const ADMIN = "admin-1";
const OTHER = "instructor-2";

const change = (current: InstructorStatus, action: StatusAction, reason?: string, targetId = OTHER, emailConfirmed = true) =>
  planStatusChange({ actorId: ADMIN, targetId, current, action, reason, emailConfirmed });

describe("강사 상태 전이", () => {
  it("허용되는 전이표", () => {
    const table: [InstructorStatus, StatusAction, InstructorStatus][] = [
      ["pending", "approve", "approved"],
      ["pending", "reject", "rejected"],
      ["rejected", "approve", "approved"],
      ["approved", "suspend", "suspended"],
      ["suspended", "unsuspend", "approved"],
    ];
    for (const [from, action, to] of table) {
      const r = change(from, action, "사유");
      expect(r, `${from} → ${action}`).toEqual({ ok: true, value: expect.objectContaining({ status: to }) });
    }
  });

  it("허용되지 않는 전이는 거부한다", () => {
    const denied: [InstructorStatus, StatusAction][] = [
      ["approved", "approve"],
      ["suspended", "approve"],
      ["approved", "reject"],
      ["rejected", "reject"],
      ["suspended", "reject"],
      ["pending", "suspend"],
      ["rejected", "suspend"],
      ["suspended", "suspend"],
      ["pending", "unsuspend"],
      ["approved", "unsuspend"],
      ["rejected", "unsuspend"],
    ];
    for (const [from, action] of denied) {
      const r = change(from, action, "사유");
      expect(r.ok, `${from} → ${action}`).toBe(false);
    }
  });

  it("availableStatusActions는 전이표와 일치한다", () => {
    expect(availableStatusActions("pending")).toEqual(["approve", "reject"]);
    expect(availableStatusActions("approved")).toEqual(["suspend"]);
    expect(availableStatusActions("rejected")).toEqual(["approve"]);
    expect(availableStatusActions("suspended")).toEqual(["unsuspend"]);
  });

  it("거절·정지는 사유가 필요하다 (공백만 있으면 안 됨)", () => {
    expect(change("pending", "reject")).toEqual({ ok: false, error: "사유를 입력해 주세요." });
    expect(change("approved", "suspend", "   ")).toEqual({ ok: false, error: "사유를 입력해 주세요." });
    expect(change("approved", "suspend", "  부적절한 콘텐츠  ")).toEqual({ ok: true, value: { status: "suspended", reason: "부적절한 콘텐츠" } });
  });

  it("승인·정지 해제는 사유를 지운다", () => {
    expect(change("rejected", "approve", "무시돼요")).toEqual({ ok: true, value: { status: "approved", reason: null } });
    expect(change("suspended", "unsuspend")).toEqual({ ok: true, value: { status: "approved", reason: null } });
  });

  it("이메일 인증 전에는 승인할 수 없다 (거절은 가능)", () => {
    expect(change("pending", "approve", undefined, OTHER, false)).toEqual({ ok: false, error: "이메일 인증을 마친 강사만 승인할 수 있어요." });
    expect(change("pending", "reject", "스팸 가입", OTHER, false).ok).toBe(true);
    expect(change("pending", "approve", undefined, OTHER, true).ok).toBe(true);
  });

  it("관리자는 자기 계정을 거절·정지할 수 없다", () => {
    expect(change("approved", "suspend", "사유", ADMIN).ok).toBe(false);
    expect(change("pending", "reject", "사유", ADMIN).ok).toBe(false);
  });
});

describe("관리자 권한 부여·회수", () => {
  const base = { actorId: ADMIN, targetId: OTHER, targetStatus: "approved" as InstructorStatus, adminCount: 2 };

  it("승인된 강사에게만 부여한다", () => {
    expect(planAdminChange({ ...base, grant: true, targetIsAdmin: false })).toEqual({ ok: true, value: { isAdmin: true } });
    for (const s of ["pending", "rejected", "suspended"] as const) {
      expect(planAdminChange({ ...base, grant: true, targetIsAdmin: false, targetStatus: s }).ok).toBe(false);
    }
    expect(planAdminChange({ ...base, grant: true, targetIsAdmin: true }).ok).toBe(false);
  });

  it("다른 관리자가 남아 있으면 회수할 수 있다", () => {
    expect(planAdminChange({ ...base, grant: false, targetIsAdmin: true })).toEqual({ ok: true, value: { isAdmin: false } });
  });

  it("자기 자신은 회수할 수 없다", () => {
    expect(planAdminChange({ ...base, grant: false, targetIsAdmin: true, targetId: ADMIN })).toEqual({ ok: false, error: "자기 자신의 관리자 권한은 회수할 수 없어요." });
  });

  it("마지막 관리자는 회수할 수 없다", () => {
    expect(planAdminChange({ ...base, grant: false, targetIsAdmin: true, adminCount: 1 })).toEqual({ ok: false, error: "마지막 관리자의 권한은 회수할 수 없어요." });
  });

  it("관리자가 아니면 회수할 것이 없다", () => {
    expect(planAdminChange({ ...base, grant: false, targetIsAdmin: false }).ok).toBe(false);
  });
});

describe("수강생 입장 차단", () => {
  it("정지·거절된 강사의 방만 막는다", () => {
    expect(blocksParticipants("suspended")).toBe(true);
    expect(blocksParticipants("rejected")).toBe(true);
    expect(blocksParticipants("approved")).toBe(false);
    expect(blocksParticipants("pending")).toBe(false);
    // 프로필이 없는 기존 방(마이그레이션 전)은 막지 않아요.
    expect(blocksParticipants(null)).toBe(false);
  });
});
