import type { Metadata } from "next";
import { Settings2 } from "lucide-react";

import { PageHeader } from "@/components/page-header";
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
      <PageHeader icon={Settings2} title="방 설정" description="수업 정보, 탭 구성, 운영 방식을 정해요." />
      <RoomSettingsForm initialRoom={toPublicRoom(room)} readonlyToken={room.readonly_token} siteUrl={serverEnv.siteUrl} />
    </main>
  );
}
