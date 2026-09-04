-- CreateTable
CREATE TABLE "vales_motorista" (
    "id" TEXT NOT NULL,
    "motorista_id" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "data_vencimento" TIMESTAMP(3),
    "acertado" BOOLEAN NOT NULL DEFAULT false,
    "data_acerto" TIMESTAMP(3),
    "observacoes" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vales_motorista_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vales_motorista_motorista_id_idx" ON "vales_motorista"("motorista_id");

-- CreateIndex
CREATE INDEX "vales_motorista_acertado_idx" ON "vales_motorista"("acertado");

-- AddForeignKey
ALTER TABLE "vales_motorista" ADD CONSTRAINT "vales_motorista_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vales_motorista" ADD CONSTRAINT "vales_motorista_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

