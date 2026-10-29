"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Maximize2, QrCode } from "lucide-react";

import { LogoMark } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { copyText } from "@/lib/client/clipboard";
import { useOrigin } from "@/lib/client/use-origin";
import { useRoom } from "@/lib/realtime/provider";

function useQr(text: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!text) return;
    let alive = true;
    QRCode.toDataURL(text, { width: 640, margin: 1, color: { dark: "#1F1B3A", light: "#FFFFFF" } })
      .then((url) => alive && setSrc(url))
      .catch((e) => console.error("[qr] 생성 실패", e));
    return () => {
      alive = false;
    };
  }, [text]);
  return src;
}

/** 참여코드·QR 크게 띄우기 */
export function JoinInfo() {
  const { room } = useRoom();
  const origin = useOrigin();
  const link = origin ? `${origin}/join/${room.joinCode}` : "";
  const qr = useQr(link);

  return (
    <div className="flex items-center gap-2">
      <div className="hidden items-baseline gap-1.5 rounded-xl bg-primary-soft px-3 py-1.5 sm:flex">
        <span className="text-xs font-semibold text-primary-hover">참여코드</span>
        <span className="font-mono text-lg font-extrabold tracking-[0.2em] text-primary-hover" data-testid="join-code">
          {room.joinCode}
        </span>
      </div>
      <Button variant="outline" size="sm" onClick={() => copyText(link, "참여 링크를 복사했어요.")} disabled={!link}>
        <Copy aria-hidden /> 링크
      </Button>
      <Dialog>
        <DialogTrigger asChild>
          <Button size="sm">
            <QrCode aria-hidden /> 크게 띄우기
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-[min(960px,calc(100%-2rem))] sm:max-w-[min(960px,calc(100%-2rem))]">
          <DialogTitle className="sr-only">참여 안내</DialogTitle>
          <DialogDescription className="sr-only">QR을 찍거나 참여코드를 입력해 수업에 들어와요.</DialogDescription>
          <div className="grid items-center gap-8 p-2 md:grid-cols-2">
            <div className="text-center md:text-left">
              <div className="flex items-center justify-center gap-2 md:justify-start">
                <LogoMark className="size-10" />
                <span className="text-2xl font-extrabold">톡클</span>
              </div>
              <p className="mt-6 text-lg text-muted-foreground">{origin.replace(/^https?:\/\//, "")}/join 에서</p>
              <p className="text-lg text-muted-foreground">참여코드를 입력하세요</p>
              <p className="mt-3 font-mono text-6xl font-extrabold tracking-[0.15em] text-primary sm:text-7xl">{room.joinCode}</p>
              <p className="mt-6 line-clamp-2 text-xl font-bold">{room.title}</p>
            </div>
            <div className="mx-auto w-full max-w-sm rounded-3xl border border-border bg-white p-4">
              {qr ? <img src={qr} alt={`참여 QR 코드: ${link}`} className="w-full" /> : <div className="aspect-square animate-pulse rounded-2xl bg-muted" />}
            </div>
          </div>
          <Button variant="ghost" className="mx-auto" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>
            <Maximize2 aria-hidden /> 전체 화면
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
