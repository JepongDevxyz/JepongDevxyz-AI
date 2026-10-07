-- A conversational question contains words that are not in the saved file.
-- Search for useful terms independently, then rank matched files by relevance.
create or replace function public.search_library_items(search_query text, result_limit integer default 5)
returns table(file_name text, snippet text)
language sql
stable
security invoker
set search_path = public
as $$
  with tokens as (
    select distinct lower(token) as token
      from regexp_split_to_table(left(coalesce(search_query, ''), 500), '[^[:alnum:]]+') as token
     where length(token) >= 3
       and lower(token) not in ('the','and','for','from','with','what','where','which','when','who','why','how','are','was','were','this','that','these','those','you','your','my','mine','please','tell','about','file','files','saved','library')
     limit 20
  ), query as (
    select to_tsquery('simple', coalesce(string_agg(token, ' | '), '')) as terms
      from tokens
  )
  select item.file_name,
         coalesce(
           nullif(ts_headline('simple', coalesce(item.search_text, ''), query.terms,
             'StartSel=<mark>,StopSel=</mark>,MaxFragments=2,MinWords=4,MaxWords=32'), ''),
           item.file_name
         ) as snippet
    from public.library_items as item
    cross join query
   where auth.uid() is not null
     and item.user_id = auth.uid()
     and numnode(query.terms) > 0
     and item.search_vector @@ query.terms
   order by ts_rank_cd(item.search_vector, query.terms) desc, item.created_at desc
   limit greatest(1, least(coalesce(result_limit, 5), 5));
$$;
revoke all on function public.search_library_items(text, integer) from public, anon, service_role;
grant execute on function public.search_library_items(text, integer) to authenticated;
