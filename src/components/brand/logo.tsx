import Link from "next/link";

import { cn } from "@/lib/utils";

export function LogoMark({ className, title = "톡클" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 64 64" role="img" aria-label={title} className={cn("size-9", className)}>
      <defs>
        <clipPath id="tk-mark-clip">
          <path d="M24 9a17 17 0 1 1-10.6 30.3L6 43l2.6-8.1A17 17 0 0 1 24 9z" />
        </clipPath>
      </defs>
      <path d="M24 9a17 17 0 1 1-10.6 30.3L6 43l2.6-8.1A17 17 0 0 1 24 9z" fill="#FF6B4A" />
      <path d="M40 21a17 17 0 1 0 10.6 30.3L58 55l-2.6-8.1A17 17 0 0 0 40 21z" fill="#4F46E5" />
      <path
        clipPath="url(#tk-mark-clip)"
        d="M40 21a17 17 0 1 0 10.6 30.3L58 55l-2.6-8.1A17 17 0 0 0 40 21z"
        fill="#8B3FB8"
      />
      <circle cx="13.5" cy="22" r="2.2" fill="#fff" />
      <circle cx="19.5" cy="22" r="2.2" fill="#fff" />
      <circle cx="25.5" cy="22" r="2.2" fill="#fff" />
      <path d="M40.5 43.5c2.6 3 7.4 3 10 0" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ href = "/", className, size = "md" }: { href?: string | null; className?: string; size?: "sm" | "md" | "lg" }) {
  const content = (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark className={size === "lg" ? "size-12" : size === "sm" ? "size-7" : "size-9"} title="" />
      <span
        className={cn(
          "font-extrabold tracking-tight text-foreground",
          size === "lg" ? "text-3xl" : size === "sm" ? "text-lg" : "text-xl",
        )}
      >
        톡클
      </span>
    </span>
  );
  if (href === null) return content;
  return (
    <Link href={href} aria-label="톡클 홈" className="rounded-lg">
      {content}
    </Link>
  );
}
