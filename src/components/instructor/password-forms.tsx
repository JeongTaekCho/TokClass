"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Loader2 } from "lucide-react";

import { forgotAction, resetPasswordAction, type AuthState } from "@/app/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Feedback({ state }: { state: AuthState }) {
  if (state?.error)
    return (
      <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-[#b42318]">
        {state.error}
      </p>
    );
  if (state?.message)
    return (
      <p role="status" className="rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary-hover">
        {state.message}
      </p>
    );
  return null;
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(forgotAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">가입한 이메일</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <Feedback state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}재설정 링크 받기
      </Button>
      <p className="text-center text-sm">
        <Link href="/login" className="font-semibold text-primary hover:underline">
          로그인으로 돌아가기
        </Link>
      </p>
    </form>
  );
}

export function ResetForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">새 비밀번호</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required placeholder="8자 이상" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirm">새 비밀번호 확인</Label>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Feedback state={state} />
      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending && <Loader2 className="animate-spin" aria-hidden />}비밀번호 바꾸기
      </Button>
    </form>
  );
}
