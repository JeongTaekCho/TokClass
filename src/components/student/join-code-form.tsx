"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinCodeForm({ initialCode = "" }: { initialCode?: string }) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const valid = /^\d{6}$/.test(code);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) router.push(`/join/${code}`);
      }}
      className="space-y-3"
    >
      <Label htmlFor="join-code">참여코드</Label>
      <Input
        id="join-code"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={6}
        placeholder="123456"
        value={code}
        onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
        className="h-14 text-center text-2xl font-bold tracking-[0.4em]"
        aria-describedby="join-code-help"
      />
      <p id="join-code-help" className="text-sm text-muted-foreground">
        숫자 6자리예요. QR이나 링크로 들어오면 자동으로 채워져요.
      </p>
      <Button type="submit" size="lg" className="w-full" disabled={!valid}>
        다음 <ArrowRight aria-hidden />
      </Button>
    </form>
  );
}
