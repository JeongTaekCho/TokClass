"use client";

import useSWR from "swr";

type Preview = { url: string; title: string; description: string | null; image: string | null; siteName: string };

const fetchPreview = (url: string) => fetch(url).then((r) => r.json() as Promise<{ preview: Preview | null }>);

export function LinkPreview({ url }: { url: string }) {
  const { data } = useSWR(`/api/link-preview?url=${encodeURIComponent(url)}`, fetchPreview, {
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
      className="mt-1.5 flex max-w-sm overflow-hidden rounded-xl border border-border bg-card text-left transition hover:border-primary/40"
    >
      {p.image && <img src={p.image} alt="" className="h-auto w-20 shrink-0 object-cover" loading="lazy" referrerPolicy="no-referrer" />}
      <span className="min-w-0 p-2.5">
        <span className="block truncate text-xs text-muted-foreground">{p.siteName}</span>
        <span className="line-clamp-2 text-sm font-semibold text-foreground">{p.title}</span>
        {p.description && <span className="line-clamp-2 text-xs text-muted-foreground">{p.description}</span>}
      </span>
    </a>
  );
}
