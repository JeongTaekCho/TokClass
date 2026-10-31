"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, FileText, FileUp, Loader2, Maximize, MessageCircleQuestion, NotebookPen, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReactionLayer } from "@/components/room/reaction-layer";
import { countPdfPages, PdfView, useStableMaterialUrl } from "@/components/room/slides/pdf";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { swipeHandlers, useKeyNav } from "@/hooks/use-key-nav";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile } from "@/lib/client/upload";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Material, Question } from "@/lib/types";
import { REACTION_EMOJIS } from "@/lib/validation/slides";
import { cn } from "@/lib/utils";

type Note = { materialId: string; page: number; body: string };
type PagePins = Record<number, { questions: number; reactions: Record<string, number>; total: number }>;

/** 반응 연타 방지 (0.7초) */
function passGate(ref: { current: number }) {
  const now = Date.now();
  if (now - ref.current < 700) return false;
  ref.current = now;
  return true;
}

/**
 * 교안 화면 (강사·수강생 공용). 교안 영역과 페이지 이동은 같은 모양이고,
 * 강사는 교안 관리·페이지별 반응을, 수강생은 따라가기·반응·질문·메모를 더 봐요.
 * 강사가 넘기면 따라가기를 켠 수강생 화면도 같은 페이지로 넘어가요.
 */
