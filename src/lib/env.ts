import "server-only";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경변수 ${name}이(가) 설정되지 않았어요. README의 환경변수 목록을 확인해 주세요.`);
  }
  return value;
}

export const serverEnv = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get serviceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  /** 수강생용 Realtime JWT 서명 (Supabase 프로젝트의 JWT Secret) */
  get supabaseJwtSecret() {
    return required("SUPABASE_JWT_SECRET");
  },
  /** 수강생 비밀번호 HMAC 키 */
  get passwordSecret() {
    return required("PARTICIPANT_PASSWORD_SECRET");
  },
  /** 수강생 세션 쿠키 서명 키 */
  get sessionSecret() {
    return required("SESSION_SECRET");
  },
  get siteUrl() {
    return process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  },
  get isProduction() {
    return process.env.NODE_ENV === "production";
  },
};
