import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/*
 * 실제 콘텐츠와 같은 모양·크기의 스켈레톤.
 * 줄 높이와 여백을 실제 행과 맞춰서, 데이터가 들어와도 레이아웃이 밀리지 않게 해요.
 * 스크린리더에는 "불러오는 중이에요" 한 번만 알려요.
 */

function Loading({ label = "불러오는 중이에요", className, children }: { label?: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div aria-hidden className={className}>
        {children}
      </div>
    </div>
  );
}

const CHAT_WIDTHS = ["w-48", "w-64", "w-36", "w-56", "w-40", "w-60"];

/** 채팅·1:1 대화 메시지 줄 */
export function ChatSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Loading label="메시지를 불러오는 중이에요" className="space-y-3">
      {Array.from({ length: rows }, (_, i) => {
        const mine = i % 3 === 2;
        return (
          <div key={i} className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}>
            {!mine && <Skeleton className="ml-1 h-3 w-16" />}
            <Skeleton className={cn("h-10 max-w-[85%] rounded-xl", CHAT_WIDTHS[i % CHAT_WIDTHS.length])} />
          </div>
        );
      })}
    </Loading>
  );
}

/** Q&A 질문 행: 공감 버튼 + 이름 줄 + 본문 두 줄 */
export function QuestionListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <li className="list-none">
      <Loading label="질문을 불러오는 중이에요" className="divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-start gap-2 py-3">
            <Skeleton className="size-11 shrink-0" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className={cn("h-4", i % 2 ? "w-1/2" : "w-3/4")} />
            </div>
          </div>
        ))}
      </Loading>
    </li>
  );
}

/** 산출물 보드: 4:3 썸네일 + 제목 + 메타 줄. 실제 그리드와 같은 열 수예요. */
export function BoardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Loading label="산출물을 불러오는 중이에요" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-lg border border-border bg-surface">
          <Skeleton className="aspect-[4/3] w-full rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

/** 자료실·교안 목록 행 */
export function ResourceListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <Loading label="자료를 불러오는 중이에요" className="divide-y divide-border rounded-lg border border-border/70 bg-surface px-4 shadow-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex min-h-12 items-center gap-3 px-1 py-3">
          <Skeleton className="size-4" />
          <Skeleton className={cn("h-4", i % 2 ? "w-40" : "w-56")} />
          <Skeleton className="ml-auto h-3 w-10" />
        </div>
      ))}
    </Loading>
  );
}

/** 활동 팝업 본문: 안내 줄 + 선택지 버튼 세 개 + 제출 버튼 */
export function ActivitySkeleton() {
  return (
    <Loading label="활동을 불러오는 중이에요" className="space-y-2">
      <Skeleton className="h-4 w-32" />
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
      <Skeleton className="mt-2 h-12 w-full" />
    </Loading>
  );
}

/** 수강생 표 행. 체크박스(선택)·닉네임·나머지 열·관리 버튼 모양을 따라가요. (tbody 안에 넣어요) */
export function ParticipantTableSkeleton({ columns, rows = 6, checkbox = false }: { columns: number; rows?: number; checkbox?: boolean }) {
  const middle = columns - (checkbox ? 3 : 2);
  return (
    <>
      <tr className="sr-only">
        <td role="status" colSpan={columns}>
          수강생 목록을 불러오는 중이에요
        </td>
      </tr>
      {Array.from({ length: rows }, (_, i) => (
        <tr key={i} aria-hidden className="border-b border-border last:border-0">
          {checkbox && (
            <td className="px-4 py-3">
              <Skeleton className="size-5 rounded-sm" />
            </td>
          )}
          <td className={checkbox ? "px-2 py-3" : "px-4 py-3"}>
            <Skeleton className={cn("h-4", i % 2 ? "w-20" : "w-28")} />
          </td>
          {Array.from({ length: middle }, (_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className={cn("h-4", j === 0 ? "w-24" : "w-16")} />
            </td>
          ))}
          <td className="px-4 py-3">
            <Skeleton className="ml-auto size-8" />
          </td>
        </tr>
      ))}
    </>
  );
}

