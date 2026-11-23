alter type public.ob_category add value if not exists 'Women''s Health';
alter type public.ob_category add value if not exists 'Maternity Foundations';
notify pgrst, 'reload schema';
