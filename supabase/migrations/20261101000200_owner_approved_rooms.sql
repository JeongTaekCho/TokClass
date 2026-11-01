-- 정지·거절·승인 대기 강사는 자기 방·템플릿 행도 직접 읽을 수 없어요 (방 하위 테이블과 같은 기준).
drop policy if exists "rooms: owner read" on public.rooms;
create policy "rooms: owner read" on public.rooms for select to authenticated
  using (owner_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant' and public.is_approved_instructor());

drop policy if exists "room_templates: owner read" on public.room_templates;
create policy "room_templates: owner read" on public.room_templates for select to authenticated
  using (owner_id = auth.uid() and coalesce(auth.jwt() ->> 'tk_kind', '') <> 'participant' and public.is_approved_instructor());
