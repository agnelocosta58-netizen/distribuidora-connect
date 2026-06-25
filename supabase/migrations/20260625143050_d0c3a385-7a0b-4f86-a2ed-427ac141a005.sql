
ALTER TABLE public.pix_transactions
  ADD COLUMN IF NOT EXISTS qr_code TEXT,
  ADD COLUMN IF NOT EXISTS qr_code_base64 TEXT,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TYPE public.pix_tx_status ADD VALUE IF NOT EXISTS 'estornado';
