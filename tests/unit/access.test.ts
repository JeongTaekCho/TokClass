import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * 접근 제어 (비로그인 / 승인 대기·정지 강사 / 일반 강사 / 관리자)를 Supabase 없이 확인해요.
 * Supabase Auth의 getUser와 instructor_profiles 조회만 가짜로 바꿉니다.
 */
const state: { user: { id: string; email: string; created_at: string; user_metadata: Record<string, unknown> } | null; profile: Record<string, unknown> | null } = {
  user: null,
  profile: null,
};

// 가짜 값: 아래 모킹 때문에 실제로 접속하지 않아요.
vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "http://127.0.0.1:1");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "test-anon");
vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-service");

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ cookies: async () => ({ getAll: () => [], set: () => {} }), headers: async () => new Headers() }));
vi.mock("@supabase/ssr", () => ({ createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: state.user }, error: null }) } }) }));
vi.mock("@/lib/supabase/admin", () => {
  const chain = {
    select: () => chain,
    eq: () => chain,
    maybeSingle: async () => ({ data: state.profile, error: null }),
  };
  return { db: () => ({ from: () => chain }) };
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  notFound: () => {
    throw new Error("NOT_FOUND");
  },
}));

const { requireAdmin, requireApprovedInstructor, getApprovedInstructor } = await import("@/lib/supabase/server");
const { adminHandler, instructorHandler } = await import("@/lib/api/handler");

const USER = { id: "11111111-1111-4111-8111-111111111111", email: "t@example.com", created_at: "2026-10-01T00:00:00Z", user_metadata: {} };
const profile = (status: string, isAdmin = false) => ({
  user_id: USER.id,
  email: USER.email,
  name: "테스트",
  status,
  status_reason: null,
  is_admin: isAdmin,
  created_at: USER.created_at,
  reviewed_at: null,
  reviewed_by: null,
});

type Role = "anonymous" | "pending" | "suspended" | "instructor" | "admin" | "suspended-admin" | "no-profile";
function as(role: Role) {
  state.user = role === "anonymous" ? null : USER;
  state.profile =
    role === "anonymous" || role === "no-profile"
      ? null
      : role === "admin"
        ? profile("approved", true)
        : role === "suspended-admin"
          ? profile("suspended", true)
          : profile(role === "instructor" ? "approved" : role);
}

async function call(handler: ReturnType<typeof adminHandler>) {
  const res = await handler(new NextRequest("http://localhost/api/test", { method: "POST", body: "{}" }), { params: Promise.resolve({}) });
  return res.status;
}

beforeEach(() => as("anonymous"));

describe("페이지 접근 (/dashboard, /rooms, /manage → requireApprovedInstructor)", () => {
  it.each<[Role, string]>([
    ["anonymous", "REDIRECT /login?next=%2Fmanage"],
    ["no-profile", "REDIRECT /pending"],
    ["pending", "REDIRECT /pending"],
    ["suspended", "REDIRECT /pending"],
    ["rejected" as Role, "REDIRECT /pending"],
  ])("%s → %s", async (role, expected) => {
    as(role);
    await expect(requireApprovedInstructor("/manage")).rejects.toThrow(expected);
  });

  it("승인된 강사는 통과", async () => {
    as("instructor");
    await expect(requireApprovedInstructor("/manage")).resolves.toMatchObject({ profile: { status: "approved" } });
    await expect(getApprovedInstructor()).resolves.not.toBeNull();
  });
});

describe("관리자 페이지 (/admin → requireAdmin)", () => {
  it("비로그인은 로그인으로", async () => {
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /login?next=%2Fadmin");
  });
  it("일반 강사에게는 페이지가 없는 것처럼 (404)", async () => {
    as("instructor");
    await expect(requireAdmin()).rejects.toThrow("NOT_FOUND");
  });
  it("정지된 관리자는 승인 안내로", async () => {
    as("suspended-admin");
    await expect(requireAdmin()).rejects.toThrow("REDIRECT /pending");
  });
  it("관리자는 통과", async () => {
    as("admin");
    await expect(requireAdmin()).resolves.toMatchObject({ profile: { isAdmin: true } });
  });
});

describe("API 접근", () => {
  const ok = async () => ({ ok: true });
  it.each<[Role, number]>([
    ["anonymous", 401],
    ["pending", 403],
    ["suspended", 403],
    ["instructor", 403],
    ["suspended-admin", 403],
    ["admin", 200],
  ])("관리자 API: %s → %i", async (role, status) => {
    as(role);
    expect(await call(adminHandler({}, ok))).toBe(status);
  });

  it.each<[Role, number]>([
    ["anonymous", 401],
    ["no-profile", 403],
    ["pending", 403],
    ["suspended", 403],
    ["instructor", 200],
    ["admin", 200],
  ])("강사 API (/api/manage, 방 만들기): %s → %i", async (role, status) => {
    as(role);
    expect(await call(instructorHandler({}, ok))).toBe(status);
  });
});
