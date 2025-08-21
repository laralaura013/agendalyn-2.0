-- Adiciona Client.rg se não existir (PostgreSQL / Supabase)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Client'
      AND column_name = 'rg'
  ) THEN
    ALTER TABLE "Client" ADD COLUMN "rg" TEXT NULL;
  END IF;
END
$$;
