import { InstructorHeader } from "@/components/instructor/instructor-header";
import { instructorDisplayName, requireApprovedInstructor } from "@/lib/supabase/server";

/** 헤더는 레이아웃에 두어 데이터를 불러오는 동안에도 실제 메뉴가 그대로 보여요. 본문만 loading.tsx로 바뀌어요. */
export default async function Layout({ children }: { children: React.ReactNode }) {
  const access = await requireApprovedInstructor("/manage");
  return (
    <div className="min-h-dvh">
      <InstructorHeader name={instructorDisplayName(access)} isAdmin={access.profile.isAdmin} />
      {children}
    </div>
  );
}
