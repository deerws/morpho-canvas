-- Adiciona snapshot de estrutura na tabela matrices
ALTER TABLE public.matrices
  ADD COLUMN IF NOT EXISTS selections_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.matrices.selections_snapshot IS
  'Snapshot congelado das funções referenciadas em function_ids no momento do save. Formato: { "<functionId>": { "functionName": "...", "functionColor": "..." } }. Garante que a estrutura da matriz sobreviva à edição/exclusão de funções no banco.';

-- Backfill: popula snapshot das matrizes existentes com o estado atual das funções
UPDATE public.matrices m
SET selections_snapshot = COALESCE(sub.snap, '{}'::jsonb)
FROM (
  SELECT
    m2.id AS matrix_id,
    jsonb_object_agg(
      f.id::text,
      jsonb_build_object(
        'functionName', f.name,
        'functionColor', f.color
      )
    ) AS snap
  FROM public.matrices m2
  CROSS JOIN LATERAL unnest(COALESCE(m2.function_ids, '{}'::uuid[])) AS fid
  JOIN public.functions f ON f.id = fid
  GROUP BY m2.id
) sub
WHERE m.id = sub.matrix_id
  AND m.selections_snapshot = '{}'::jsonb;