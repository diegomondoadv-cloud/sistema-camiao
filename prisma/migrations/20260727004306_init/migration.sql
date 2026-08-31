-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('admin', 'gestor', 'motorista');

-- CreateEnum
CREATE TYPE "SituacaoCavalo" AS ENUM ('ativo', 'manutencao', 'inativo', 'vendido');

-- CreateEnum
CREATE TYPE "SituacaoCarreta" AS ENUM ('ativo', 'manutencao', 'inativo', 'vendido');

-- CreateEnum
CREATE TYPE "FormaRemuneracao" AS ENUM ('salario', 'comissao', 'misto');

-- CreateEnum
CREATE TYPE "TipoCliente" AS ENUM ('cliente', 'transportadora');

-- CreateEnum
CREATE TYPE "StatusViagem" AS ENUM ('planejada', 'aguardando_carregamento', 'em_viagem', 'entregue', 'aguardando_pagamento', 'finalizada', 'cancelada');

-- CreateEnum
CREATE TYPE "CategoriaDespesa" AS ENUM ('combustivel', 'arla', 'pedagio', 'alimentacao', 'estacionamento', 'diaria', 'descarga', 'ajudante', 'lavagem', 'manutencao_emergencial', 'pneus', 'comissao_motorista', 'outras');

-- CreateEnum
CREATE TYPE "SituacaoRecebimento" AS ENUM ('a_vencer', 'vencida', 'parcialmente_recebida', 'recebida', 'contestada');

-- CreateEnum
CREATE TYPE "EscopoCustoFixo" AS ENUM ('empresa', 'veiculo');

-- CreateEnum
CREATE TYPE "PeriodicidadeCusto" AS ENUM ('mensal', 'anual', 'unico');

-- CreateEnum
CREATE TYPE "SituacaoPneu" AS ENUM ('em_uso', 'estoque', 'reforma', 'descartado');

-- CreateEnum
CREATE TYPE "CategoriaDocumento" AS ENUM ('crlv', 'antt', 'apolice_seguro', 'cnh', 'toxicologico', 'contrato', 'doc_veiculo', 'doc_motorista', 'doc_cliente', 'outros');

-- CreateEnum
CREATE TYPE "EntidadeVinculada" AS ENUM ('empresa', 'veiculo', 'carreta', 'motorista', 'cliente');

-- CreateEnum
CREATE TYPE "EscopoMeta" AS ENUM ('empresa', 'veiculo');

-- CreateEnum
CREATE TYPE "AcaoAuditoria" AS ENUM ('criou', 'alterou', 'excluiu');

