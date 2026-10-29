"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { ChevronLeft, ChevronRight, FileUp, Loader2, Maximize, MessageCircleQuestion, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { ReactionLayer } from "@/components/room/reaction-layer";
import { countPdfPages, PdfView, useStableMaterialUrl } from "@/components/room/slides/pdf";
import { Button } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useKeyNav } from "@/hooks/use-key-nav";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile } from "@/lib/client/upload";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Material, Question } from "@/lib/types";
import { cn } from "@/lib/utils";

type PagePins = Record<number, { questions: number; reactions: Record<string, number>; total: number }>;

export function InstructorSlides() {
  const { roomId, room, send } = useRoom();
  const { data, mutate } = useSWR<{ materials: Material[] }>(`/api/rooms/${roomId}/materials`, fetcher);
  const materials = data?.materials ?? [];
  const [pos, setPos] = useState<{ materialId: string | null; page: number }>({ materialId: room.currentMaterialId, page: room.currentPage });
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const persistTimer = useRef<number | null>(null);

  const material = materials.find((m) => m.id === pos.materialId) ?? materials[0] ?? null;
  const url = useStableMaterialUrl(material);
  const page = material && pos.materialId === material.id ? Math.min(pos.page, material.pageCount || 1) : 1;

  const { data: pinData, mutate: mutatePins } = useSWR<{ pins: PagePins }>(material ? `/api/rooms/${roomId}/pins?materialId=${material.id}` : null, fetcher);
  const { data: qData, mutate: mutateQ } = useSWR<{ questions: Question[] }>(
    material ? `/api/rooms/${roomId}/questions?materialId=${material.id}&page=${page}` : null,
    fetcher,
  );
  const pinsTimer = useRef<number | null>(null);
  useRoomEvent("pins.changed", ({ materialId }) => {
    if (materialId !== material?.id || pinsTimer.current) return;
    pinsTimer.current = window.setTimeout(() => {
      pinsTimer.current = null;
      void mutatePins();
      void mutateQ();
    }, 800);
  });
  useRoomEvent("material.changed", () => void mutate());

  function go(materialId: string, nextPage: number) {
    const m = materials.find((x) => x.id === materialId);
    if (!m) return;
    const p = Math.max(1, Math.min(nextPage, m.pageCount || 1));
    setPos({ materialId, page: p });
    send("slide.page", { materialId, page: p });
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = window.setTimeout(() => {
      api(`/api/rooms/${roomId}/slide`, { body: { materialId, page: p } }).catch((e) => console.error("[slide] 위치 저장 실패", e));
    }, 400);
  }

  useKeyNav({ prev: () => material && go(material.id, page - 1), next: () => material && go(material.id, page + 1) }, Boolean(material));

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
      await mutate({ materials: res.materials }, { revalidate: false });
      go(res.id, 1);
      toast.success(`교안을 올렸어요 (${pageCount}쪽)`);
    } catch (e) {
      if (e instanceof Error && !("status" in e)) toast.error(e.message);
      else toastError(e);
    } finally {
      setUploading(false);
    }
  }

  const pins = pinData?.pins ?? {};
  const current = pins[page];

  return (
    <section aria-labelledby="slides-title" className="rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="slides-title" className="sr-only">
          교안
        </h2>
        {materials.length > 0 && material && (
          <Select value={material.id} onValueChange={(v) => go(v, 1)}>
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
                await mutate(res, { revalidate: false });
                const next = res.materials[0];
                if (next) go(next.id, 1);
                else setPos({ materialId: null, page: 1 });
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

      {!material ? (
        <div className="flex aspect-video flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-primary-soft/30 p-6 text-center">
          <FileUp className="size-10 text-primary" aria-hidden />
          <p className="mt-2 font-bold">교안 PDF를 올려 주세요</p>
          <p className="text-sm text-muted-foreground">최대 30MB. 넘기면 수강생 화면도 함께 넘어가요.</p>
        </div>
      ) : (
        <>
          <div ref={stageRef} className="relative flex aspect-video items-center justify-center rounded-xl bg-[#f1eff8] p-2 [&:fullscreen]:bg-black">
            {url && <PdfView url={url} page={page} title={material.title} />}
            <ReactionLayer />
            <button className="absolute inset-y-0 left-0 w-1/5 cursor-w-resize" aria-label="이전 페이지" onClick={() => go(material.id, page - 1)} />
            <button className="absolute inset-y-0 right-0 w-1/5 cursor-e-resize" aria-label="다음 페이지" onClick={() => go(material.id, page + 1)} />
          </div>
          <div className="mt-3 flex items-center justify-center gap-3">
            <Button variant="outline" size="icon" aria-label="이전 페이지" disabled={page <= 1} onClick={() => go(material.id, page - 1)}>
              <ChevronLeft aria-hidden />
            </Button>
            <span className="min-w-20 text-center font-semibold tabular-nums" aria-live="polite">
              {page} / {material.pageCount}
            </span>
            <Button variant="outline" size="icon" aria-label="다음 페이지" disabled={page >= material.pageCount} onClick={() => go(material.id, page + 1)}>
              <ChevronRight aria-hidden />
            </Button>
          </div>

          <div className="scrollbar-thin mt-3 flex gap-1.5 overflow-x-auto pb-1" aria-label="페이지별 반응">
            {Array.from({ length: material.pageCount }, (_, i) => i + 1).map((p) => {
              const pin = pins[p];
              return (
                <button
                  key={p}
                  onClick={() => go(material.id, p)}
                  aria-current={p === page ? "page" : undefined}
                  aria-label={`${p}페이지${pin ? `, 질문 ${pin.questions}개, 반응 ${pin.total - pin.questions}개` : ""}`}
                  className={cn(
                    "relative flex min-h-11 min-w-11 shrink-0 cursor-pointer flex-col items-center justify-center rounded-lg border px-2 text-sm font-semibold tabular-nums transition",
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
            <div className="mt-3 rounded-xl bg-muted/60 p-3 text-sm">
              <p className="font-semibold">{page}페이지 반응</p>
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
        </>
      )}
    </section>
  );
}
