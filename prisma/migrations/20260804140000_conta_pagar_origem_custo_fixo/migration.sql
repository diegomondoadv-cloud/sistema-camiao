-- AlterTable
ALTER TABLE "contas_pagar" ADD COLUMN     "competencia" TEXT,
ADD COLUMN     "custo_fixo_id" TEXT,
ADD COLUMN     "origem" TEXT NOT NULL DEFAULT 'manual';

-- CreateIndex
CREATE UNIQUE INDEX "contas_pagar_custo_fixo_id_competencia_key" ON "contas_pagar"("custo_fixo_id", "competencia");

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_custo_fixo_id_fkey" FOREIGN KEY ("custo_fixo_id") REFERENCES "custos_fixos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
