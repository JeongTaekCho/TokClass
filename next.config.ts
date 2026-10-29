import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 실시간 수업 앱이라 대부분의 화면이 요청 시점 데이터(세션 쿠키)에 의존해요.
  // Cache Components는 쓰지 않고 기본 동적 렌더링을 사용합니다.
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

export default nextConfig;
