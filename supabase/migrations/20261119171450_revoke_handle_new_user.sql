-- handle_new_user is only meant to run from the auth.users trigger, never via /rest/v1/rpc.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
