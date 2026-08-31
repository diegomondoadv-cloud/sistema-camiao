-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "valor" DECIMAL(14,2) NOT NULL,
    "data_vencimento" TIMESTAMP(3),
    "paga" BOOLEAN NOT NULL DEFAULT false,
    "data_pagamento" TIMESTAMP(3),
    "forma_pagamento" TEXT,
    "observacoes" TEXT,
    "fornecedor_id" TEXT,
    "cavalo_id" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_pagar_paga_idx" ON "contas_pagar"("paga");

-- CreateIndex
CREATE INDEX "contas_pagar_data_vencimento_idx" ON "contas_pagar"("data_vencimento");

-- CreateIndex
CREATE INDEX "contas_pagar_fornecedor_id_idx" ON "contas_pagar"("fornecedor_id");

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_fornecedor_id_fkey" FOREIGN KEY ("fornecedor_id") REFERENCES "fornecedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;
