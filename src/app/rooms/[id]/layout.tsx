import { InstructorHeader } from "@/components/instructor/instructor-header";
import { RoomNav } from "@/components/instructor/room-nav";
import { requireOwnedRoom } from "@/lib/rooms/instructor";
import { instructorDisplayName } from "@/lib/supabase/server";

export default async function RoomLayout({ children, params }: LayoutProps<"/rooms/[id]">) {
  const { id } = await params;
  const { access, room } = await requireOwnedRoom(id);
  return (
    <div className="flex min-h-dvh flex-col">
      <InstructorHeader name={instructorDisplayName(access)} isAdmin={access.profile.isAdmin}>
        <RoomNav roomId={room.id} title={room.title} />
      </InstructorHeader>
      {children}
    </div>
  );
}
