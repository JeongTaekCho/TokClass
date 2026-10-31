import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { isInstructorStatus, type InstructorStatus } from "@/lib/admin/rules";
import { serverEnv } from "@/lib/env";
import { db } from "@/lib/supabase/admin";

/** 강사 인증용 (Supabase Auth 쿠키 세션) */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseUrl, serverEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Component에서 호출되면 쿠키를 쓸 수 없어요. proxy.ts가 세션을 갱신합니다.
        }
      },
    },
  });
}

/** 현재 로그인한 강사 (없으면 null). 승인 여부는 보지 않아요. */
export const getInstructor = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
});

export type InstructorProfile = {
  userId: string;
  email: string;
  name: string;
  status: InstructorStatus;
  statusReason: string | null;
  isAdmin: boolean;
  createdAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
};

export type InstructorAccess = { user: User; profile: InstructorProfile };

type ProfileRow = {
  user_id: string;
  email: string;
  name: string;
  status: string;
  status_reason: string | null;
  is_admin: boolean;
  created_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
};

export const PROFILE_SELECT = "user_id, email, name, status, status_reason, is_admin, created_at, reviewed_at, reviewed_by";

export function toInstructorProfile(r: ProfileRow): InstructorProfile {
  return {
    userId: r.user_id,
    email: r.email,
    name: r.name,
    status: isInstructorStatus(r.status) ? r.status : "pending",
    statusReason: r.status_reason,
    isAdmin: r.is_admin,
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
    reviewedBy: r.reviewed_by,
  };
}

export async function loadInstructorProfile(userId: string): Promise<InstructorProfile | null> {
  const { data, error } = await db().from("instructor_profiles").select(PROFILE_SELECT).eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data ? toInstructorProfile(data as ProfileRow) : null;
}

/**
 * 로그인한 강사 + 프로필. 프로필 행이 없으면(가입 트리거가 없던 시기) 승인 대기로 봐요.
 * 여기서 행을 만들지는 않아요: 마이그레이션 백필이 기존 강사를 승인 상태로 채워야 하기 때문이에요.
 */
export const getInstructorAccess = cache(async (): Promise<InstructorAccess | null> => {
  const user = await getInstructor();
  if (!user) return null;
  const profile = (await loadInstructorProfile(user.id)) ?? {
    userId: user.id,
    email: user.email ?? "",
    name: (user.user_metadata?.name as string | undefined) ?? "",
    status: "pending",
    statusReason: null,
    isAdmin: false,
    createdAt: user.created_at,
    reviewedAt: null,
    reviewedBy: null,
  };
  return { user, profile };
});

/** 승인된 강사 (아니면 null) */
export async function getApprovedInstructor(): Promise<InstructorAccess | null> {
  const access = await getInstructorAccess();
  return access?.profile.status === "approved" ? access : null;
}

/** 승인된 관리자 (아니면 null) */
export async function getAdmin(): Promise<InstructorAccess | null> {
  const access = await getApprovedInstructor();
  return access?.profile.isAdmin ? access : null;
}

/** 강사 페이지용: 로그인 → 승인 확인. 아니면 로그인·승인 안내 화면으로 보내요. */
export async function requireApprovedInstructor(next: string): Promise<InstructorAccess> {
  const access = await getInstructorAccess();
  if (!access) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (access.profile.status !== "approved") redirect("/pending");
  return access;
}

/** 관리자 페이지용: 관리자가 아니면 페이지가 없는 것처럼 보여요. */
export async function requireAdmin(next = "/admin"): Promise<InstructorAccess> {
  const access = await requireApprovedInstructor(next);
  if (!access.profile.isAdmin) notFound();
  return access;
}

export function instructorDisplayName(access: InstructorAccess) {
  return access.profile.name || (access.user.user_metadata?.name as string | undefined) || access.user.email;
}
