import { Logo } from "@/components/brand/logo";
import { TeacherDeskArt } from "@/components/illustrations";
import { FadeIn } from "@/components/motion";

/**
 * 로그인·가입·승인 안내 화면 틀.
 * 넓은 화면: 왼쪽 흰 카드(폼) + 오른쪽 브랜드 패널(일러스트). 좁은 화면: 카드만, 그림은 제목 위에 작게.
 */
export function AuthShell({
  title,
  description,
  art,
  children,
}: {
  title: string;
  description: string;
  art?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col bg-dots px-4 py-6 sm:items-center sm:py-10">
        <Logo size="sm" className="self-start sm:self-center lg:self-start lg:pl-6" />
        <FadeIn className="ring-brand mt-8 w-full max-w-md rounded-2xl bg-surface p-6 shadow-glow sm:mt-14 sm:p-8">
          {art && <div className="mb-5 w-full max-w-44">{art}</div>}
          <h1 className="text-title">{title}</h1>
          <p className="mt-1 mb-6 text-muted-foreground">{description}</p>
          {children}
        </FadeIn>
      </div>
      <aside aria-hidden className="bg-brand relative hidden flex-col items-center justify-center overflow-hidden px-10 lg:flex">
        <div className="blob -top-24 -right-24 size-96 bg-coral/45" />
        <div className="blob -bottom-32 -left-20 size-[28rem] bg-sky/40" />
        <div className="blob top-1/3 left-1/3 size-64 bg-brand-mix/40" />
        <div className="absolute inset-0 bg-dots opacity-25" />
        <div className="relative w-full max-w-md">
          <div className="rounded-3xl bg-surface/95 p-6 shadow-overlay ring-1 ring-white/60">
            <TeacherDeskArt className="mx-auto max-w-none" />
          </div>
          {/* 떠 있는 반응 말풍선 (장식) */}
          <span className="absolute -top-4 -left-6 animate-float rounded-2xl bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-raised">🙋 질문 있어요!</span>
          <span className="absolute -right-6 top-1/3 animate-float rounded-2xl bg-surface px-3 py-2 text-sm font-semibold text-foreground shadow-raised [animation-delay:1.2s]">🟢 이해했어요</span>
          <span className="absolute -bottom-5 left-8 animate-float rounded-2xl bg-coral px-3 py-2 text-sm font-semibold text-ink shadow-raised [animation-delay:2.2s]">👏 12</span>
        </div>
        <p className="relative mt-8 text-center text-2xl leading-snug font-bold text-primary-foreground">
          듣는 수업에서
          <br />
          함께 만드는 수업으로
        </p>
        <p className="relative mt-2 text-center text-primary-foreground/80">참여코드 하나로 질문·반응·투표를 한 화면에서.</p>
      </aside>
    </main>
  );
}
