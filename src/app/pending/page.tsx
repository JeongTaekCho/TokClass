import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Ban, Clock, LogOut, MailCheck, XCircle } from "lucide-react";

import { logoutAction } from "@/app/auth-actions";
import { AuthShell } from "@/components/instructor/auth-shell";
import { Button } from "@/components/ui/button";
import { STATUS_LABEL, type InstructorStatus } from "@/lib/admin/rules";
import { formatDateTime } from "@/lib/format";
import { getInstructorAccess } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "승인 안내" };

const COPY: Record<Exclude<InstructorStatus, "approved">, { title: string; description: string; icon: typeof Clock }> = {
  pending: { title: "승인을 기다리고 있어요", description: "이메일 인증이 끝나 가입 신청이 접수됐어요. 관리자 승인 후 이용할 수 있어요.", icon: Clock },
  rejected: { title: "가입 신청이 거절됐어요", description: "아래 사유를 확인해 주세요. 궁금한 점은 관리자에게 문의해 주세요.", icon: XCircle },
  suspended: { title: "계정이 정지됐어요", description: "지금은 방을 만들거나 수업을 진행할 수 없어요. 기존 기록은 그대로 보관돼요.", icon: Ban },
};

export default async function PendingPage({ searchParams }: PageProps<"/pending">) {
  const verified = (await searchParams).verified === "1";
  const access = await getInstructorAccess();
  if (!access) redirect("/login");
  const { profile } = access;
  if (profile.status === "approved") redirect("/dashboard");
  const copy = COPY[profile.status];
  const Icon = copy.icon;

  return (
    <AuthShell title={copy.title} description={copy.description}>
      {verified && profile.status === "pending" && (
        <p role="status" className="mb-4 flex items-center gap-2 rounded-xl bg-primary-soft px-3 py-2 text-sm font-medium text-primary-hover">
          <MailCheck className="size-4" aria-hidden /> 이메일 인증을 완료했어요.
        </p>
      )}
      <dl className="space-y-3 rounded-2xl bg-muted/60 p-4 text-sm">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-primary" aria-hidden />
          <dt className="sr-only">상태</dt>
          <dd className="font-bold">{STATUS_LABEL[profile.status]}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted-foreground">계정</dt>
          <dd className="font-medium break-all">{profile.email || access.user.email}</dd>
        </div>
        {profile.status !== "pending" && profile.statusReason && (
          <div>
            <dt className="text-muted-foreground">{profile.status === "rejected" ? "거절 사유" : "정지 사유"}</dt>
            <dd className="mt-1 whitespace-pre-wrap">{profile.statusReason}</dd>
          </div>
        )}
        {profile.reviewedAt && profile.status !== "pending" && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground">처리일</dt>
            <dd>{formatDateTime(profile.reviewedAt)}</dd>
          </div>
        )}
      </dl>
      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <LogOut aria-hidden /> 로그아웃
        </Button>
      </form>
    </AuthShell>
  );
}
