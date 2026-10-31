"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { emailSchema, instructorPasswordSchema, loginSchema, signupSchema } from "@/lib/validation/room";

/** resendEmail: 인증 메일 다시 보내기 버튼을 보여줄 이메일 */
export type AuthState = { error?: string; message?: string; resendEmail?: string } | undefined;

function safeNext(next: FormDataEntryValue | null) {
  const v = typeof next === "string" ? next : "";
  return v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.error("[auth] 로그인 실패", error.message);
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "이메일 인증이 아직 안 됐어요. 받은 메일함(스팸함 포함)의 인증 링크를 눌러 주세요.", resendEmail: parsed.data.email };
    }
    return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  }
  redirect(safeNext(formData.get("next")));
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    // 이메일 템플릿이 기본값({{ .ConfirmationURL }})일 때 돌아오는 곳. 맞춤 템플릿은 /auth/confirm을 써요.
    options: { data: { name: parsed.data.name }, emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/pending` },
  });
  if (error) {
    console.error("[auth] 가입 실패", error.message);
    if (error.message.toLowerCase().includes("registered")) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
    return { error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  // 이미 가입된 이메일이면 Supabase는 오류 대신 identities가 빈 사용자를 돌려줘요 (가입 여부 노출 방지).
  if (data.user && data.user.identities?.length === 0) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
  if (!data.session) {
    return {
      message: `${parsed.data.email}로 인증 메일을 보냈어요. 메일의 [이메일 인증하기]를 누르면 가입 신청이 접수되고, 관리자 승인 후 이용할 수 있어요.`,
      resendEmail: parsed.data.email,
    };
  }
  // 이메일 인증을 끈 프로젝트: 바로 승인 대기 안내로 보내요.
  redirect("/pending");
}

/** 가입 인증 메일 다시 보내기 (가입 여부와 상관없이 같은 안내) */
export async function resendConfirmationAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=/pending` },
  });
  if (error) {
    console.error("[auth] 인증 메일 재발송 실패", error.message);
    if (error.status === 429 || error.message.toLowerCase().includes("rate")) return { error: "메일을 너무 자주 보냈어요. 1분쯤 뒤에 다시 시도해 주세요." };
  }
  return { message: "인증 메일을 다시 보냈어요. 메일함(스팸함 포함)을 확인해 주세요." };
}

async function siteOrigin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** 비밀번호 재설정 메일 보내기 (가입 여부와 상관없이 같은 안내를 보여줘요) */
export async function forgotAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, { redirectTo: `${await siteOrigin()}/auth/callback?next=/reset-password` });
  if (error) console.error("[auth] 재설정 메일 실패", error.message);
  return { message: "가입된 이메일이라면 비밀번호 재설정 링크를 보냈어요. 메일함을 확인해 주세요." };
}

/** 새 비밀번호 저장 (재설정 링크로 로그인된 상태) */
export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = instructorPasswordSchema.safeParse(formData.get("password"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (formData.get("password") !== formData.get("confirm")) return { error: "두 비밀번호가 달라요." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data });
  if (error) {
    console.error("[auth] 비밀번호 변경 실패", error.message);
    return { error: "비밀번호를 바꾸지 못했어요. 재설정 링크를 다시 받아 주세요." };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
