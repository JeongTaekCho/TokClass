import Link from "next/link";

import { NotFoundArt } from "@/components/illustrations";
import { StatusScreen } from "@/components/status-screen";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <StatusScreen
      art={<NotFoundArt />}
      title="페이지를 찾을 수 없어요"
      actions={
        <>
          <Button asChild>
            <Link href="/">처음으로</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/join">수업 참여하기</Link>
          </Button>
        </>
      }
    >
      주소가 바뀌었거나 삭제된 페이지예요.
    </StatusScreen>
  );
}
