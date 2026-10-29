// react-pdf가 쓰는 pdfjs-dist 버전과 같은 워커 파일을 public/으로 복사해요 (dev·build 전에 실행).
import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));
const fromReactPdf = createRequire(require.resolve("react-pdf"));
const src = fromReactPdf.resolve("pdfjs-dist/build/pdf.worker.min.mjs");
mkdirSync(join(root, "public"), { recursive: true });
copyFileSync(src, join(root, "public", "pdf.worker.min.mjs"));
console.log("[pdf-worker] public/pdf.worker.min.mjs 준비 완료");
