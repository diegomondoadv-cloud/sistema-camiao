-- AlterTable
ALTER TABLE "despesas" ADD COLUMN     "abastecimento_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "despesas_abastecimento_id_key" ON "despesas"("abastecimento_id");

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_abastecimento_id_fkey" FOREIGN KEY ("abastecimento_id") REFERENCES "abastecimentos"("id") ON DELETE CASCADE ON UPDATE CASCADE;
