"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { loginAction, resendConfirmationAction, signupAction, type AuthState } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? loginAction : signupAction, undefined);

  return (
    <>
      <form action={action} className="space-y-4" noValidate>
        {next && <input type="hidden" name="next" value={next} />}
        {mode === "signup" && (
          <div className="space-y-2">
            <Label htmlFor="name">이름</Label>
            <Input id="name" name="name" autoComplete="name" required maxLength={30} placeholder="김강사" />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">이메일</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">비밀번호</Label>
            {mode === "login" && (
              <Link href="/forgot" className="text-sm text-muted-foreground hover:text-primary hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            )}
          </div>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : 1}
            placeholder={mode === "signup" ? "8자 이상" : ""}
          />
        </div>
        {state?.error && (
          <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-[#c2410c]">
            {state.error}
          </p>
        )}
        {state?.message && (
          <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary-hover">
            {state.message}
          </p>
        )}
        <Button type="submit" size="lg" className="w-full" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}
          {mode === "login" ? "로그인" : "가입하고 시작하기"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "login" ? (
            <>
              처음이신가요?{" "}
              <Link href="/signup" className="font-semibold text-primary hover:underline">
                강사 가입하기
              </Link>
            </>
          ) : (
            <>
              이미 계정이 있나요?{" "}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                로그인
              </Link>
            </>
          )}
        </p>
      </form>
      {state?.resendEmail && <ResendConfirmation email={state.resendEmail} />}
    </>
  );
}

/** 인증 메일을 못 받았을 때 다시 보내기 */
function ResendConfirmation({ email }: { email: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resendConfirmationAction, undefined);
  return (
    <form action={action} className="mt-4 rounded-xl bg-muted/60 px-3 py-3 text-sm">
      <input type="hidden" name="email" value={email} />
      <p className="text-muted-foreground">메일이 오지 않았나요? 스팸함도 확인해 주세요.</p>
      <Button type="submit" variant="outline" size="sm" className="mt-2" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}
        인증 메일 다시 보내기
      </Button>
      {state?.message && (
        <p role="status" className="mt-2 font-medium text-primary-hover">
          {state.message}
        </p>
      )}
      {state?.error && (
        <p role="alert" className="mt-2 font-medium text-[#c2410c]">
          {state.error}
        </p>
      )}
    </form>
  );
}
