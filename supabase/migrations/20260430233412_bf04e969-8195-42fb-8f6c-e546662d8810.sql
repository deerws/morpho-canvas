-- Backfill selections_snapshot for existing concepts using current functions/principles state
UPDATE public.concepts c
SET selections_snapshot = sub.snap
FROM (
  SELECT
    c2.id AS concept_id,
    COALESCE(
      jsonb_object_agg(
        kv.func_id,
        jsonb_build_object(
          'functionName', f.name,
          'functionColor', f.color,
          'principleId', kv.principle_id,
          'principleTitle', p.title,
          'principleDescription', p.description,
          'principleImageUrl', p.image_url
        )
      ) FILTER (WHERE f.id IS NOT NULL OR p.id IS NOT NULL),
      '{}'::jsonb
    ) AS snap
  FROM public.concepts c2
  LEFT JOIN LATERAL (
    SELECT key AS func_id, value::text AS principle_id_raw,
           trim(both '"' FROM value::text) AS principle_id
    FROM jsonb_each(c2.selections)
  ) kv ON TRUE
  LEFT JOIN public.functions f ON f.id::text = kv.func_id
  LEFT JOIN public.principles p ON p.id::text = kv.principle_id
  GROUP BY c2.id
) sub
WHERE c.id = sub.concept_id
  AND (c.selections_snapshot IS NULL OR c.selections_snapshot = '{}'::jsonb);