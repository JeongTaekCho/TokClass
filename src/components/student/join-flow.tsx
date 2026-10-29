"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Copy, KeyRound, Loader2, Lock, UserPlus } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, ClientApiError, setActingAs } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { savePassword } from "@/lib/client/password-store";
import { toastError } from "@/lib/client/toast-error";

type RoomInfo = { id: string; title: string; status: "active" | "ended"; locked: boolean; full: boolean };
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

  const canJoinNew = room.status === "active" && !room.locked && !room.full;

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
    <main className="flex min-h-dvh flex-col items-center px-4 py-8">
      <div className="mb-6">
        <Logo size="md" />
      </div>
      <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-lifted sm:p-8" aria-live="polite">
        <p className="text-sm font-semibold text-primary">참여코드 {code}</p>
        <h1 className="mt-1 text-2xl leading-snug font-extrabold">{room.title}</h1>
        {room.status === "ended" && <p className="mt-2 rounded-xl bg-muted px-3 py-2 text-sm">수업이 끝났어요. 전에 참여했다면 비밀번호로 들어와 복습할 수 있어요.</p>}

        {step === "choose" && (
          <div className="mt-6 space-y-3">
            <Button size="lg" className="h-14 w-full text-base" disabled={!canJoinNew} onClick={() => setStep("nickname")}>
              <UserPlus aria-hidden /> 닉네임으로 새로 참여
            </Button>
            {room.status === "active" && room.locked && (
              <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Lock className="size-4" aria-hidden /> 입장이 마감돼서 새로 참여할 수 없어요.
              </p>
            )}
            {room.status === "active" && !room.locked && room.full && <p className="text-sm text-muted-foreground">정원이 다 찼어요.</p>}
            <Button size="lg" variant="outline" className="h-14 w-full text-base" onClick={() => setStep("password")}>
              <KeyRound aria-hidden /> 비밀번호로 참여하기
            </Button>
            <div className="flex items-center gap-2 pt-2">
              <Checkbox id="no-remember" checked={!remember} onCheckedChange={(v) => setRemember(v !== true)} />
              <Label htmlFor="no-remember" className="font-medium">
                이 기기 기억 안 함 <span className="font-normal text-muted-foreground">(공용 PC라면 체크)</span>
              </Label>
            </div>
          </div>
        )}

        {step === "nickname" && (
          <form
            className="mt-6 space-y-4"
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
              <Label htmlFor="nickname">닉네임</Label>
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
                이 수업에서 쓸 이름이에요. 같은 방 안에서는 겹칠 수 없어요.
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
          <div className="mt-6 space-y-4">
            <p className="font-semibold">{issued.nickname}님의 임시 비밀번호예요</p>
            <div className="rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft p-5 text-center">
              <p className="font-mono text-4xl font-extrabold tracking-[0.3em] text-primary-hover" aria-label={`비밀번호 ${issued.password.split("").join(" ")}`}>
                {issued.password}
              </p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => copyText(issued.password, "비밀번호를 복사했어요.")}>
                <Copy aria-hidden /> 복사
              </Button>
            </div>
            <p className="rounded-xl bg-coral-soft px-3 py-2 text-sm text-foreground">
              다음에 이 비밀번호로 다시 들어올 수 있어요. 사진을 찍거나 메모해 두세요. 들어온 뒤에도 프로필 메뉴에서 다시 볼 수 있어요(이 기기에서만).
            </p>
            <div className="flex items-center gap-2">
              <Checkbox id="saved" checked={saved} onCheckedChange={(v) => setSaved(v === true)} />
              <Label htmlFor="saved">저장했어요</Label>
            </div>
            <Button size="lg" className="w-full" disabled={!saved} onClick={enterRoom}>
              입장하기
            </Button>
          </div>
        )}

        {step === "password" && (
          <form
            className="mt-6 space-y-4"
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
                className="h-14 text-center font-mono text-2xl font-bold tracking-[0.3em]"
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
          <div className="mt-6 space-y-4 text-center">
            <p className="text-xl font-bold">
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
      <Link href="/join" className="mt-6 text-sm text-muted-foreground underline-offset-4 hover:underline">
        다른 참여코드 입력하기
      </Link>
    </main>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="rounded-xl bg-coral-soft px-3 py-2 text-sm font-medium text-[#b42318]">
      {children}
    </p>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="ghost" className="w-full" onClick={onClick}>
      <ArrowLeft aria-hidden /> 뒤로
    </Button>
  );
}
