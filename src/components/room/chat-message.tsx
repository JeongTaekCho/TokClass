"use client";

import { useEffect, useRef } from "react";
import { EyeOff, GraduationCap, MoreHorizontal, SmilePlus } from "lucide-react";

import { LinkPreview } from "@/components/room/link-preview";
import { firstUrl, MessageBody } from "@/components/room/message-body";
import { AnimatePresence, motion, spring, useAnimationControls } from "@/components/motion";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDay, formatTime } from "@/lib/format";
import type { ChatMessage, MessageReaction } from "@/lib/types";
import { REACTION_EMOJIS } from "@/lib/validation/slides";
import { cn } from "@/lib/utils";

const EMOJI_LABEL: Record<string, string> = { "👍": "좋아요", "👏": "박수", "❤️": "하트", "😮": "놀라워요", "😂": "웃겨요", "🤔": "궁금해요" };

// 수강생 아바타 색: 이름 대신 id로 고정해서, 닉네임이 같아도 사람마다 색이 달라요.
const AVATAR_TONES = ["bg-coral-soft text-coral-ink", "bg-sky-soft text-sky-ink", "bg-lilac-soft text-lilac-ink", "bg-mint-soft text-success", "bg-sun-soft text-warning"];

function toneFor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR_TONES[Math.abs(h) % AVATAR_TONES.length]!;
}

function Avatar({ m }: { m: ChatMessage }) {
  if (m.author.kind === "instructor") {
    return (
      <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-brand" aria-hidden>
        <GraduationCap className="size-4" />
      </span>
    );
  }
  return (
    <span className={cn("flex size-8 items-center justify-center rounded-full text-sm font-bold", toneFor(m.author.id ?? m.author.nickname))} aria-hidden>
      {[...m.author.nickname][0] ?? "?"}
    </span>
  );
}

