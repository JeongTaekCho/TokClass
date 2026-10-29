import type { Metadata } from "next";

import { StudentApp } from "@/components/student/student-app";
import { requireParticipant } from "@/lib/rooms/student";

export const metadata: Metadata = { title: "수업" };

export default async function StudentRoomPage({ params }: PageProps<"/r/[code]">) {
  const { code } = await params;
  const { publicRoom, me } = await requireParticipant(code);
  return <StudentApp room={publicRoom} me={me} code={code} />;
}
