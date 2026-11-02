import Link from "next/link";
import { ArrowRight, Gauge, MessageCircleQuestion, QrCode, Smartphone, Sparkles, StickyNote, Vote } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { IconChip, type IconChipTone } from "@/components/icon-chip";
import { ClassroomHeroArt } from "@/components/illustrations";
import { FadeIn, Stagger, StaggerItem } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { JoinCodeForm } from "@/components/student/join-code-form";

const steps = [
  { icon: QrCode, tone: "primary", title: "강사가 방을 열어요", body: "참여코드와 QR이 바로 생겨요. 슬라이드 PDF를 올려 두면 넘기는 대로 모두의 화면이 따라와요." },
  { icon: Smartphone, tone: "coral", title: "수강생은 코드만 넣어요", body: "설치·가입 없이 닉네임만 정하면 들어와요. 다음에는 받은 비밀번호로 이어서 들어와요." },
  { icon: Sparkles, tone: "sun", title: "함께 반응해요", body: "이해도 신호등, 익명 Q&A, 투표, 산출물 공유로 듣기만 하던 시간이 대화가 돼요." },
] as const;

const features: { icon: typeof Gauge; tone: IconChipTone; title: string; body: string }[] = [
  { icon: Gauge, tone: "mint", title: "이해도 신호등", body: "🟢🟡🔴 한 번 누르면 강사 화면에 바로 모여요." },
  { icon: MessageCircleQuestion, tone: "primary", title: "익명 Q&A", body: "부끄러운 질문도 편하게, 공감 순으로 정리돼요." },
  { icon: Vote, tone: "coral", title: "투표·퀴즈", body: "시작하면 모두의 화면에 팝업으로 떠요." },
  { icon: StickyNote, tone: "sun", title: "산출물 게시판", body: "사진·글을 올리고 서로의 결과물을 봐요." },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-1">
          <Button asChild variant="ghost">
            <Link href="/login">강사 로그인</Link>
          </Button>
          <Button asChild className="hidden sm:inline-flex">
            <Link href="/signup">무료로 시작하기</Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden className="absolute inset-0 bg-dots [mask-image:radial-gradient(ellipse_at_70%_40%,black,transparent_70%)]" />
          <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pt-6 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] lg:pt-14">
            <FadeIn>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-coral-soft px-3 py-1 text-sm font-semibold text-coral-ink">
                <Sparkles aria-hidden className="size-4" /> 듣는 수업에서 함께 만드는 수업으로
              </p>
              <h1 className="mt-4 text-[2.25rem] leading-tight font-bold tracking-tight sm:text-[3.25rem]">
                참여코드 하나로
                <br />
                <span className="bg-gradient-to-r from-coral-ink via-brand-mix to-primary bg-clip-text text-transparent">모두가 말하는 수업</span>
              </h1>
              <p className="mt-4 max-w-md text-lg text-muted-foreground">강사가 방을 열고 코드를 알려 주면, 수강생은 휴대폰으로 바로 들어와 질문하고 반응해요.</p>

              <div className="mt-8 max-w-sm rounded-2xl border border-border/70 bg-surface p-5 shadow-raised">
                <h2 id="join-title" className="text-heading">
                  수업에 참여할게요
                </h2>
                <p className="mt-0.5 mb-4 text-sm text-muted-foreground">강사님이 알려준 6자리 참여코드를 입력해 주세요.</p>
                <JoinCodeForm />
              </div>
            </FadeIn>

            <FadeIn delay={0.15} className="order-first lg:order-none">
              <ClassroomHeroArt className="mx-auto w-full max-w-sm lg:max-w-xl" title="강사가 칠판 앞에서 설명하고, 수강생들이 질문·공감·이해 반응을 보내는 장면" />
            </FadeIn>
          </div>
        </section>

        <section aria-labelledby="feat-title" className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
          <h2 id="feat-title" className="text-title">
            수업 중에 이런 걸 해요
          </h2>
          <Stagger className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <StaggerItem key={f.title} className="rounded-lg border border-border/70 bg-surface p-5 shadow-card transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-raised">
                <IconChip icon={f.icon} tone={f.tone} size="lg" />
                <p className="mt-4 font-bold">{f.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </StaggerItem>
            ))}
          </Stagger>
        </section>

        <section aria-labelledby="how-title" className="bg-surface">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
            <h2 id="how-title" className="text-title">
              수업은 이렇게 흘러가요
            </h2>
            <ol className="mt-8 grid gap-8 sm:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title} className="relative">
                  <div className="flex items-center gap-3">
                    <IconChip icon={s.icon} tone={s.tone} size="lg" />
                    <span className="text-sm font-bold text-muted-foreground tabular-nums">STEP {i + 1}</span>
                  </div>
                  <p className="mt-4 text-heading">{s.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-12 flex flex-col items-start gap-4 rounded-2xl bg-primary p-6 text-primary-foreground sm:flex-row sm:items-center sm:justify-between sm:p-8">
              <div>
                <p className="text-heading">강사이신가요?</p>
                <p className="text-primary-foreground/85">방을 만들고 참여코드·QR을 공유해 수업을 시작해 보세요.</p>
              </div>
              <Button asChild variant="outline" size="lg" className="border-transparent text-primary-ink">
                <Link href="/signup">
                  무료로 시작하기 <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="px-4 py-6 text-center text-sm text-muted-foreground">© 톡클 TokClass</footer>
    </div>
  );
}
