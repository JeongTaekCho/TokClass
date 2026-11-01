"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, ChevronRight, Copy, KeyRound, Loader2, Lock, Sparkles, type LucideIcon } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { IconChip } from "@/components/icon-chip";
import { JoinPhoneArt } from "@/components/illustrations";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError, setActingAs } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { savePassword } from "@/lib/client/password-store";
import { toastError } from "@/lib/client/toast-error";

type RoomInfo = { id: string; title: string; status: "active" | "ended"; locked: boolean; full: boolean; blocked?: boolean };
type Step = "choose" | "nickname" | "issued" | "password" | "confirm";

export function JoinFlow({ code, room }: { code: string; room: RoomInfo }) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("choose");
  const [remember, setRemember] = useState(true);
  const [nickname, setNickname] = useState("");
  const [password, setPassword] = useState("");
  const [issued, setIssued] = useState<{ roomId: string; password: string; nickname: string } | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState<{ nickname: string; ticket: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canJoinNew = room.status === "active" && !room.locked && !room.full && !room.blocked;

  async function run(fn: () => Promise<void>) {
    setPending(true);
    setError(null);
    try {
      setActingAs("participant");
      await fn();
    } catch (e) {
      if (e instanceof ClientApiError) setError(e.message);
      else toastError(e);
    } finally {
      setPending(false);
    }
  }

  const enterRoom = () => router.replace(`/r/${code}`);

  return (
    <main className="flex min-h-dvh flex-col bg-dots px-4 py-6 sm:items-center sm:py-12">
      <Logo size="sm" />
      <section className="mt-6 w-full max-w-md rounded-2xl border border-border/70 bg-surface p-5 shadow-raised sm:mt-10 sm:p-7" aria-live="polite">
        {step === "choose" && <JoinPhoneArt className="mx-auto mb-2 max-w-48" />}
        <p className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-0.5 text-sm text-primary-ink">
          참여코드 <span className="font-mono font-bold tracking-wider tabular-nums">{code}</span>
        </p>
        <h1 className="mt-1 text-title">{room.title}</h1>
        {room.blocked && <Notice tone="coral">지금은 이 수업에 들어갈 수 없어요. 강사님께 문의해 주세요.</Notice>}
        {!room.blocked && room.status === "ended" && <Notice>수업이 끝났어요. 전에 참여했다면 비밀번호로 들어와 복습할 수 있어요.</Notice>}

        {step === "choose" && (
          <div key="choose" className="mt-8 animate-enter-up">
            <ul className="space-y-3">
              <li>
                <ChoiceRow
                  title="처음 왔어요"
                  body={
                    room.status === "active" && room.locked ? (
                      <span className="inline-flex items-center gap-1">
                        <Lock className="size-3.5" aria-hidden /> 입장이 마감돼서 새로 참여할 수 없어요.
                      </span>
                    ) : room.status === "active" && room.full ? (
                      "정원이 다 찼어요."
                    ) : (
                      "닉네임을 정하면 바로 들어가요."
                    )
                  }
                  disabled={!canJoinNew}
                  onClick={() => setStep("nickname")}
                  icon={Sparkles}
                  accent
                />
              </li>
              <li>
                <ChoiceRow
                  title="전에 들어온 적 있어요"
                  body="받아 둔 임시 비밀번호로 이어서 들어가요."
                  disabled={room.blocked}
                  onClick={() => setStep("password")}
                  icon={KeyRound}
                />
              </li>
            </ul>
            <div className="mt-5 flex items-center gap-2">
              <Checkbox id="no-remember" checked={!remember} onCheckedChange={(v) => setRemember(v !== true)} />
              <Label htmlFor="no-remember" className="font-medium">
                이 기기 기억 안 함 <span className="font-normal text-muted-foreground">(공용 PC라면 체크)</span>
              </Label>
            </div>
          </div>
        )}

        {step === "nickname" && (
          <form
            key="nickname"
            className="mt-8 animate-enter-up space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const res = await api<{ roomId: string; nickname: string; password: string }>("/api/join/new", {
                  body: { code, nickname, remember },
                });
                savePassword(res.roomId, res.password);
                setIssued(res);
                setStep("issued");
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="nickname">이 수업에서 쓸 닉네임</Label>
              <Input
                id="nickname"
                autoFocus
                required
                minLength={2}
                maxLength={12}
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="2~12자"
                aria-invalid={Boolean(error)}
                aria-describedby="nickname-help"
              />
              <p id="nickname-help" className="text-sm text-muted-foreground">
                2~12자예요. 같은 방 안에서는 겹칠 수 없어요.
              </p>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || nickname.trim().length < 2}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}다음
            </Button>
            <BackButton onClick={() => (setStep("choose"), setError(null))} />
          </form>
        )}

        {step === "issued" && issued && (
          <div key="issued" className="mt-8 animate-enter-up space-y-5">
            <p>
              <span className="font-semibold">{issued.nickname}</span>님, 반가워요! 다음에 다시 들어올 때 쓸 비밀번호예요.
            </p>
            <div className="relative -rotate-1 rounded-sm bg-coral-soft px-5 pt-6 pb-4 text-center">
              <span aria-hidden className="absolute top-0 left-1/2 h-3 w-14 -translate-x-1/2 -translate-y-1/2 rotate-2 rounded-[2px] bg-border-strong/70" />
              <p className="text-xs font-medium text-coral-ink">임시 비밀번호</p>
              <p
                className="mt-1 font-mono text-4xl font-bold tracking-[0.3em] text-ink tabular-nums"
                aria-label={`비밀번호 ${issued.password.split("").join(" ")}`}
              >
                {issued.password}
              </p>
              <Button variant="ghost" size="sm" className="mt-2" onClick={() => copyText(issued.password, "비밀번호를 복사했어요.")}>
                <Copy aria-hidden /> 복사하기
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              사진을 찍거나 메모해 두세요. 들어온 뒤에도 프로필 메뉴에서 다시 볼 수 있어요(이 기기에서만).
            </p>
            <label
              htmlFor="saved"
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-md border border-border-strong bg-surface px-4 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary-soft"
            >
              <Checkbox id="saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
              <span className="font-medium">비밀번호를 저장했어요</span>
            </label>
            <Button size="lg" className="w-full" disabled={!saved} onClick={enterRoom}>
              입장하기
            </Button>
          </div>
        )}

        {step === "password" && (
          <form
            key="password"
            className="mt-8 animate-enter-up space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(async () => {
                const res = await api<{ nickname: string; ticket: string }>("/api/join/password", { body: { code, password, remember } });
                setConfirm(res);
                setStep("confirm");
              });
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="password">임시 비밀번호</Label>
              <Input
                id="password"
                autoFocus
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value.toUpperCase())}
                placeholder="예: K7M2P9"
                className="h-14 text-center font-mono text-2xl font-semibold tracking-[0.3em]"
                aria-invalid={Boolean(error)}
              />
              <p className="text-sm text-muted-foreground">잊어버렸다면 강사님께 재발급을 요청해 주세요.</p>
            </div>
            {error && <ErrorText>{error}</ErrorText>}
            <Button type="submit" size="lg" className="w-full" disabled={pending || password.trim().length < 6}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}확인
            </Button>
            <BackButton onClick={() => (setStep("choose"), setError(null))} />
          </form>
        )}

        {step === "confirm" && confirm && (
          <div key="confirm" className="mt-8 animate-enter-up space-y-4 text-center">
            <p className="text-heading">
              <span className="text-primary">{confirm.nickname}</span>님으로 들어갈게요
            </p>
            <p className="text-sm text-muted-foreground">다른 기기에서 들어와 있었다면 그 기기는 연결이 끊겨요.</p>
            {error && <ErrorText>{error}</ErrorText>}
            <Button
              size="lg"
              className="w-full"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  await api("/api/join/enter", { body: { ticket: confirm.ticket, remember } });
                  enterRoom();
                })
              }
            >
              {pending && <Loader2 className="animate-spin" aria-hidden />}들어가기
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => (setStep("password"), setPassword(""))}>
              제가 아니에요
            </Button>
          </div>
        )}
      </section>
      <Link href="/join" className="mt-8 self-start text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground sm:self-center">
        다른 참여코드 입력하기
      </Link>
    </main>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-md bg-destructive-soft px-3 py-2 text-sm font-medium text-destructive">
      {children}
    </p>
  );
}

