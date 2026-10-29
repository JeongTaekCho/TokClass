"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api, setActingAs } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { TEMPLATE_INFO, type BuiltinTemplate } from "@/lib/rooms/templates";
import { cn } from "@/lib/utils";

type MyTemplate = { id: string; name: string };

export function NewRoomDialog({ templates, defaultTemplate }: { templates: MyTemplate[]; defaultTemplate?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [template, setTemplate] = useState(defaultTemplate ?? "lecture");
  const [title, setTitle] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [capacity, setCapacity] = useState(60);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    try {
      setActingAs("instructor");
      const res = await api<{ id: string }>("/api/rooms", {
        body: { title, startsAt: startsAt ? new Date(startsAt).toISOString() : null, capacity, template },
      });
      setOpen(false);
      router.push(`/rooms/${res.id}/live`);
    } catch (err) {
      toastError(err);
    } finally {
      setPending(false);
    }
  }

  const options: { value: string; name: string; description: string }[] = [
    ...(Object.keys(TEMPLATE_INFO) as BuiltinTemplate[]).map((k) => ({ value: k, name: TEMPLATE_INFO[k].name, description: TEMPLATE_INFO[k].description })),
    ...templates.map((t) => ({ value: `tpl:${t.id}`, name: t.name, description: "내가 저장한 템플릿" })),
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="lg">
          <Plus aria-hidden /> 새 방 만들기
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>새 방 만들기</DialogTitle>
          <DialogDescription>방을 만들면 6자리 참여코드와 QR이 바로 생겨요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="room-title">수업명</Label>
            <Input id="room-title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="예: 생성형 AI 실무 활용 1회차" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="room-starts">수업 일시</Label>
              <Input id="room-starts" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room-capacity">정원 (최대 100명)</Label>
              <Input
                id="room-capacity"
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Math.min(100, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
          </div>
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold">템플릿</legend>
            <div className="grid gap-2 sm:grid-cols-3" role="radiogroup">
              {options.map((o) => (
                <button
                  type="button"
                  role="radio"
                  aria-checked={template === o.value}
                  key={o.value}
                  onClick={() => setTemplate(o.value)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-xl border p-3 text-left transition",
                    template === o.value ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="block font-bold">{o.name}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{o.description}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <DialogFooter>
            <Button type="submit" size="lg" disabled={pending || !title.trim()}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}방 만들기
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
