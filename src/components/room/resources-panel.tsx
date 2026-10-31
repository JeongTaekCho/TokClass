"use client";

import { useRef, useState } from "react";
import useSWR from "swr";
import { Download, ExternalLink, FolderOpen, Link2, Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, fetcher } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile } from "@/lib/client/upload";
import { formatBytes } from "@/lib/format";
import { useRoom, useRoomEvent } from "@/lib/realtime/provider";
import type { Material, Resource } from "@/lib/types";

/** 자료실: 다운로드 파일·실습 링크 모음 (강사는 관리도 가능) */
/** 자료실 (강사·수강생 같은 목록). manage면 강사 전용 추가·삭제 도구가 더 보여요. */
export function ResourcesPanel({ manage = false }: { manage?: boolean }) {
  const { roomId } = useRoom();
  const { data, mutate, isLoading } = useSWR<{ resources: Resource[] }>(`/api/rooms/${roomId}/resources`, fetcher);
  const { data: mat } = useSWR<{ materials: Material[] }>(`/api/rooms/${roomId}/materials`, fetcher);
  useRoomEvent("resource.changed", () => void mutate());
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const resources = data?.resources ?? [];

  return (
    <div className="scrollbar-thin min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      {manage && (
        <div className="grid gap-2 rounded-xl bg-muted/60 p-3 sm:grid-cols-[1fr_1.4fr_auto_auto]">
          <p className="text-xs font-semibold text-muted-foreground sm:col-span-4">자료 추가 (강사만 보여요)</p>
          <Input aria-label="자료 제목" placeholder="제목" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} />
          <Input aria-label="링크 주소" placeholder="https://… (링크일 때)" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Button
            variant="outline"
            disabled={busy || !title.trim() || !url.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const res = await api<{ resources: Resource[] }>(`/api/rooms/${roomId}/resources`, { body: { kind: "link", title, url } });
                await mutate(res, { revalidate: false });
                setTitle("");
                setUrl("");
              } catch (e) {
                toastError(e);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Link2 aria-hidden /> 링크 추가
          </Button>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (!file) return;
              setBusy(true);
              try {
                const up = await uploadFile(roomId, "resource", file);
                const res = await api<{ resources: Resource[] }>(`/api/rooms/${roomId}/resources`, {
                  body: { kind: "file", title: title.trim() || file.name, path: up.path, sizeBytes: up.size },
                });
                await mutate(res, { revalidate: false });
                setTitle("");
              } catch (err) {
                toastError(err);
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <Upload aria-hidden />} 파일 올리기
          </Button>
        </div>
      )}

      {(mat?.materials.length ?? 0) > 0 && (
        <section>
          <h3 className="mb-2 text-sm font-bold text-muted-foreground">교안</h3>
          <ul className="space-y-2">
            {mat!.materials.map((m) => (
              <li key={m.id}>
                <a href={m.url ?? "#"} target="_blank" rel="noopener noreferrer" className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40">
                  <Download className="size-5 text-primary" aria-hidden />
                  <span className="flex-1 font-semibold">{m.title}.pdf</span>
                  <span className="text-xs text-muted-foreground">{m.pageCount}쪽</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-2 text-sm font-bold text-muted-foreground">자료·링크</h3>
        {isLoading && <Loader2 className="mx-auto size-5 animate-spin text-muted-foreground" aria-label="불러오는 중" />}
        {!isLoading && resources.length === 0 && (
          <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
            <FolderOpen className="size-4" aria-hidden /> 아직 자료가 없어요.
          </p>
        )}
        <ul className="space-y-2">
          {resources.map((r) => (
            <li key={r.id} className="flex items-center gap-2">
              <a
                href={r.url ?? "#"}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex min-h-12 flex-1 items-center gap-3 rounded-xl border border-border bg-card p-3 hover:border-primary/40"
              >
                {r.kind === "link" ? <ExternalLink className="size-5 text-primary" aria-hidden /> : <Download className="size-5 text-primary" aria-hidden />}
                <span className="min-w-0 flex-1 truncate font-semibold">{r.title}</span>
                {r.kind === "file" && <span className="text-xs text-muted-foreground">{formatBytes(r.sizeBytes)}</span>}
              </a>
              {manage && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`${r.title} 삭제`}
                  onClick={async () => {
                    try {
                      const res = await api<{ resources: Resource[] }>(`/api/rooms/${roomId}/resources/${r.id}`, { method: "DELETE" });
                      await mutate(res, { revalidate: false });
                    } catch (e) {
                      toastError(e);
                    }
                  }}
                >
                  <Trash2 aria-hidden />
                </Button>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
