WITH ranked AS (
  SELECT id, user_id, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY aberto_em DESC) AS rn
  FROM public.cash_registers WHERE status = 'aberto'
)
UPDATE public.cash_registers cr
SET status = 'fechado', fechado_em = now(), valor_fechamento = 0
FROM ranked r
WHERE cr.id = r.id AND r.rn > 1;