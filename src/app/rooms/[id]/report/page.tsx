import type { Metadata } from "next";

import { ReportView } from "@/components/instructor/report-view";
import { requireOwnedRoom } from "@/lib/rooms/instructor";

export const metadata: Metadata = { title: "수업 리포트" };

export default async function ReportPage({ params }: PageProps<"/rooms/[id]/report">) {
  const { id } = await params;
  const { room } = await requireOwnedRoom(id);
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-extrabold">수업 리포트</h1>
      <p className="mb-6 text-muted-foreground">{room.title}</p>
      <ReportView roomId={room.id} title={room.title} />
    </main>
  );
}
