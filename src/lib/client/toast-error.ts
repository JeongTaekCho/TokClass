"use client";

import { toast } from "sonner";

import { ClientApiError } from "@/lib/client/api";

export function toastError(e: unknown, fallback = "잠시 문제가 생겼어요. 다시 시도해 주세요.") {
  if (e instanceof ClientApiError) {
    toast.error(e.message);
  } else {
    console.error(e);
    toast.error(fallback);
  }
}
