"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, FileText, Loader2, MessageCircleQuestion, NotebookPen, Radio } from "lucide-react";
import { toast } from "sonner";

import { ReactionLayer } from "@/components/room/reaction-layer";
import { PdfView, useStableMaterialUrl } from "@/components/room/slides/pdf";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { swipeHandlers, useKeyNav } from "@/hooks/use-key-nav";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Material } from "@/lib/types";
import { REACTION_EMOJIS } from "@/lib/validation/slides";
import { cn } from "@/lib/utils";

type Note = { materialId: string; page: number; body: string };

/** 반응 연타 방지 (0.7초) */
function passGate(ref: { current: number }) {
  const now = Date.now();
  if (now - ref.current < 700) return false;
  ref.current = now;
  return true;
}

export function StudentSlides() {
  const { roomId, room } = useRoom();
  const { data, mutate } = useSWR<{ materials: Material[] }>(`/api/rooms/${roomId}/materials`, fetcher);
  const materials = data?.materials ?? [];
  const live = { materialId: room.currentMaterialId, page: room.currentPage };
  const [follow, setFollow] = useState(true);
  const [own, setOwn] = useState<{ materialId: string | null; page: number }>({ materialId: null, page: 1 });
  const [askOpen, setAskOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const lastReaction = useRef(0);

  // 강사 위치(room.currentMaterialId/currentPage)는 RoomProvider가 slide.page 이벤트로 갱신해요.
  useRoomEvent("material.changed", () => void mutate());

  const pos = follow ? live : own;
  const material = materials.find((m) => m.id === pos.materialId) ?? (follow ? materials[0] : null) ?? materials[0] ?? null;
  const url = useStableMaterialUrl(material);
  const page = material ? Math.max(1, Math.min(material.id === pos.materialId ? pos.page : 1, material.pageCount || 1)) : 1;

  function move(delta: number) {
    if (!material) return;
    // 직접 넘기면 따라가기를 끄고 자유 탐색
    setFollow(false);
    setOwn({ materialId: material.id, page: Math.max(1, Math.min(page + delta, material.pageCount)) });
  }
  useKeyNav({ prev: () => move(-1), next: () => move(1) }, Boolean(material));

  async function sendReaction(emoji: string) {
    if (!passGate(lastReaction)) return;
    try {
      await api(`/api/rooms/${roomId}/reactions`, { body: { emoji, materialId: material?.id ?? null, page: material ? page : null } });
    } catch (e) {
      toastError(e);
    }
  }

  if (data && materials.length === 0) {
    return (
      <div className="m-auto flex flex-col items-center p-8 text-center text-muted-foreground">
        <FileText className="size-10 text-primary/60" aria-hidden />
        <p className="mt-2">아직 올라온 교안이 없어요.</p>
      </div>
    );
  }

  const offLive = !follow || (material && live.materialId && (material.id !== live.materialId || page !== live.page));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-wrap items-center gap-2 px-3 pt-3">
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
        {offLive && !follow && (
          <Button size="sm" variant="soft" onClick={() => setFollow(true)}>
            강사 페이지로 돌아가기
          </Button>
        )}
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3" {...swipeHandlers(() => move(-1), () => move(1))}>
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

      <div className="flex flex-wrap items-center justify-center gap-1 px-3 py-2" role="group" aria-label="반응 보내기">
        {REACTION_EMOJIS.map((e) => (
          <button key={e} onClick={() => sendReaction(e)} className="inline-flex size-11 cursor-pointer items-center justify-center rounded-xl text-2xl transition hover:bg-primary-soft active:scale-90" aria-label={`${e} 반응`}>
            {e}
          </button>
        ))}
        <Button variant="outline" size="sm" onClick={() => setAskOpen(true)} disabled={!material || room.status === "ended"}>
          <MessageCircleQuestion aria-hidden /> 이 페이지 질문
        </Button>
        <Button variant={noteOpen ? "soft" : "outline"} size="sm" onClick={() => setNoteOpen((v) => !v)} disabled={!material} aria-expanded={noteOpen}>
          <NotebookPen aria-hidden /> 메모
        </Button>
      </div>

      {noteOpen && material && <NoteEditor key={`${material.id}-${page}`} materialId={material.id} page={page} />}
      {material && <PageQuestionDialog open={askOpen} onOpenChange={setAskOpen} materialId={material.id} page={page} />}
    </div>
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
