"use client";

import useSWR from "swr";

import { fetcher } from "@/lib/client/api";
import { useRoom } from "@/lib/realtime/provider";

type Preview = { url: string; title: string; description: string | null; image: string | null; siteName: string };

export function LinkPreview({ url }: { url: string }) {
  const { roomId } = useRoom();
  const { data } = useSWR<{ preview: Preview | null }>(`/api/rooms/${roomId}/link-preview?url=${encodeURIComponent(url)}`, fetcher, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });
  const p = data?.preview;
  if (!p) return null;
  return (
    <a
      href={p.url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="mt-1.5 flex max-w-sm overflow-hidden rounded-md border border-border bg-surface text-left transition-colors hover:border-border-strong"
    >
      {p.image && <img src={p.image} alt="" className="h-auto w-20 shrink-0 object-cover" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="min-w-0 p-2.5">
        <span className="block truncate text-xs text-muted-foreground">{p.siteName}</span>
        <span className="line-clamp-2 text-sm font-medium text-foreground">{p.title}</span>
        {p.description && <span className="line-clamp-2 text-xs text-muted-foreground">{p.description}</span>}
      </span>
    </a>
  );
}
