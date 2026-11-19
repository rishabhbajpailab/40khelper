-- Local development seed. Runs on `supabase db reset`.
-- Only names are seeded here; the repo deliberately contains no rules text.
-- Add your own data, or load it with the service role key from an import script.

insert into public.abilities (name, type) values
  ('Deadly Demise', 'core'),
  ('Deep Strike', 'core'),
  ('Feel No Pain', 'core'),
  ('Fights First', 'core'),
  ('Firing Deck', 'core'),
  ('Infiltrators', 'core'),
  ('Leader', 'core'),
  ('Lone Operative', 'core'),
  ('Scouts', 'core'),
  ('Stealth', 'core')
on conflict do nothing;
