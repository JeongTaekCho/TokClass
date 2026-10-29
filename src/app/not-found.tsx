import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 text-center">
      <Logo size="lg" />
      <h1 className="mt-6 text-2xl font-extrabold">페이지를 찾을 수 없어요</h1>
      <p className="mt-2 text-muted-foreground">주소가 바뀌었거나 삭제된 페이지예요.</p>
      <div className="mt-6 flex gap-2">
        <Button asChild>
          <Link href="/">처음으로</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/join">수업 참여하기</Link>
        </Button>
      </div>
    </main>
  );
}
