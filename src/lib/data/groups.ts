import "server-only";

import type { Actor } from "@/lib/auth/actor";
import { ApiError } from "@/lib/api/errors";

/**
 * 채팅·산출물에서 쓸 조(group) 범위를 정해요.
 * - 수강생: 조 모드가 켜져 있고 본인 조가 있으면 본인 조만, 아니면 전체(null)
 * - 강사: 요청한 조(없으면 전체)
 */
export function resolveGroupScope(actor: Actor, requested: string | null | undefined): string | null {
  if (actor.kind === "instructor") return requested ?? null;
  if (!requested) return null;
  if (!actor.settings.groups.active || actor.participant.group_id !== requested) {
    throw new ApiError(403, "우리 조 채널만 볼 수 있어요.");
  }
  return requested;
}
