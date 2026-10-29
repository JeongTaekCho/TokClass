"use client";

import { useRef, useState } from "react";
import { FileUp, ImagePlus, Link2, Loader2, Type, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { uploadFile, type UploadedFile } from "@/lib/client/upload";
import { useRoom } from "@/lib/realtime/provider";
import type { Submission } from "@/lib/types";
import { cn } from "@/lib/utils";

type Kind = Submission["kind"];
const KINDS: { kind: Kind; label: string; icon: typeof ImagePlus }[] = [
  { kind: "image", label: "이미지", icon: ImagePlus },
  { kind: "file", label: "파일", icon: FileUp },
  { kind: "link", label: "링크", icon: Link2 },
  { kind: "text", label: "텍스트", icon: Type },
];

export function SubmitDialog({ onCreated, groupLabel }: { onCreated: (s: Submission) => void; groupLabel?: string | null }) {
  const { roomId, room } = useRoom();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("image");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [section, setSection] = useState<string>("none");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const sections = room.settings.sections;

  function reset() {
    setTitle("");
    setBody("");
    setUrl("");
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  const ready = kind === "text" ? body.trim().length > 0 : kind === "link" ? /^https?:\/\/\S+$/i.test(url.trim()) : Boolean(file);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm" disabled={room.status !== "active"}>
          <Upload aria-hidden /> 올리기
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>산출물 올리기</DialogTitle>
          <DialogDescription>{groupLabel ? `${groupLabel} 섹션에 올라가요.` : "모두가 보고 댓글·스티커로 피드백할 수 있어요."}</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            try {
              let up: UploadedFile | null = null;
              if ((kind === "image" || kind === "file") && file) up = await uploadFile(roomId, "submission", file);
              const res = await api<{ submission: Submission }>(`/api/rooms/${roomId}/submissions`, {
                body: {
                  kind,
                  title,
                  body,
                  url: kind === "link" ? url.trim() : null,
                  path: up?.path ?? null,
                  fileName: up?.name ?? null,
                  mime: up?.mime ?? null,
                  size: up?.size ?? 0,
                  section: section === "none" ? null : section,
                },
              });
              toast.success("산출물을 올렸어요!");
              onCreated(res.submission);
              reset();
              setOpen(false);
            } catch (err) {
              toastError(err);
            } finally {
              setPending(false);
            }
          }}
        >
          <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="종류">
            {KINDS.map((k) => (
              <button
                type="button"
                role="radio"
                aria-checked={kind === k.kind}
                key={k.kind}
                onClick={() => {
                  setKind(k.kind);
                  setFile(null);
                  setPreview(null);
                }}
                className={cn("flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border text-sm font-semibold", kind === k.kind ? "border-primary bg-primary-soft text-primary-hover" : "border-border")}
              >
                <k.icon className="size-5" aria-hidden />
                {k.label}
              </button>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sub-title">제목 (선택)</Label>
            <Input id="sub-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} placeholder="예: 회의록 요약 프롬프트" />
          </div>

          {(kind === "image" || kind === "file") && (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/gif" : ".pdf,.txt,.md,.csv,.zip,.docx,.pptx,.xlsx,.doc,.ppt,.xls,.hwp,.hwpx,image/*"}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  e.target.value = "";
                  setFile(f);
                  if (preview) URL.revokeObjectURL(preview);
                  setPreview(f && f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex min-h-32 w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/30 bg-primary-soft/30 p-4 text-sm text-muted-foreground hover:border-primary"
              >
                {preview ? (
                  <img src={preview} alt="미리보기" className="max-h-48 rounded-lg object-contain" />
                ) : file ? (
                  <span className="font-semibold text-foreground">{file.name}</span>
                ) : (
                  <>
                    <Upload className="size-6 text-primary" aria-hidden />
                    {kind === "image" ? "이미지를 골라 주세요 (자동으로 줄여서 올려요)" : "파일을 골라 주세요 (10MB 이하)"}
                  </>
                )}
              </button>
            </div>
          )}
          {kind === "link" && (
            <div className="space-y-1.5">
              <Label htmlFor="sub-url">링크</Label>
              <Input id="sub-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="sub-body">{kind === "text" ? "내용" : "설명 (선택)"}</Label>
            <Textarea id="sub-body" value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} className={kind === "text" ? "min-h-32" : ""} />
          </div>
          {!groupLabel && sections.length > 0 && (
            <div className="space-y-1.5">
              <Label>섹션</Label>
              <Select value={section} onValueChange={setSection}>
                <SelectTrigger aria-label="섹션">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">섹션 없음</SelectItem>
                  {sections.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={pending || !ready}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}올리기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
