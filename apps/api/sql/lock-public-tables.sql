-- Run in Supabase SQL editor if advisors still show rls_disabled_in_public /
-- sensitive_columns_exposed before the API next boots (init applies the same SQL).
-- The Fly API uses DATABASE_URL (BYPASSRLS); PostgREST anon/authenticated get nothing.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_memory ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.users, public.sessions, public.oauth_states, public.playlist_memory FROM PUBLIC;

DO $$
DECLARE
    r text;
BEGIN
    FOREACH r IN ARRAY ARRAY['anon', 'authenticated']
    LOOP
        IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = r) THEN
            EXECUTE format(
                'REVOKE ALL ON TABLE public.users, public.sessions, public.oauth_states, public.playlist_memory FROM %I',
                r
            );
        END IF;
    END LOOP;
END $$;
