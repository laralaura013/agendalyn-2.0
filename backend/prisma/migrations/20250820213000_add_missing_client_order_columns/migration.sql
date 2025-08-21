-- === Client: campos faltantes ===
DO $$
BEGIN
  -- deletedAt
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Client' AND column_name = 'deletedAt'
  ) THEN
    ALTER TABLE "Client" ADD COLUMN "deletedAt" TIMESTAMP NULL;
  END IF;

  -- cpf
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Client' AND column_name = 'cpf'
  ) THEN
    ALTER TABLE "Client" ADD COLUMN "cpf" TEXT NULL;
  END IF;

  -- isActive (se quiser manter controle ativo/inativo)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Client' AND column_name = 'isActive'
  ) THEN
    ALTER TABLE "Client" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT TRUE;
  END IF;

  -- tags (array de texto)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Client' AND column_name = 'tags'
  ) THEN
    ALTER TABLE "Client" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
  END IF;
END
$$;

-- === Order: campos de totais persistidos ===
DO $$
BEGIN
  -- discountAmount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'discountAmount'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "discountAmount" NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- discountMode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'discountMode'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "discountMode" TEXT NOT NULL DEFAULT 'R$';
  END IF;

  -- tipAmount
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'tipAmount'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "tipAmount" NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- tipMode
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'tipMode'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "tipMode" TEXT NOT NULL DEFAULT 'R$';
  END IF;

  -- totalToPay
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'totalToPay'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "totalToPay" NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- paidTotal
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'paidTotal'
  ) THEN
    ALTER TABLE "Order" ADD COLUMN "paidTotal" NUMERIC(10,2) NOT NULL DEFAULT 0;
  END IF;

  -- Se existirem colunas antigas "discount" e/ou "tip", migra valores
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'discount'
  ) THEN
    UPDATE "Order" SET "discountAmount" = COALESCE("discountAmount", 0) + COALESCE("discount", 0);
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'Order' AND column_name = 'tip'
  ) THEN
    UPDATE "Order" SET "tipAmount" = COALESCE("tipAmount", 0) + COALESCE("tip", 0);
  END IF;

END
$$;
