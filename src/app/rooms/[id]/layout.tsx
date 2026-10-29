import { InstructorHeader } from "@/components/instructor/instructor-header";
import { RoomNav } from "@/components/instructor/room-nav";
import { requireOwnedRoom } from "@/lib/rooms/instructor";

export default async function RoomLayout({ children, params }: LayoutProps<"/rooms/[id]">) {
  const { id } = await params;
  const { user, room } = await requireOwnedRoom(id);
  return (
    <div className="flex min-h-dvh flex-col">
      <InstructorHeader name={(user.user_metadata?.name as string | undefined) ?? user.email}>
        <RoomNav roomId={room.id} title={room.title} />
      </InstructorHeader>
      {children}
    </div>
  );
}
