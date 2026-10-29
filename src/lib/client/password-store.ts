"use client";

/** 임시 비밀번호는 현재 기기(브라우저 탭 세션)에만 보관해요. 서버에는 원문이 없어요. */
const key = (roomId: string) => `tk_pw_${roomId}`;

export function savePassword(roomId: string, password: string) {
  try {
    sessionStorage.setItem(key(roomId), password);
  } catch {
    /* 사생활 보호 모드 등 */
  }
}

export function readPassword(roomId: string): string | null {
  try {
    return sessionStorage.getItem(key(roomId));
  } catch {
    return null;
  }
}

export function forgetPassword(roomId: string) {
  try {
    sessionStorage.removeItem(key(roomId));
  } catch {
    /* noop */
  }
}
