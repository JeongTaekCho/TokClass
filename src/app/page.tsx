import Link from "next/link";
import { BarChart3, FileText, MessageCircle, Users } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { JoinCodeForm } from "@/components/student/join-code-form";

const features = [
  { icon: FileText, title: "교안 실시간 동기화", body: "강사가 넘기면 모두의 화면이 함께 넘어가요." },
  { icon: MessageCircle, title: "부담 없는 질문", body: "익명 Q&A와 공감으로 중요한 질문이 위로 올라와요." },
  { icon: BarChart3, title: "이해도 신호등", body: "지금 수업을 따라오고 있는지 한눈에 보여요." },
  { icon: Users, title: "함께 만드는 결과물", body: "산출물을 올리고 댓글·스티커로 서로 피드백해요." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">강사 로그인</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 py-8 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:py-16">
        <section>
          <p className="mb-4 inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-hover">
            듣는 수업에서 함께 만드는 수업으로
          </p>
          <h1 className="text-4xl leading-tight font-extrabold tracking-tight sm:text-5xl">
            참여코드 하나로
            <br />
            <span className="text-primary">모두가 말하는</span> 수업
          </h1>
          <p className="mt-5 max-w-xl text-lg text-muted-foreground">
            강사가 방을 만들고 코드를 공유하면, 수강생은 설치·가입 없이 들어와 채팅·교안·투표·산출물 공유를 한 화면에서 함께해요.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {features.map((f) => (
              <li key={f.title} className="flex gap-3 rounded-2xl border border-border bg-card p-4 shadow-soft">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="size-5" aria-hidden />
                </span>
                <span>
                  <span className="block font-bold">{f.title}</span>
                  <span className="text-sm text-muted-foreground">{f.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="join-title" className="rounded-3xl border border-border bg-card p-6 shadow-lifted sm:p-8">
          <h2 id="join-title" className="text-2xl font-extrabold">
            수업에 참여할게요
          </h2>
          <p className="mt-1 text-muted-foreground">강사님이 알려준 6자리 참여코드를 입력해 주세요.</p>
          <div className="mt-6">
            <JoinCodeForm />
          </div>
          <div className="mt-8 rounded-2xl bg-muted p-4 text-sm">
            <p className="font-semibold">강사이신가요?</p>
            <p className="mt-1 text-muted-foreground">방을 만들고 참여코드·QR을 공유해 수업을 시작해 보세요.</p>
            <Button asChild variant="outline" className="mt-3 w-full">
              <Link href="/signup">강사로 시작하기</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-sm text-muted-foreground">© 톡클 TokClass</footer>
    </div>
  );
}
