-- Trigger functions must not be callable through the API.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;
-- Future functions are private until explicitly granted.
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
