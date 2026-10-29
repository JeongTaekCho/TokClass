"use server";

import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { loginSchema, signupSchema } from "@/lib/validation/room";

export type AuthState = { error?: string; message?: string } | undefined;

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
      return { error: "이메일 인증이 아직 안 됐어요. 받은 메일함을 확인해 주세요." };
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
    options: { data: { name: parsed.data.name } },
  });
  if (error) {
    console.error("[auth] 가입 실패", error.message);
    if (error.message.toLowerCase().includes("registered")) return { error: "이미 가입된 이메일이에요. 로그인해 주세요." };
    return { error: "가입하지 못했어요. 잠시 후 다시 시도해 주세요." };
  }
  if (!data.session) {
    return { message: "인증 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요." };
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