/** 수강생 상세 시트의 활동 요약: 제목 + 숫자 한 줄 / 제목 + 이해도 막대 세 줄 / 제목 + 도움 요청 줄 */
export function ActivitySummarySkeleton() {
  return (
    <Loading label="활동 기록을 불러오는 중이에요" className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-12" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-24" />
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      <div className="space-y-2">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-full" />
      </div>
    </Loading>
  );
}

/** 수업 리포트: 요약 두 줄 + 추이 차트 영역 + 두 단 목록 */
export function ReportSkeleton() {
  return (
    <Loading label="리포트를 만드는 중이에요" className="space-y-10">
      <div className="space-y-2 rounded-lg border border-border/70 bg-surface px-5 shadow-card py-5">
        <Skeleton className="h-6 w-80 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-56 w-full" />
      </div>
      <div className="grid gap-10 border-t border-border pt-8 lg:grid-cols-2">
        {[0, 1].map((c) => (
          <div key={c} className="space-y-3">
            <Skeleton className="h-5 w-36" />
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        ))}
      </div>
    </Loading>
  );
}

/** 페이지 제목 + 설명 */
export function PageHeaderSkeleton() {
  return (
    <div aria-hidden className="mb-6 space-y-2">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-4 w-72 max-w-full" />
    </div>
  );
}

/** 대시보드 방 목록 행: 제목·부제 / 코드 / 인원 / 버튼 */
export function RoomListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <Loading label="방 목록을 불러오는 중이에요" className="divide-y divide-border rounded-lg border border-border/70 bg-surface px-4 shadow-card">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-4 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto]">
          <div className="space-y-1.5">
            <Skeleton className={cn("h-5", i % 2 ? "w-44" : "w-60")} />
            <Skeleton className="h-4 w-36" />
          </div>
          <Skeleton className="hidden h-4 w-16 sm:block" />
          <Skeleton className="hidden h-4 w-14 sm:block" />
          <Skeleton className="h-9 w-28" />
        </div>
      ))}
    </Loading>
  );
}

/** 관리자·수강생 관리 표: 머리줄 + 행 */
export function TableSkeleton({ columns = 5, rows = 8 }: { columns?: number; rows?: number }) {
  return (
    <Loading label="목록을 불러오는 중이에요" className="border-y border-border">
      <div className="flex gap-6 border-b border-border bg-sunken px-4 py-3">
        {Array.from({ length: columns }, (_, j) => (
          <Skeleton key={j} className="h-3 w-14 bg-border" />
        ))}
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-b border-border px-4 py-3 last:border-0">
          {Array.from({ length: columns }, (_, j) => (
            <Skeleton key={j} className={cn("h-4", j === 0 ? (i % 2 ? "w-32" : "w-44") : "w-16")} />
          ))}
        </div>
      ))}
    </Loading>
  );
}

/** 수업 화면: 제목 줄 + 탭 + 본문 */
export function ClassroomSkeleton() {
  return (
    <Loading label="수업 화면을 불러오는 중이에요" className="flex h-full flex-col">
      <div className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="ml-auto h-9 w-24" />
        </div>
        <div className="mx-auto flex max-w-5xl gap-5 px-3 pb-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-4 w-12" />
          ))}
        </div>
      </div>
      <div className="mx-auto w-full max-w-5xl flex-1 p-3">
        <Skeleton className="aspect-[4/3] w-full sm:aspect-video" />
      </div>
    </Loading>
  );
}

/** 교안 한 장: 4:3 비율 자리. 교안이 뜨면 같은 자리에 들어와요. */
export function SlideSkeleton({ className }: { className?: string }) {
  return (
    <Loading label="교안을 불러오는 중이에요" className={cn("w-full", className)}>
      <Skeleton className="mx-auto aspect-[4/3] w-full max-w-3xl" />
    </Loading>
  );
}
