"use client";

import { toast } from "sonner";

export async function copyText(text: string, done = "복사했어요.") {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(done);
  } catch {
    // 일부 환경(http, 오래된 브라우저)에서는 clipboard API가 막혀 있어요.
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    if (ok) toast.success(done);
    else toast.error("복사하지 못했어요. 직접 선택해서 복사해 주세요.");
  }
}
