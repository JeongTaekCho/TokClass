"use client";

export class ClientApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string,
    public data?: Record<string, unknown>,
  ) {
    super(message);
  }
}

let actingAs: "instructor" | "participant" = "participant";

/** 강사 화면에서는 instructor로 설정해서, 같은 브라우저의 수강생 쿠키보다 강사 세션을 우선해요. */
export function setActingAs(role: "instructor" | "participant") {
  actingAs = role;
}

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: {
        ...(init.body !== undefined ? { "Content-Type": "application/json" } : {}),
        "x-tk-as": actingAs,
      },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: init.signal,
      cache: "no-store",
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    console.error("[api] 네트워크 오류", e);
    throw new ClientApiError(0, "인터넷 연결을 확인해 주세요.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status >= 500) console.error("[api] 서버 오류", path, data);
    throw new ClientApiError(res.status, data?.error || "잠시 문제가 생겼어요. 다시 시도해 주세요.", data?.code, data);
  }
  return data as T;
}

export const fetcher = <T,>(path: string) => api<T>(path);