export function DayDivider({ iso }: { iso: string }) {
  return (
    <div role="separator" className="flex items-center gap-3 py-3 text-xs font-medium text-muted-foreground">
      <span className="h-px flex-1 bg-border" />
      <span className="rounded-full bg-surface px-3 py-1 shadow-card">{formatDay(iso)}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

type Props = {
  m: ChatMessage;
  hidden: boolean;
  mine: boolean;
  /** 같은 사람이 이어서 보낸 메시지 묶음의 첫 번째/마지막인지 */
  first: boolean;
  last: boolean;
  reactions: MessageReaction[];
  myKey: string;
  canReact: boolean;
  canModerate: boolean;
  onReact: (emoji: string) => void;
  onToggleHidden: () => void;
};

export function MessageItem({ m, hidden, mine, first, last, reactions, myKey, canReact, canModerate, onReact, onToggleHidden }: Props) {
  const url = !hidden ? firstUrl(m.body) : null;
  const isInstructor = m.author.kind === "instructor";
  const showContent = !hidden || canModerate;
  const reactable = canReact && !hidden;
  const myEmojis = new Set(reactions.filter((r) => r.reactors.includes(myKey)).map((r) => r.emoji));

  return (
    <motion.div
      className={cn("group/msg flex gap-2", mine && "flex-row-reverse", first ? "pt-3" : "pt-1")}
      initial={{ opacity: 0, y: 8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={spring}
      style={{ originX: mine ? 1 : 0, originY: 1 }}
    >
      {!mine && <div className="w-8 shrink-0">{first && <Avatar m={m} />}</div>}
      <div className={cn("flex max-w-[84%] min-w-0 flex-col", mine ? "items-end" : "items-start")}>
        {first && !mine && (
          <p className="mb-1 flex items-center gap-1.5 px-1 text-[13px]">
            <span className={cn("font-semibold", isInstructor ? "text-primary-ink" : "text-foreground")}>{isInstructor ? "강사" : m.author.nickname}</span>
            {isInstructor && <span className="rounded-full bg-primary-soft px-1.5 py-px text-[11px] font-semibold text-primary-ink">진행자</span>}
          </p>
        )}
        <div className={cn("flex max-w-full items-end gap-1.5", mine && "flex-row-reverse")}>
          <div
            className={cn(
              "max-w-full min-w-0 rounded-[20px] px-3.5 py-2 [overflow-wrap:anywhere]",
              // 이어 보낸 말풍선은 보낸 사람 쪽 모서리를 좁혀서 한 묶음으로 보이게 해요.
              mine ? cn("rounded-br-md", !first && "rounded-tr-md") : cn("rounded-bl-md", !first && "rounded-tl-md"),
              hidden
                ? "border border-dashed border-border-strong bg-sunken text-muted-foreground"
                : mine
                  ? "bg-primary text-primary-foreground shadow-brand"
                  : isInstructor
                    ? "bg-primary-soft text-foreground ring-1 ring-primary/15"
                    : "bg-surface text-foreground shadow-card ring-1 ring-border/60",
            )}
          >
            {!showContent ? (
              <p className="flex items-center gap-1.5 text-sm italic">
                <EyeOff className="size-3.5" aria-hidden /> 강사가 숨긴 메시지예요.
              </p>
            ) : (
              <>
                {hidden && (
                  <p className="mb-1 flex items-center gap-1 text-xs font-semibold">
                    <EyeOff className="size-3.5" aria-hidden /> 숨김 처리됨 · 수강생에게 안 보여요
                  </p>
                )}
                {m.imageUrl && (
                  <a href={m.imageUrl} target="_blank" rel="noopener noreferrer">
                    <img src={m.imageUrl} alt={`${m.author.nickname}님이 올린 이미지`} className="my-1 max-h-72 rounded-xl object-contain" loading="lazy" />
                  </a>
                )}
                {m.body && <MessageBody text={m.body} inverse={mine && !hidden} />}
              </>
            )}
          </div>
          <div className={cn("flex shrink-0 flex-col gap-0.5 pb-0.5", mine ? "items-end" : "items-start")}>
            {(reactable || canModerate) && (
              <div
                className={cn(
                  "flex items-center gap-0.5 opacity-0 transition-opacity group-hover/msg:opacity-100 focus-within:opacity-100 has-[[data-state=open]]:opacity-100 [@media(hover:none)]:opacity-100",
                  mine && "flex-row-reverse",
                )}
              >
                {reactable && (
                  <ReactionPicker mine={mine} myEmojis={myEmojis} onPick={onReact}>
                    <button type="button" className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:bg-surface hover:text-foreground hover:shadow-card" aria-label="반응 남기기">
                      <SmilePlus className="size-4" aria-hidden />
                    </button>
                  </ReactionPicker>
                )}
                {canModerate && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button type="button" className="relative inline-flex size-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground after:absolute after:-inset-2 after:content-[''] hover:bg-surface hover:text-foreground hover:shadow-card" aria-label="메시지 관리">
                        <MoreHorizontal className="size-4" aria-hidden />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align={mine ? "end" : "start"}>
                      <DropdownMenuItem onSelect={onToggleHidden}>
                        <EyeOff aria-hidden /> {hidden ? "다시 보이기" : "숨기기"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            )}
            {last && (
              <time dateTime={m.createdAt} className="px-0.5 text-[11px] whitespace-nowrap text-muted-foreground tabular-nums">
                {formatTime(m.createdAt)}
              </time>
            )}
          </div>
        </div>
        {!hidden && reactions.length > 0 && (
          <ReactionBar reactions={reactions} myKey={myKey} mine={mine} canReact={reactable} myEmojis={myEmojis} onReact={onReact} />
        )}
        {url && <LinkPreview url={url} />}
      </div>
    </motion.div>
  );
}

function ReactionPicker({ mine, myEmojis, onPick, children }: { mine: boolean; myEmojis: Set<string>; onPick: (emoji: string) => void; children: React.ReactNode }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{children}</DropdownMenuTrigger>
      <DropdownMenuContent side="top" align={mine ? "end" : "start"} aria-label="반응 고르기" className="flex min-w-0 gap-0.5 rounded-full p-1.5">
        {REACTION_EMOJIS.map((e) => (
          <DropdownMenuItem
            key={e}
            onSelect={() => onPick(e)}
            aria-label={`${EMOJI_LABEL[e] ?? e}${myEmojis.has(e) ? " (누름, 다시 누르면 취소)" : ""}`}
            className={cn(
              "size-10 min-h-0 justify-center rounded-full p-0 text-[22px] leading-none transition-transform duration-150 hover:scale-125 focus:scale-125 motion-reduce:hover:scale-100 motion-reduce:focus:scale-100",
              myEmojis.has(e) && "bg-primary-soft focus:bg-primary-soft",
            )}
          >
            <span aria-hidden>{e}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReactionBar({
  reactions,
  myKey,
  mine,
  canReact,
  myEmojis,
  onReact,
}: {
  reactions: MessageReaction[];
  myKey: string;
  mine: boolean;
  canReact: boolean;
  myEmojis: Set<string>;
  onReact: (emoji: string) => void;
}) {
  return (
    <div className={cn("mt-1 flex flex-wrap gap-1", mine ? "justify-end" : "justify-start")}>
      <AnimatePresence initial={false} mode="popLayout">
        {reactions.map((r) => (
          <ReactionChip key={r.emoji} r={r} active={r.reactors.includes(myKey)} canReact={canReact} onReact={onReact} />
        ))}
      </AnimatePresence>
      {canReact && myEmojis.size < REACTION_EMOJIS.length && (
        <ReactionPicker mine={mine} myEmojis={myEmojis} onPick={onReact}>
          <button
            type="button"
            className="relative inline-flex h-7 cursor-pointer items-center rounded-full border border-dashed after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] border-border-strong px-2 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary-soft hover:text-primary-ink"
            aria-label="다른 반응 남기기"
          >
            <SmilePlus className="size-3.5" aria-hidden />
          </button>
        </ReactionPicker>
      )}
    </div>
  );
}

function namesLabel(names: string[]) {
  return names.length <= 5 ? names.join(", ") : `${names.slice(0, 5).join(", ")} 외 ${names.length - 5}명`;
}

function ReactionChip({ r, active, canReact, onReact }: { r: MessageReaction; active: boolean; canReact: boolean; onReact: (emoji: string) => void }) {
  const controls = useAnimationControls();
  const prev = useRef(r.count);
  // 누군가 같은 반응을 더하면 이모지가 한 번 통 튀어요.
  useEffect(() => {
    if (r.count > prev.current) void controls.start({ scale: [1, 1.35, 1], transition: { duration: 0.35 } });
    prev.current = r.count;
  }, [r.count, controls]);

  const label = `${EMOJI_LABEL[r.emoji] ?? r.emoji} ${r.count}명${active ? ", 나도 누름" : ""}`;
  // disabled 대신 aria-disabled를 써서, 누를 수 없을 때(종료·집중 모드)도 누가 눌렀는지 툴팁을 볼 수 있어요.
  return (
    <motion.span layout initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={spring}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            aria-disabled={!canReact}
            aria-pressed={active}
            aria-label={label}
            onClick={() => canReact && onReact(r.emoji)}
            className={cn(
              "relative inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[13px] font-semibold tabular-nums transition-colors after:absolute after:-inset-y-2 after:inset-x-0 after:content-[''] aria-disabled:cursor-default",
              canReact && "cursor-pointer",
              active ? "border-primary/50 bg-primary-soft text-primary-ink" : "border-border bg-surface text-muted-foreground shadow-card",
              canReact && !active && "hover:border-border-strong hover:text-foreground",
            )}
          >
            <motion.span animate={controls} className="text-[15px] leading-none" aria-hidden>
              {r.emoji}
            </motion.span>
            <span aria-hidden>{r.count}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{namesLabel(r.names)}</TooltipContent>
      </Tooltip>
    </motion.span>
  );
}
