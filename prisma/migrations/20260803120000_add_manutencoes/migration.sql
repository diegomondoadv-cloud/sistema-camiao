-- CreateTable
CREATE TABLE "manutencoes" (
    "id" TEXT NOT NULL,
    "cavalo_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "km" INTEGER,
    "oficina" TEXT,
    "tipo_servico" TEXT,
    "pecas" DECIMAL(14,2),
    "mao_de_obra" DECIMAL(14,2),
    "valor" DECIMAL(14,2) NOT NULL,
    "proxima_data" TIMESTAMP(3),
    "proximo_km" INTEGER,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "manutencoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "manutencoes_cavalo_id_idx" ON "manutencoes"("cavalo_id");

-- CreateIndex
CREATE INDEX "manutencoes_data_idx" ON "manutencoes"("data");

-- AddForeignKey
ALTER TABLE "manutencoes" ADD CONSTRAINT "manutencoes_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
