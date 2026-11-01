import { describe, expect, it } from "vitest";

import { isPrivateAddress } from "@/lib/net/private-address";

describe("링크 미리보기 내부망 차단", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.0.10", "169.254.169.254", "100.64.0.1", "0.0.0.0", "198.18.0.1", "224.0.0.1", "::1", "::", "::ffff:127.0.0.1", "fe80::1", "fd00::1", "64:ff9b::a9fe:a9fe"])(
    "%s 는 막는다",
    (ip) => expect(isPrivateAddress(ip)).toBe(true),
  );
  it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])("%s 는 통과", (ip) => expect(isPrivateAddress(ip)).toBe(false));
});
