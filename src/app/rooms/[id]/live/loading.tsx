import { ClassroomSkeleton } from "@/components/skeletons";

export default function Loading() {
  return (
    <div className="h-[calc(100dvh-4rem)]">
      <ClassroomSkeleton />
    </div>
  );
}
