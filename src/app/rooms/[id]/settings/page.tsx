import type { Metadata } from "next";

import { RoomSettingsForm } from "@/components/instructor/room-settings-form";
import { toPublicRoom } from "@/lib/rooms/public";
import { requireOwnedRoom } from "@/lib/rooms/instructor";
import { serverEnv } from "@/lib/env";

export const metadata: Metadata = { title: "방 설정" };

export default async function SettingsPage({ params }: PageProps<"/rooms/[id]/settings">) {
  const { id } = await params;
  const { room } = await requireOwnedRoom(id);
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <h1 className="mb-6 text-2xl font-extrabold">방 설정</h1>
      <RoomSettingsForm initialRoom={toPublicRoom(room)} readonlyToken={room.readonly_token} siteUrl={serverEnv.siteUrl} />
    </main>
  );
}
