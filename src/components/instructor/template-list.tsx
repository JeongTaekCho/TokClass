"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { api, setActingAs } from "@/lib/client/api";
import { toastError } from "@/lib/client/toast-error";
import { TEMPLATE_INFO, TAB_LABELS, type BuiltinTemplate } from "@/lib/rooms/templates";

export function TemplateList({ templates }: { templates: { id: string; name: string; created_at: string }[] }) {
  const router = useRouter();
  return (
    <div className="space-y-3">
      {(Object.keys(TEMPLATE_INFO) as BuiltinTemplate[]).map((k) => (
        <div key={k} className="rounded-xl border border-border bg-card p-3">
          <p className="font-bold">{TEMPLATE_INFO[k].name}</p>
          <p className="text-xs text-muted-foreground">
            {TEMPLATE_INFO[k].tabs
              .filter((t) => t.enabled)
              .map((t) => TAB_LABELS[t.key])
              .join(" · ")}
          </p>
        </div>
      ))}
      {templates.map((t) => (
        <div key={t.id} className="flex items-center gap-2 rounded-xl border border-primary/30 bg-primary-soft/40 p-3">
          <div className="min-w-0 flex-1">
            <p className="truncate font-bold">{t.name}</p>
            <p className="text-xs text-muted-foreground">내 템플릿</p>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`${t.name} 템플릿 삭제`}
            onClick={async () => {
              if (!confirm(`'${t.name}' 템플릿을 삭제할까요?`)) return;
              try {
                setActingAs("instructor");
                await api(`/api/templates/${t.id}`, { method: "DELETE" });
                toast.success("템플릿을 삭제했어요.");
                router.refresh();
              } catch (e) {
                toastError(e);
              }
            }}
          >
            <Trash2 aria-hidden />
          </Button>
        </div>
      ))}
    </div>
  );
}
