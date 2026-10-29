import type { Metadata } from "next";

import { LiveApp } from "@/components/instructor/live/live-app";
import { requireOwnedRoom } from "@/lib/rooms/instructor";
import { toPublicRoom } from "@/lib/rooms/public";

export const metadata: Metadata = { title: "수업 진행" };

export default async function LivePage({ params }: PageProps<"/rooms/[id]/live">) {
  const { id } = await params;
  const { room, user } = await requireOwnedRoom(id);
  return <LiveApp room={toPublicRoom(room)} me={{ kind: "instructor", id: user.id, nickname: "강사" }} />;
}
