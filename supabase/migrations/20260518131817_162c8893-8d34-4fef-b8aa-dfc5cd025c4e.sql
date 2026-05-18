drop policy if exists "service_role_full_access_logs" on public.logs_acesso;
drop policy if exists "admin_ve_todos_logs" on public.logs_acesso;

create policy "service_role_full_access_logs"
on public.logs_acesso
for all
to service_role
using (true)
with check (true);

create policy "admin_ve_todos_logs"
on public.logs_acesso
for select
to authenticated
using (public.is_admin_from_jwt());