function Notice({ tone, children }: { tone?: "coral"; children: React.ReactNode }) {
  return <p className={`mt-3 rounded-md px-3 py-2 text-sm ${tone === "coral" ? "bg-coral-soft" : "bg-sunken"}`}>{children}</p>;
}

/** 입장 방법 고르기: 큰 터치 영역의 행. accent면 코랄 점으로 첫 선택지임을 알려요. */
function ChoiceRow({
  title,
  body,
  disabled,
  accent,
  icon,
  onClick,
}: {
  title: string;
  body: React.ReactNode;
  disabled?: boolean;
  accent?: boolean;
  icon: LucideIcon;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`press group flex min-h-18 w-full cursor-pointer items-center gap-3 rounded-lg border-2 p-4 text-left transition-[border-color,background-color,box-shadow,transform] duration-150 hover:shadow-raised disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:shadow-none ${accent ? "border-coral/50 bg-coral-soft/60 hover:border-coral" : "border-border bg-surface hover:border-primary/40"}`}
    >
      <IconChip icon={icon} tone={accent ? "coral" : "primary"} size="lg" />
      <span className="flex-1">
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-0.5 block text-sm text-muted-foreground">{body}</span>
      </span>
      <ChevronRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="w-full" onClick={onClick}>
      <ArrowLeft aria-hidden /> 뒤로
    </Button>
  );
}