export function ClassSlides() {
  const { roomId, room, me, send } = useRoom();
  const isInstructor = me.kind === "instructor";
  const { data, mutate } = useSWR<{ materials: Material[] }>(`/api/rooms/${roomId}/materials`, fetcher);
  const materials = data?.materials ?? [];
  useRoomEvent("material.changed", () => void mutate());

  // 강사 위치(room.currentMaterialId/currentPage)는 RoomProvider가 slide.page 이벤트로 갱신해요.
  const live = { materialId: room.currentMaterialId, page: room.currentPage };
  const [follow, setFollow] = useState(true);
  const [own, setOwn] = useState<{ materialId: string | null; page: number }>(() => (isInstructor ? live : { materialId: null, page: 1 }));
  const following = !isInstructor && follow;
  const pos = following ? live : own;
  const material = materials.find((m) => m.id === pos.materialId) ?? materials[0] ?? null;
  const url = useStableMaterialUrl(material);
  const page = material ? Math.max(1, Math.min(material.id === pos.materialId ? pos.page : 1, material.pageCount || 1)) : 1;

  const stageRef = useRef<HTMLDivElement>(null);
  const persistSlide = useSlidePersist(roomId);

  /** 강사: 모두의 화면을 넘겨요. 수강생: 따라가기를 끄고 혼자 넘겨봐요. */
  function go(materialId: string, nextPage: number) {
    const m = materials.find((x) => x.id === materialId);
    if (!m) return;
    const p = Math.max(1, Math.min(nextPage, m.pageCount || 1));
    setOwn({ materialId, page: p });
    if (!isInstructor) {
      setFollow(false);
      return;
    }
    send("slide.page", { materialId, page: p });
    persistSlide(materialId, p);
  }
  const move = (delta: number) => material && go(material.id, page + delta);
  useKeyNav({ prev: () => move(-1), next: () => move(1) }, Boolean(material));

  const offLive = !following && material && live.materialId && (material.id !== live.materialId || page !== live.page);

  if (data && materials.length === 0) {
    return isInstructor ? (
      <div className="flex min-h-0 flex-1 flex-col p-3">
        <InstructorMaterialBar materials={materials} material={null} onChanged={mutate} onGo={go} stageRef={stageRef} />
        <div className="m-auto flex flex-col items-center p-8 text-center">
          <FileUp className="size-10 text-primary" aria-hidden />
          <p className="mt-2 font-bold">교안 PDF를 올려 주세요</p>
          <p className="text-sm text-muted-foreground">최대 30MB. 넘기면 수강생 화면도 함께 넘어가요.</p>
        </div>
      </div>
    ) : (
      <div className="m-auto flex flex-col items-center p-8 text-center text-muted-foreground">
        <FileText className="size-10 text-primary/60" aria-hidden />
        <p className="mt-2">아직 올라온 교안이 없어요.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
        {isInstructor ? (
          <InstructorMaterialBar materials={materials} material={material} onChanged={mutate} onGo={go} stageRef={stageRef} />
        ) : (
          <>
            <div className="flex items-center gap-2 rounded-xl bg-card px-3 py-1.5 shadow-soft">
              <Switch id="follow" checked={follow} onCheckedChange={setFollow} />
              <Label htmlFor="follow" className="cursor-pointer">
                <Radio className={cn("size-4", follow ? "text-primary" : "text-muted-foreground")} aria-hidden /> 강사 따라가기
              </Label>
            </div>
            {!follow && materials.length > 1 && material && (
              <Select value={material.id} onValueChange={(v) => setOwn({ materialId: v, page: 1 })}>
                <SelectTrigger className="h-10 w-auto max-w-[12rem]" aria-label="교안 선택">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {materials.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {offLive && (
              <Button size="sm" variant="soft" onClick={() => setFollow(true)}>
                강사 페이지로 돌아가기
              </Button>
            )}
          </>
        )}
      </div>

      <div ref={stageRef} className="relative flex min-h-0 flex-1 items-center justify-center p-3 [&:fullscreen]:bg-black" {...swipeHandlers(() => move(-1), () => move(1))}>
        {!material || !url ? <Loader2 className="size-8 animate-spin text-muted-foreground" aria-label="불러오는 중" /> : <PdfView url={url} page={page} title={material.title} />}
        <ReactionLayer />
      </div>

      {material && (
        <div className="flex items-center justify-center gap-3 px-3">
          <Button variant="outline" size="icon" aria-label="이전 페이지" disabled={page <= 1} onClick={() => move(-1)}>
            <ChevronLeft aria-hidden />
          </Button>
          <span className="min-w-16 text-center text-sm font-semibold tabular-nums" aria-live="polite">
            {page} / {material.pageCount}
          </span>
          <Button variant="outline" size="icon" aria-label="다음 페이지" disabled={page >= material.pageCount} onClick={() => move(1)}>
            <ChevronRight aria-hidden />
          </Button>
        </div>
      )}

      {material && (isInstructor ? <PagePinsBar materialId={material.id} page={page} pageCount={material.pageCount} onGo={(p) => go(material.id, p)} /> : <StudentPageActions materialId={material.id} page={page} />)}
    </div>
  );
}

/** 강사 위치를 서버에 저장 (빠르게 넘길 때는 마지막 위치만, 0.4초 뒤) */
function useSlidePersist(roomId: string) {
  const timer = useRef<number | null>(null);
  return (materialId: string, page: number) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      api(`/api/rooms/${roomId}/slide`, { body: { materialId, page } }).catch((e) => console.error("[slide] 위치 저장 실패", e));
    }, 400);
  };
}

/** 강사 전용: 교안 고르기·올리기·삭제·발표 화면 */
function InstructorMaterialBar({
  materials,
  material,
  onChanged,
  onGo,
  stageRef,
}: {
  materials: Material[];
  material: Material | null;
  onChanged: (data?: { materials: Material[] }, opts?: { revalidate: boolean }) => Promise<unknown>;
  onGo: (materialId: string, page: number) => void;
  stageRef: React.RefObject<HTMLDivElement | null>;
}) {
  const { roomId } = useRoom();
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onUpload(file: File) {
    setUploading(true);
    try {
      const pageCount = await countPdfPages(file).catch(() => {
        throw new Error("PDF를 읽지 못했어요. 파일이 손상되지 않았는지 확인해 주세요.");
      });
      const up = await uploadFile(roomId, "material", file);
      const res = await api<{ id: string; materials: Material[] }>(`/api/rooms/${roomId}/materials`, {
        body: { title: file.name.replace(/\.pdf$/i, "").slice(0, 100) || "교안", path: up.path, pageCount, sizeBytes: up.size },
      });
      await onChanged({ materials: res.materials }, { revalidate: false });
      onGo(res.id, 1);
      toast.success(`교안을 올렸어요 (${pageCount}쪽)`);
    } catch (e) {
      if (e instanceof Error && !("status" in e)) toast.error(e.message);
      else toastError(e);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      {materials.length > 0 && material && (
        <Select value={material.id} onValueChange={(v) => onGo(v, 1)}>
          <SelectTrigger className="h-10 w-auto max-w-xs" aria-label="교안 선택">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {materials.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {m.title} ({m.pageCount}쪽)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onUpload(f);
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading}>
        {uploading ? <Loader2 className="animate-spin" aria-hidden /> : <FileUp aria-hidden />} PDF 올리기
      </Button>
      {material && (
        <ConfirmButton
          title="교안을 삭제할까요?"
          description={`'${material.title}'과 페이지 반응·메모가 함께 삭제돼요.`}
          confirmLabel="삭제"
          destructive
          onConfirm={async () => {
            try {
              const res = await api<{ materials: Material[] }>(`/api/rooms/${roomId}/materials/${material.id}`, { method: "DELETE" });
              await onChanged(res, { revalidate: false });
              const next = res.materials[0];
              if (next) onGo(next.id, 1);
            } catch (e) {
              toastError(e);
            }
          }}
        >
          <Button variant="ghost" size="icon-sm" aria-label="교안 삭제">
            <Trash2 aria-hidden />
          </Button>
        </ConfirmButton>
      )}
      {material && (
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => stageRef.current?.requestFullscreen?.().catch(() => {})}>
          <Maximize aria-hidden /> 발표 화면
        </Button>
      )}
    </div>
  );
}

/** 강사 전용: 페이지별 질문·반응 수와 지금 페이지 질문 */
function PagePinsBar({ materialId, page, pageCount, onGo }: { materialId: string; page: number; pageCount: number; onGo: (page: number) => void }) {
  const { roomId } = useRoom();
  const { data: pinData, mutate: mutatePins } = useSWR<{ pins: PagePins }>(`/api/rooms/${roomId}/pins?materialId=${materialId}`, fetcher);
  const { data: qData, mutate: mutateQ } = useSWR<{ questions: Question[] }>(`/api/rooms/${roomId}/questions?materialId=${materialId}&page=${page}`, fetcher);
  const pinsTimer = useRef<number | null>(null);
  useRoomEvent("pins.changed", (p) => {
    if (p.materialId !== materialId || pinsTimer.current) return;
    pinsTimer.current = window.setTimeout(() => {
      pinsTimer.current = null;
      void mutatePins();
      void mutateQ();
    }, 800);
  });
  useRoomEvent("qa.changed", ({ question }) => {
    if (question?.materialId === materialId) void mutateQ();
  });
  const pins = pinData?.pins ?? {};
  const current = pins[page];

  return (
    <div className="px-3 py-2">
      <div className="scrollbar-thin flex gap-1.5 overflow-x-auto pb-1" aria-label="페이지별 반응">
        {Array.from({ length: pageCount }, (_, i) => i + 1).map((p) => {
          const pin = pins[p];
          return (
            <button
              key={p}
              onClick={() => onGo(p)}
              aria-current={p === page ? "page" : undefined}
              aria-label={`${p}페이지${pin ? `, 질문 ${pin.questions}개, 반응 ${pin.total - pin.questions}개` : ""}`}
              className={cn(
                "relative flex min-h-10 min-w-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition",
                p === page ? "border-primary bg-primary text-white" : "border-border bg-card hover:border-primary/40",
              )}
            >
              {p}
              {pin && pin.total > 0 && (
                <span className={cn("absolute -top-1.5 -right-1.5 rounded-full px-1.5 text-[10px] leading-4 font-bold", pin.questions > 0 ? "bg-coral text-white" : "bg-primary-soft text-primary-hover")}>
                  {pin.total}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {(current || (qData?.questions.length ?? 0) > 0) && (
        <div className="mt-2 rounded-xl bg-muted/60 p-3 text-sm">
          <p className="font-semibold">{page}페이지 반응 (강사만 보여요)</p>
          {current && Object.keys(current.reactions).length > 0 && (
            <p className="mt-1 flex flex-wrap gap-2">
              {Object.entries(current.reactions).map(([emoji, n]) => (
                <span key={emoji} className="rounded-full bg-card px-2 py-0.5">
                  {emoji} {n}
                </span>
              ))}
            </p>
          )}
          <ul className="mt-2 space-y-1">
            {qData?.questions.map((q) => (
              <li key={q.id} className="flex items-start gap-1.5">
                <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-coral" aria-hidden />
                <span>
                  {q.body} <span className="text-muted-foreground">· 👍 {q.voteCount}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** 수강생 전용: 반응 보내기·이 페이지 질문·내 메모 */
function StudentPageActions({ materialId, page }: { materialId: string; page: number }) {
  const { roomId, room } = useRoom();
  const [askOpen, setAskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const lastReaction = useRef(0);

  async function sendReaction(emoji: string) {
    if (!passGate(lastReaction)) return;
    try {
      await api(`/api/rooms/${roomId}/reactions`, { body: { emoji, materialId, page } });
    } catch (e) {
      toastError(e);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-1 px-3 py-2" role="group" aria-label="반응 보내기">
        {REACTION_EMOJIS.map((e) => (
          <button key={e} onClick={() => sendReaction(e)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-2xl transition hover:bg-primary-soft active:scale-90" aria-label={`${e} 반응`}>
            {e}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => setAskOpen(true)} disabled={room.status === "ended"}>
          <MessageCircleQuestion aria-hidden /> 이 페이지 질문
        </Button>
        <Button variant={noteOpen ? "soft" : "outline"} size="sm" onClick={() => setNoteOpen((v) => !v)} aria-expanded={noteOpen}>
          <NotebookPen aria-hidden /> 메모
        </Button>
      </div>
      {noteOpen && <NoteEditor key={`${materialId}-${page}`} materialId={materialId} page={page} />}
      <PageQuestionDialog open={askOpen} onOpenChange={setAskOpen} materialId={materialId} page={page} />
    </>
  );
}

function NoteEditor({ materialId, page }: { materialId: string; page: number }) {
  const { roomId } = useRoom();
  const key = `/api/rooms/${roomId}/notes?materialId=${materialId}`;
  const { data, mutate } = useSWR<{ notes: Note[] }>(key, fetcher);
  const saved = data?.notes.find((n) => n.page === page)?.body ?? "";
  const [text, setText] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<number | null>(null);
  const value = text ?? saved;

  function save(body: string) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      setState("saving");
      try {
        await api(`/api/rooms/${roomId}/notes`, { method: "PUT", body: { materialId, page, body } });
        setState("saved");
        void mutate();
      } catch (e) {
        setState("idle");
        toastError(e);
      }
    }, 700);
  }

  return (
    <div className="border-t border-border bg-card px-3 py-2">
      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{page}페이지 내 메모 (나만 보여요)</span>
        <span aria-live="polite">{state === "saving" ? "저장 중…" : state === "saved" ? "저장했어요" : ""}</span>
      </div>
      <Textarea
        value={value}
        maxLength={2000}
        onChange={(e) => {
          setText(e.target.value);
          save(e.target.value);
        }}
        placeholder="이 페이지에서 기억할 내용을 적어요"
        aria-label={`${page}페이지 메모`}
        className="max-h-40 min-h-16"
      />
    </div>
  );
}

function PageQuestionDialog({ open, onOpenChange, materialId, page }: { open: boolean; onOpenChange: (v: boolean) => void; materialId: string; page: number }) {
  const { roomId } = useRoom();
  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(true);
  const [pending, setPending] = useState(false);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{page}페이지에 질문하기</DialogTitle>
          <DialogDescription>Q&A 탭에도 함께 올라가요. 강사님 화면에서 페이지별로 모아 볼 수 있어요.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              await api(`/api/rooms/${roomId}/questions`, { body: { body, anonymous, materialId, page } });
              toast.success("질문을 올렸어요.");
              setBody("");
              onOpenChange(false);
            } catch (err) {
              toastError(err);
            } finally {
              setPending(false);
            }
          }}
        >
          <Textarea value={body} maxLength={500} onChange={(e) => setBody(e.target.value)} placeholder="궁금한 점을 적어 주세요" aria-label="질문 내용" autoFocus />
          <div className="flex items-center gap-2">
            <Checkbox id="pq-anon" checked={anonymous} onCheckedChange={(v) => setAnonymous(v === true)} />
            <Label htmlFor="pq-anon">익명으로 올리기</Label>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending || !body.trim()}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}질문 올리기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
