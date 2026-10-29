"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** 현재 사이트 주소 (SSR에서는 빈 문자열) */
export function useOrigin() {
  return useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );
}
