"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Copy, Link2, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { api, setActingAs } from "@/lib/client/api";
import { copyText } from "@/lib/client/clipboard";
import { useOrigin } from "@/lib/client/use-origin";
import { toastError } from "@/lib/client/toast-error";
import { TAB_LABELS, type TabSetting } from "@/lib/rooms/templates";
import type { PublicRoom } from "@/lib/types";
import { cn } from "@/lib/utils";

function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ToggleRow({ id, label, description, checked, onChange }: { id: string; label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <Label htmlFor={id}>{label}</Label>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function RoomSettingsForm({ initialRoom, readonlyToken }: { initialRoom: PublicRoom; readonlyToken: string | null; siteUrl: string }) {
  const router = useRouter();
  const [room, setRoom] = useState(initialRoom);
  const [title, setTitle] = useState(initialRoom.title);
  const [startsAt, setStartsAt] = useState(toLocalInput(initialRoom.startsAt));
  const [capacity, setCapacity] = useState(initialRoom.capacity);
  const [tabs, setTabs] = useState<TabSetting[]>(initialRoom.settings.tabs);
  const [defaultTab, setDefaultTab] = useState(initialRoom.settings.defaultTab);
  const [sectionInput, setSectionInput] = useState("");
  const [token, setToken] = useState(readonlyToken);
  const [templateName, setTemplateName] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const origin = useOrigin();

  useEffect(() => {
    setActingAs("instructor");
  }, []);

  async function patch(body: Record<string, unknown>, key: string, success = "저장했어요.") {
    setSaving(key);
    try {
      const res = await api<{ room: PublicRoom }>(`/api/rooms/${room.id}`, { method: "PATCH", body });
      setRoom(res.room);
      toast.success(success);
      router.refresh();
      return res.room;
    } catch (e) {
      toastError(e);
    } finally {
      setSaving(null);
    }
  }

  const moveTab = (idx: number, dir: -1 | 1) => {
    const next = [...tabs];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    setTabs(next);
  };

  const enabledTabs = tabs.filter((t) => t.enabled);
  const sections = room.settings.sections;

  return (
    <div className="space-y-6">
      <Section title="기본 정보">
        <form
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            patch({ title, startsAt: startsAt ? new Date(startsAt).toISOString() : null, capacity }, "basic");
          }}
        >
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="s-title">수업명</Label>
            <Input id="s-title" value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-starts">수업 일시</Label>
            <Input id="s-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="s-cap">정원 (최대 100명)</Label>
            <Input id="s-cap" type="number" min={1} max={100} value={capacity} onChange={(e) => setCapacity(Math.min(100, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={saving === "basic"}>
              {saving === "basic" && <Loader2 className="animate-spin" aria-hidden />}저장
            </Button>
          </div>
        </form>
      </Section>

      <Section title="탭 구성" description="수강생 화면 상단 탭이에요. 켜기/끄기, 순서, 첫 화면을 정할 수 있어요.">
        <ol className="space-y-2">
          {tabs.map((t, i) => (
            <li key={t.key} className={cn("flex items-center gap-3 rounded-xl border p-2 pl-3", t.enabled ? "border-border" : "border-dashed bg-muted/50")}>
              <Switch
                aria-label={`${TAB_LABELS[t.key]} 탭 사용`}
                checked={t.enabled}
                onCheckedChange={(v) => setTabs(tabs.map((x) => (x.key === t.key ? { ...x, enabled: v } : x)))}
              />
              <span className="flex-1 font-semibold">{TAB_LABELS[t.key]}</span>
              <label className="flex min-h-10 cursor-pointer items-center gap-1.5 text-sm text-muted-foreground">
                <input
                  type="radio"
                  name="defaultTab"
                  className="size-4 accent-[var(--primary)]"
                  checked={defaultTab === t.key}
                  disabled={!t.enabled}
                  onChange={() => setDefaultTab(t.key)}
                />
                첫 화면
              </label>
              <Button variant="ghost" size="icon-sm" aria-label={`${TAB_LABELS[t.key]} 위로`} disabled={i === 0} onClick={() => moveTab(i, -1)}>
                <ArrowUp aria-hidden />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label={`${TAB_LABELS[t.key]} 아래로`} disabled={i === tabs.length - 1} onClick={() => moveTab(i, 1)}>
                <ArrowDown aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
        <Button
          className="mt-4"
          disabled={enabledTabs.length === 0 || saving === "tabs"}
          onClick={() => patch({ tabs, defaultTab: enabledTabs.some((t) => t.key === defaultTab) ? defaultTab : enabledTabs[0]?.key }, "tabs")}
        >
          {saving === "tabs" && <Loader2 className="animate-spin" aria-hidden />}탭 저장
        </Button>
        {enabledTabs.length === 0 && <p className="mt-2 text-sm text-coral">탭을 하나 이상 켜 주세요.</p>}
      </Section>

      <Section title="수업 운영">
        <div className="divide-y divide-border">
          <ToggleRow id="t-lock" label="입장 마감 (방 잠금)" description="새로운 수강생이 들어올 수 없어요. 이미 참여한 사람은 다시 들어올 수 있어요." checked={room.locked} onChange={(v) => patch({ locked: v }, "lock", v ? "입장을 마감했어요." : "입장을 다시 열었어요.")} />
          <ToggleRow id="t-focus" label="집중 모드" description="수강생 채팅을 잠시 잠가요." checked={room.focusMode} onChange={(v) => patch({ focusMode: v }, "focus", v ? "집중 모드를 켰어요." : "집중 모드를 껐어요.")} />
          <ToggleRow id="t-reveal" label="익명 질문 작성자 확인" description="켜면 강사 화면에서 익명 질문의 작성자가 보여요. 수강생에게는 계속 익명이에요." checked={room.settings.qaRevealAuthor} onChange={(v) => patch({ qaRevealAuthor: v }, "reveal")} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ redThreshold: Number(new FormData(e.currentTarget).get("red")) }, "red");
            }}
          >
            <Label htmlFor="s-red">🔴 막혔어요 강조 기준 (%)</Label>
            <div className="flex gap-2">
              <Input id="s-red" name="red" type="number" min={5} max={100} defaultValue={room.settings.redThreshold} />
              <Button type="submit" variant="outline">저장</Button>
            </div>
          </form>
          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              patch({ aiDailyLimit: Number(new FormData(e.currentTarget).get("ai")) }, "ai");
            }}
          >
            <Label htmlFor="s-ai">AI 질문 정리 하루 한도 (회)</Label>
            <div className="flex gap-2">
              <Input id="s-ai" name="ai" type="number" min={0} max={200} defaultValue={room.settings.aiDailyLimit} />
              <Button type="submit" variant="outline">저장</Button>
            </div>
          </form>
        </div>
      </Section>

      <Section title="산출물 보드 섹션" description="주차·조별처럼 보드를 나눠 볼 섹션이에요. 조 활동을 마치면 조 이름 섹션이 자동으로 생겨요.">
        <div className="flex flex-wrap gap-2">
          {sections.length === 0 && <p className="text-sm text-muted-foreground">아직 섹션이 없어요.</p>}
          {sections.map((s) => (
            <span key={s} className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-1 pr-1 pl-3 text-sm font-semibold text-primary-hover">
              {s}
              <button
                type="button"
                className="inline-flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-white"
                aria-label={`${s} 섹션 삭제`}
                onClick={() => patch({ sections: sections.filter((x) => x !== s) }, "sections")}
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </span>
          ))}
        </div>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = sectionInput.trim();
            if (!v) return;
            patch({ sections: [...sections, v] }, "sections").then(() => setSectionInput(""));
          }}
        >
          <Input aria-label="새 섹션 이름" placeholder="예: 1주차" maxLength={30} value={sectionInput} onChange={(e) => setSectionInput(e.target.value)} />
          <Button type="submit" variant="outline">
            <Plus aria-hidden /> 추가
          </Button>
        </form>
      </Section>

      <Section title="읽기 전용 링크" description="청강생·관계자에게 수업 내용을 보여주는 링크예요. 채팅·투표 등 참여는 할 수 없어요.">
        {token ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly aria-label="읽기 전용 링크" value={`${origin}/view/${token}`} />
              <Button variant="outline" onClick={() => copyText(`${origin}/view/${token}`, "링크를 복사했어요.")}>
                <Copy aria-hidden /> 복사
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  try {
                    const r = await api<{ token: string }>(`/api/rooms/${room.id}/readonly`, { method: "POST" });
                    setToken(r.token);
                    toast.success("새 링크를 만들었어요. 이전 링크는 더 이상 열리지 않아요.");
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                새 링크로 바꾸기
              </Button>
              <Button
                variant="ghost"
                onClick={async () => {
                  try {
                    await api(`/api/rooms/${room.id}/readonly`, { method: "DELETE" });
                    setToken(null);
                    toast.success("읽기 전용 링크를 껐어요.");
                  } catch (e) {
                    toastError(e);
                  }
                }}
              >
                링크 끄기
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const r = await api<{ token: string }>(`/api/rooms/${room.id}/readonly`, { method: "POST" });
                setToken(r.token);
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <Link2 aria-hidden /> 읽기 전용 링크 만들기
          </Button>
        )}
      </Section>

      <Section title="템플릿으로 저장" description="지금 방의 탭 구성과 운영 설정을 다음 방에서 그대로 쓸 수 있어요.">
        <form
          className="flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              await api(`/api/rooms/${room.id}/save-template`, { body: { name: templateName } });
              toast.success("템플릿으로 저장했어요. 대시보드에서 새 방을 만들 때 고를 수 있어요.");
              setTemplateName("");
            } catch (err) {
              toastError(err);
            }
          }}
        >
          <Input aria-label="템플릿 이름" placeholder="예: 6시간 실습 수업" maxLength={40} value={templateName} onChange={(e) => setTemplateName(e.target.value)} />
          <Button type="submit" variant="outline" disabled={!templateName.trim()}>
            저장
          </Button>
        </form>
      </Section>

      <Section title="수업 종료·초기화·삭제">
        <div className="flex flex-wrap gap-2">
          {room.status === "active" ? (
            <ConfirmButton
              title="수업을 종료할까요?"
              description="수강생은 더 이상 채팅·활동에 참여할 수 없고, 복습 페이지만 볼 수 있어요. 참여코드는 다른 방에서 다시 쓰일 수 있어요."
              confirmLabel="수업 종료"
              onConfirm={() => void patch({ status: "ended" }, "status", "수업을 종료했어요.")}
            >
              <Button variant="outline">수업 종료</Button>
            </ConfirmButton>
          ) : (
            <Button variant="outline" onClick={() => patch({ status: "active" }, "status", "수업을 다시 열었어요.")}>
              수업 다시 열기
            </Button>
          )}
          <ConfirmButton
            title="전체 초기화할까요?"
            description="참여자, 채팅, Q&A, 산출물, 활동 응답, 이해도 기록이 모두 지워져요. 교안·자료실·활동 구성은 남아요. 되돌릴 수 없어요."
            confirmLabel="전체 초기화"
            destructive
            onConfirm={async () => {
              try {
                await api(`/api/rooms/${room.id}/reset`, { method: "POST" });
                toast.success("방을 초기화했어요.");
                router.refresh();
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <Button variant="outline" className="text-destructive">
              전체 초기화
            </Button>
          </ConfirmButton>
          <ConfirmButton
            title="방을 삭제할까요?"
            description={`'${room.title}' 방과 모든 기록·파일이 영구히 삭제돼요. 되돌릴 수 없어요.`}
            confirmLabel="영구 삭제"
            destructive
            onConfirm={async () => {
              try {
                await api(`/api/rooms/${room.id}`, { method: "DELETE" });
                toast.success("방을 삭제했어요.");
                router.push("/dashboard");
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <Button variant="destructive">방 삭제</Button>
          </ConfirmButton>
        </div>
      </Section>
    </div>
  );
}