-- CreateTable
CREATE TABLE "filiais" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cnpj" TEXT,
    "cidade" TEXT,
    "uf" VARCHAR(2),
    "situacao" TEXT NOT NULL DEFAULT 'ativa',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filiais_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'gestor',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "precisa_trocar_senha" BOOLEAN NOT NULL DEFAULT true,
    "filial_id" TEXT,
    "motorista_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cavalos" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "ano" INTEGER,
    "km_atual" INTEGER,
    "media_consumo_esperada" DECIMAL(6,2),
    "capacidade" TEXT,
    "situacao" "SituacaoCavalo" NOT NULL DEFAULT 'ativo',
    "valor_parcela" DECIMAL(14,2),
    "vencimento_parcela" INTEGER,
    "seguro" TEXT,
    "rastreador" TEXT,
    "observacoes" TEXT,
    "filial_id" TEXT,
    "carreta_atual_id" TEXT,
    "motorista_atual_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cavalos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carretas" (
    "id" TEXT NOT NULL,
    "placa" TEXT NOT NULL,
    "tipo_carroceria" TEXT,
    "numero_eixos" INTEGER,
    "situacao" "SituacaoCarreta" NOT NULL DEFAULT 'ativo',
    "observacoes" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "carretas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motoristas" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "telefone" TEXT,
    "cpf" TEXT,
    "cnh" TEXT,
    "categoria_cnh" TEXT,
    "venc_cnh" TIMESTAMP(3),
    "venc_toxicologico" TIMESTAMP(3),
    "forma_remuneracao" "FormaRemuneracao" NOT NULL DEFAULT 'comissao',
    "salario" DECIMAL(14,2),
    "percentual_comissao" DECIMAL(5,2),
    "observacoes" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "motoristas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "tipo" "TipoCliente" NOT NULL DEFAULT 'cliente',
    "razao_social" TEXT NOT NULL,
    "cnpj_cpf" TEXT,
    "telefone" TEXT,
    "responsavel" TEXT,
    "prazo_medio_pagamento" INTEGER,
    "dados_bancarios" TEXT,
    "observacoes" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagens" (
    "id" TEXT NOT NULL,
    "cavalo_id" TEXT NOT NULL,
    "carreta_id" TEXT,
    "motorista_id" TEXT,
    "cliente_id" TEXT,
    "filial_id" TEXT,
    "embarcador" TEXT,
    "destinatario" TEXT,
    "origem" TEXT,
    "destino" TEXT,
    "data_carregamento" TIMESTAMP(3),
    "previsao_entrega" TIMESTAMP(3),
    "data_entrega" TIMESTAMP(3),
    "tipo_carga" TEXT,
    "peso" DECIMAL(12,3),
    "numero_paletes" INTEGER,
    "valor_bruto_frete" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "adiantamento" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "comissao_transportadora" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "pedagio_incluso" BOOLEAN NOT NULL DEFAULT true,
    "km_inicial" INTEGER,
    "km_final" INTEGER,
    "km_carregado" INTEGER,
    "km_vazio" INTEGER,
    "status" "StatusViagem" NOT NULL DEFAULT 'planejada',
    "numero_cte" TEXT,
    "numero_mdfe" TEXT,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "viagens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesas" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "categoria" "CategoriaDespesa" NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "forma_pagamento" TEXT,
    "estabelecimento" TEXT,
    "descricao" TEXT,
    "comprovante_url" TEXT,
    "criado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "despesas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abastecimentos" (
    "id" TEXT NOT NULL,
    "cavalo_id" TEXT NOT NULL,
    "viagem_id" TEXT,
    "data" TIMESTAMP(3) NOT NULL,
    "posto" TEXT,
    "cidade" TEXT,
    "km" INTEGER,
    "litros" DECIMAL(10,3) NOT NULL,
    "valor_litro" DECIMAL(10,3) NOT NULL,
    "valor_total" DECIMAL(14,2) NOT NULL,
    "tipo_combustivel" TEXT,
    "tanque_cheio" BOOLEAN NOT NULL DEFAULT true,
    "nota_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "abastecimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recebimentos" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "data_prevista" TIMESTAMP(3),
    "data_efetiva" TIMESTAMP(3),
    "forma_pagamento" TEXT,
    "situacao" "SituacaoRecebimento" NOT NULL DEFAULT 'a_vencer',
    "comprovante_url" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recebimentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custos_fixos" (
    "id" TEXT NOT NULL,
    "escopo" "EscopoCustoFixo" NOT NULL DEFAULT 'empresa',
    "cavalo_id" TEXT,
    "filial_id" TEXT,
    "categoria" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "periodicidade" "PeriodicidadeCusto" NOT NULL DEFAULT 'mensal',
    "vigencia_inicio" TIMESTAMP(3),
    "vigencia_fim" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custos_fixos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pneus" (
    "id" TEXT NOT NULL,
    "numero_identificacao" TEXT NOT NULL,
    "marca" TEXT,
    "modelo" TEXT,
    "medida" TEXT,
    "data_compra" TIMESTAMP(3),
    "valor" DECIMAL(14,2),
    "cavalo_id" TEXT,
    "posicao" TEXT,
    "km_instalacao" INTEGER,
    "km_atual" INTEGER,
    "custo_por_km" DECIMAL(10,4),
    "situacao" "SituacaoPneu" NOT NULL DEFAULT 'estoque',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pneus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documentos" (
    "id" TEXT NOT NULL,
    "categoria" "CategoriaDocumento" NOT NULL,
    "titulo" TEXT NOT NULL,
    "numero" TEXT,
    "entidade_vinculada" "EntidadeVinculada" NOT NULL,
    "entidade_id" TEXT,
    "arquivo_url" TEXT,
    "data_emissao" TIMESTAMP(3),
    "data_vencimento" TIMESTAMP(3),
    "tags" TEXT,
    "observacoes" TEXT,
    "filial_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documentos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metas" (
    "id" TEXT NOT NULL,
    "escopo" "EscopoMeta" NOT NULL DEFAULT 'veiculo',
    "cavalo_id" TEXT,
    "filial_id" TEXT,
    "ano" INTEGER NOT NULL,
    "mes" INTEGER NOT NULL,
    "meta_faturamento" DECIMAL(14,2),
    "meta_lucro" DECIMAL(14,2),
    "meta_consumo" DECIMAL(6,2),
    "meta_km" INTEGER,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "metas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "anexos" (
    "id" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "tipo" TEXT,
    "url" TEXT NOT NULL,
    "nome_original" TEXT,
    "tamanho" INTEGER,
    "descricao" TEXT,
    "criado_por" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "anexos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historico_alteracoes" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "entidade" TEXT NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "acao" "AcaoAuditoria" NOT NULL,
    "dados_antes" JSONB,
    "dados_depois" JSONB,
    "data" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_alteracoes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_motorista_id_key" ON "usuarios"("motorista_id");

-- CreateIndex
CREATE INDEX "usuarios_filial_id_idx" ON "usuarios"("filial_id");

-- CreateIndex
CREATE UNIQUE INDEX "cavalos_placa_key" ON "cavalos"("placa");

-- CreateIndex
CREATE INDEX "cavalos_filial_id_idx" ON "cavalos"("filial_id");

-- CreateIndex
CREATE INDEX "cavalos_situacao_idx" ON "cavalos"("situacao");

-- CreateIndex
CREATE UNIQUE INDEX "carretas_placa_key" ON "carretas"("placa");

-- CreateIndex
CREATE INDEX "carretas_filial_id_idx" ON "carretas"("filial_id");

-- CreateIndex
CREATE INDEX "motoristas_filial_id_idx" ON "motoristas"("filial_id");

-- CreateIndex
CREATE INDEX "clientes_filial_id_idx" ON "clientes"("filial_id");

-- CreateIndex
CREATE INDEX "viagens_filial_id_idx" ON "viagens"("filial_id");

-- CreateIndex
CREATE INDEX "viagens_cavalo_id_idx" ON "viagens"("cavalo_id");

-- CreateIndex
CREATE INDEX "viagens_cliente_id_idx" ON "viagens"("cliente_id");

-- CreateIndex
CREATE INDEX "viagens_status_idx" ON "viagens"("status");

-- CreateIndex
CREATE INDEX "viagens_data_carregamento_idx" ON "viagens"("data_carregamento");

-- CreateIndex
CREATE INDEX "despesas_viagem_id_idx" ON "despesas"("viagem_id");

-- CreateIndex
CREATE INDEX "despesas_categoria_idx" ON "despesas"("categoria");

-- CreateIndex
CREATE INDEX "despesas_data_idx" ON "despesas"("data");

-- CreateIndex
CREATE INDEX "abastecimentos_cavalo_id_idx" ON "abastecimentos"("cavalo_id");

-- CreateIndex
CREATE INDEX "abastecimentos_viagem_id_idx" ON "abastecimentos"("viagem_id");

-- CreateIndex
CREATE INDEX "abastecimentos_data_idx" ON "abastecimentos"("data");

-- CreateIndex
CREATE INDEX "recebimentos_viagem_id_idx" ON "recebimentos"("viagem_id");

-- CreateIndex
CREATE INDEX "recebimentos_situacao_idx" ON "recebimentos"("situacao");

-- CreateIndex
CREATE INDEX "recebimentos_data_prevista_idx" ON "recebimentos"("data_prevista");

-- CreateIndex
CREATE INDEX "custos_fixos_cavalo_id_idx" ON "custos_fixos"("cavalo_id");

-- CreateIndex
CREATE INDEX "custos_fixos_filial_id_idx" ON "custos_fixos"("filial_id");

-- CreateIndex
CREATE UNIQUE INDEX "pneus_numero_identificacao_key" ON "pneus"("numero_identificacao");

-- CreateIndex
CREATE INDEX "pneus_cavalo_id_idx" ON "pneus"("cavalo_id");

-- CreateIndex
CREATE INDEX "pneus_situacao_idx" ON "pneus"("situacao");

-- CreateIndex
CREATE INDEX "documentos_categoria_idx" ON "documentos"("categoria");

-- CreateIndex
CREATE INDEX "documentos_entidade_vinculada_entidade_id_idx" ON "documentos"("entidade_vinculada", "entidade_id");

-- CreateIndex
CREATE INDEX "documentos_data_vencimento_idx" ON "documentos"("data_vencimento");

-- CreateIndex
CREATE INDEX "metas_cavalo_id_idx" ON "metas"("cavalo_id");

-- CreateIndex
CREATE UNIQUE INDEX "metas_escopo_cavalo_id_ano_mes_key" ON "metas"("escopo", "cavalo_id", "ano", "mes");

-- CreateIndex
CREATE INDEX "anexos_entidade_entidade_id_idx" ON "anexos"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "historico_alteracoes_entidade_entidade_id_idx" ON "historico_alteracoes"("entidade", "entidade_id");

-- CreateIndex
CREATE INDEX "historico_alteracoes_usuario_id_idx" ON "historico_alteracoes"("usuario_id");

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cavalos" ADD CONSTRAINT "cavalos_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cavalos" ADD CONSTRAINT "cavalos_carreta_atual_id_fkey" FOREIGN KEY ("carreta_atual_id") REFERENCES "carretas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cavalos" ADD CONSTRAINT "cavalos_motorista_atual_id_fkey" FOREIGN KEY ("motorista_atual_id") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carretas" ADD CONSTRAINT "carretas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motoristas" ADD CONSTRAINT "motoristas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_carreta_id_fkey" FOREIGN KEY ("carreta_id") REFERENCES "carretas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_motorista_id_fkey" FOREIGN KEY ("motorista_id") REFERENCES "motoristas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagens" ADD CONSTRAINT "viagens_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abastecimentos" ADD CONSTRAINT "abastecimentos_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recebimentos" ADD CONSTRAINT "recebimentos_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagens"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos_fixos" ADD CONSTRAINT "custos_fixos_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custos_fixos" ADD CONSTRAINT "custos_fixos_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pneus" ADD CONSTRAINT "pneus_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documentos" ADD CONSTRAINT "documentos_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_cavalo_id_fkey" FOREIGN KEY ("cavalo_id") REFERENCES "cavalos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "metas" ADD CONSTRAINT "metas_filial_id_fkey" FOREIGN KEY ("filial_id") REFERENCES "filiais"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "anexos" ADD CONSTRAINT "anexos_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historico_alteracoes" ADD CONSTRAINT "historico_alteracoes_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
