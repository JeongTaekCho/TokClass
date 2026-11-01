"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { useRoom } from "@/lib/realtime/provider";
import type { Submission } from "@/lib/types";

const URL_OK = /^https?:\/\/\S+$/i;

/** 내 산출물 고치기: 제목·설명·링크 주소·섹션. 파일·이미지를 바꾸려면 지우고 다시 올려요. */
export function SubmissionEditForm({ s, onSaved, onCancel }: { s: Submission; onSaved: (s: Submission) => void; onCancel: () => void }) {
  const { roomId, room } = useRoom();
  const [title, setTitle] = useState(s.title);
  const [body, setBody] = useState(s.body);
  const [url, setUrl] = useState(s.url ?? "");
  const [section, setSection] = useState(s.section ?? "none");
  const [pending, setPending] = useState(false);
  // 조 산출물은 조 섹션에 묶여 있어서 섹션을 고를 수 없어요.
  const sections = s.groupId ? [] : [...new Set([...room.settings.sections, ...(s.section ? [s.section] : [])])];
  const valid = (s.kind !== "text" || body.trim().length > 0) && (s.kind !== "link" || URL_OK.test(url.trim()));

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!valid || pending) return;
        setPending(true);
        try {
          const res = await api<{ submission: Submission }>(`/api/rooms/${roomId}/submissions/${s.id}`, {
            method: "PATCH",
            body: {
              title: title.trim(),
              body: body.trim(),
              ...(s.kind === "link" ? { url: url.trim() } : {}),
              ...(sections.length > 0 ? { section: section === "none" ? null : section } : {}),
            },
          });
          onSaved(res.submission);
          toast.success("산출물을 고쳤어요.");
        } catch (err) {
          toastError(err);
        } finally {
          setPending(false);
        }
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="edit-title">제목 (선택)</Label>
        <Input id="edit-title" value={title} maxLength={100} onChange={(e) => setTitle(e.target.value)} autoFocus />
      </div>
      {s.kind === "link" && (
        <div className="space-y-1.5">
          <Label htmlFor="edit-url">링크</Label>
          <Input id="edit-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" aria-invalid={!URL_OK.test(url.trim()) || undefined} />
        </div>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="edit-body">{s.kind === "text" ? "내용" : "설명 (선택)"}</Label>
        <Textarea id="edit-body" value={body} maxLength={3000} onChange={(e) => setBody(e.target.value)} className="min-h-28" />
        <p className="text-xs text-muted-foreground">설명에 링크를 넣으면 미리보기 카드로 보여요.</p>
      </div>
      {sections.length > 0 && (
        <div className="space-y-1.5">
          <Label>섹션</Label>
          <Select value={section} onValueChange={setSection}>
            <SelectTrigger aria-label="섹션">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">섹션 없음</SelectItem>
              {sections.map((x) => (
                <SelectItem key={x} value={x}>
                  {x}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel} disabled={pending}>
          취소
        </Button>
        <Button type="submit" disabled={!valid || pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden />}저장
        </Button>
      </div>
    </form>
  );
}
