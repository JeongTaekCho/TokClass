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
    <div className="divide-y divide-border rounded-lg border border-border/70 bg-surface px-4 shadow-card">
      {(Object.keys(TEMPLATE_INFO) as BuiltinTemplate[]).map((k) => (
        <div key={k} className="py-2.5">
          <p className="font-medium">{TEMPLATE_INFO[k].name}</p>
          <p className="text-xs text-muted-foreground">
            {TEMPLATE_INFO[k].tabs
              .filter((t) => t.enabled)
              .map((t) => TAB_LABELS[t.key])
              .join(" · ")}
          </p>
        </div>
      ))}
      {templates.map((t) => (
        <div key={t.id} className="flex items-center gap-2 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">{t.name}</p>
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
