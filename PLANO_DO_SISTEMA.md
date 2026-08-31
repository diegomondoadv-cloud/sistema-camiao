# PLANO DO SISTEMA — Controle Financeiro e Operacional de Transportadora

> Documento de planejamento. Objetivo principal: controlar cada frete, todas as despesas da viagem
> e apurar o **resultado líquido real** por viagem, por caminhão e por mês.

- **Versão do documento:** 1.2
- **Data:** 26/07/2026
- **Situação:** **1ª versão (MVP) concluída e testada em 03/08/2026.** Login, Usuários, Veículos,
  Motoristas, Clientes, Viagens (despesas + imposto 2,8% + resultado direto), Abastecimentos
  (consumo), Contas a receber, Custos fixos, Painel mensal (caixa × competência, rateio por
  caminhão) e Relatórios (por viagem/caminhão, exportação CSV + impressão/PDF). Fases 2+
  (manutenções, pneus, dashboard executivo, calendário, metas, indicadores por cliente, ficha do
  veículo, insights, integrações, PWA) pendentes.

> **Histórico de versões**
> - 1.0 — Plano inicial e decisões técnicas.
> - 1.1 — Incorporados 13 ajustes de escopo: pneus na 1ª modelagem, Central de Documentos,
>   Dashboard Executivo, Calendário Operacional, Metas, Indicadores por Cliente, Ficha do Veículo,
>   preparação para crescimento (multi-filial/multiusuário), módulo Insights (sem IA),
>   preparação para integrações, desenvolvimento local com Docker, Clean Architecture/SOLID,
>   e portão de qualidade por módulo.
> - 1.2 — Registrada a decisão sobre a convenção do Next.js: a camada de apresentação fica em
>   `src/app` e `src/components` (convenção do framework), sem alterar a arquitetura em camadas.

---

## 1. Visão geral e princípios

Aplicação web **responsiva** (computador e celular), em **português do Brasil**, com valores em
`R$` e datas em `dd/mm/aaaa`.

Princípios que guiam todas as decisões:

1. **Simplicidade com solidez** — só a complexidade necessária, mas com base bem arquitetada.
2. **Segurança desde o início** — autenticação forte, senhas criptografadas, permissões por papel.
3. **Fácil manutenção por muitos anos** — código organizado (Clean Architecture/SOLID), banco
   confiável, ambiente de desenvolvimento separado da produção.
4. **Escalável quando precisar** — modelado para crescer (dezenas de caminhões, várias filiais,
   muitos usuários) **sem reescrever** o sistema.
5. **Honestidade nos números** — quando faltarem dados para um cálculo, o sistema **informa
   claramente** em vez de inventar valores.
6. **Qualidade acima de velocidade** — cada módulo é testado, validado e estabilizado antes do
   próximo.

---

## 2. Tecnologias recomendadas

Uma só linguagem (**TypeScript**) de ponta a ponta, ferramentas mainstream e de baixa manutenção.

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | **TypeScript** | Uma linguagem no front e no back; tipos reduzem erros. |
| Framework web | **Next.js (App Router) + React** | Front + back no mesmo projeto; responsivo. |
| Estilo/UI | **Tailwind CSS + shadcn/ui** | Layout responsivo, componentes acessíveis. |
| Banco de dados | **PostgreSQL** | Relacional, confiável, decimal para dinheiro. |
| Acesso ao banco | **Prisma ORM** | Migrações versionadas, schema tipado. |
| Autenticação | **Auth.js (NextAuth)** + `argon2`/`bcrypt` | Login individual, senhas com hash forte. |
| Validação | **Zod** | Validação de formulários e de dados de entrada. |
| Armazenamento de arquivos | **Object storage S3-compatível** (MinIO no local) | Comprovantes/documentos fora do banco. |
| Relatórios | **PDF** (server-side) e **planilha** (`.xlsx`) | Exportação exigida. |
| Testes | **Vitest** | Testar cálculos financeiros é obrigatório. |
| Ambiente local | **Docker + Docker Compose** | Desenvolvimento local completo, sem depender de nuvem. |

### Estratégia de ambiente

- **Desenvolvimento: 100% local com Docker** (PostgreSQL + MinIO em contêineres). Não se depende de
  hospedagem para desenvolver.
- **Produção: publicada somente quando o sistema estiver completamente testado.** Opções de
  produção (a decidir na hora da publicação): serviços gerenciados (Vercel + Supabase) **ou**
  servidor próprio/VPS com Docker (dados no Brasil). Como tudo já roda em Docker/PostgreSQL, migrar
  do local para qualquer uma delas é direto, sem reescrever.

✅ **Decisão:** iniciar com **um único usuário administrador**; papéis de gestor e motorista já
prontos. **Desenvolvimento local com Docker desde o primeiro dia.**

---

## 3. Arquitetura (Clean Architecture + SOLID)

O projeto segue **separação clara de camadas** e princípios **SOLID**, organizado por **módulos de
domínio**. O objetivo é manter o código organizado e manutenível por muitos anos.

```
   Celular / Computador (navegador)  ──HTTPS──►  Aplicação Next.js
                                                      │
   ┌──────────────────────────────────────────────────────────────┐
   │  INTERFACE (apresentação)                                      │
   │   páginas, componentes React, rotas de API (controllers)      │
   ├──────────────────────────────────────────────────────────────┤
   │  APPLICATION (casos de uso / regras de negócio)               │
   │   serviços, orquestração, regras financeiras (testáveis)      │
   ├──────────────────────────────────────────────────────────────┤
   │  DOMAIN (núcleo)                                               │
   │   entidades, tipos, contratos (interfaces), cálculos puros    │
   ├──────────────────────────────────────────────────────────────┤
   │  INFRASTRUCTURE (detalhes técnicos)                           │
   │   Prisma/PostgreSQL, storage, autenticação, e-mail, etc.      │
   └──────────────────────────────────────────────────────────────┘
```

### Estrutura de pastas (prevista)

```
/prisma                  → schema e migrações do banco
/src
  /app                   → APRESENTAÇÃO: páginas e rotas de API (convenção Next.js)
  /components            → APRESENTAÇÃO: componentes de interface reutilizáveis
  /domain                → entidades, tipos, regras puras (cálculos financeiros), contratos
  /application           → casos de uso (services) por módulo
  /infrastructure        → Prisma (repositórios), storage, auth, provedores externos
  /shared                → utilidades (formatação R$/datas pt-BR, dinheiro em centavos)
docker-compose.yml       → Postgres + MinIO para desenvolvimento local

(testes ficam junto ao código como *.test.ts e rodam com Vitest)
```

Regras-chave:
- **Domínio não conhece banco nem framework** (dependências apontam para dentro).
- **Regras financeiras isoladas e puras**, com testes automatizados.
- **Repositórios** abstraem o acesso a dados (troca de banco não quebra as regras).
- **Permissões verificadas no servidor** em toda operação sensível.

> ✅ **Decisão (26/07/2026) — Convenção do Next.js e camada de apresentação:**
> - `src/app` e `src/components` **são a camada de apresentação** (páginas, rotas de API e
>   componentes de interface). É a convenção oficial do Next.js e será mantida.
> - **As regras de negócio NÃO ficam dentro dos componentes ou das rotas.** Elas vivem em
>   `domain` (regras puras) e `application` (casos de uso); as rotas apenas orquestram/chamam.
> - `domain`, `application`, `infrastructure` e `shared` **continuam separados** e independentes
>   do framework.
> - Adotar a convenção do Next.js **não altera a arquitetura em camadas** definida neste plano.
>   Não será feita reorganização artificial para `src/interface/app`.

---

## 4. Estrutura do banco de dados

Modelagem relacional. Toda tabela tem `id`, `criado_em`, `atualizado_em` e, quando faz sentido,
`criado_por`. Dinheiro em **decimal** (nunca `float`). Datas com timezone.

> **Preparação para crescimento (multi-filial/multiusuário):** já na primeira modelagem, as
> tabelas operacionais possuem **`filial_id`**. Haverá uma filial padrão no início, mas a estrutura
> suporta **dezenas de caminhões, várias carretas, muitos motoristas, diversas filiais e vários
> usuários simultâneos** sem reescrever nada. Índices e chaves preparados para volume.

> **Preservar histórico:** cada **viagem guarda o caminhão, a carreta e o motorista usados naquela
> viagem** (fotografia do momento). Trocar carreta/motorista não corrompe relatórios antigos.

### Tabelas — primeira modelagem (estrutura existe já na 1ª versão)

**filiais** — nome, cnpj, cidade, uf, situacao *(filial padrão no início)*

**usuarios** — nome, email (único), senha_hash, papel (`admin`|`gestor`|`motorista`),
motorista_id (opcional), filial_id, ativo

**cavalos** — placa (única), marca, modelo, ano, km_atual, media_consumo_esperada (km/l),
capacidade, situacao (`ativo`|`manutencao`|`inativo`|`vendido`), valor_parcela, vencimento_parcela,
seguro, rastreador, filial_id, observacoes, carreta_atual_id, motorista_atual_id

**carretas** — placa (única), tipo_carroceria (ex.: sider), numero_eixos, situacao, filial_id,
observacoes

**motoristas** — nome, telefone, cpf, cnh, categoria_cnh, venc_cnh, venc_toxicologico,
forma_remuneracao (`salario`|`comissao`|`misto`), salario, percentual_comissao, filial_id,
observacoes

**clientes** — tipo (`cliente`|`transportadora`), razao_social, cnpj_cpf, telefone, responsavel,
prazo_medio_pagamento (dias), dados_bancarios, filial_id, observacoes

**viagens** — cavalo_id, carreta_id, motorista_id, cliente_id, filial_id, embarcador, destinatario,
origem, destino, data_carregamento, previsao_entrega, data_entrega, tipo_carga, peso,
numero_paletes, valor_bruto_frete, adiantamento, comissao_transportadora, pedagio_incluso (bool),
km_inicial, km_final, km_carregado, km_vazio,
status (`planejada`|`aguardando_carregamento`|`em_viagem`|`entregue`|`aguardando_pagamento`|`finalizada`|`cancelada`),
numero_cte, numero_mdfe, observacoes
- *saldo a receber é calculado: valor_bruto − adiantamento − recebimentos*

**despesas** — viagem_id, data, categoria (combustível, Arla, pedágio, alimentação, estacionamento,
diária, descarga, ajudante, lavagem, manutenção emergencial, pneus, comissão do motorista, outras),
valor, forma_pagamento, estabelecimento, descricao, comprovante (anexo), criado_por

**abastecimentos** — cavalo_id, viagem_id (opcional), data, posto, cidade, km, litros, valor_litro,
valor_total, tipo_combustivel, tanque_cheio (bool), nota (anexo)
- *consumo (km/l) e custo por km calculados a partir dos abastecimentos com tanque cheio*

**recebimentos** (contas a receber) — viagem_id, valor, data_prevista, data_efetiva,
forma_pagamento, situacao (`a_vencer`|`vencida`|`parcialmente_recebida`|`recebida`|`contestada`),
comprovante (anexo)

**custos_fixos** — escopo (`empresa`|`veiculo`), cavalo_id (se por veículo), filial_id, categoria
(financiamento, seguro, rastreador, câmera, gerenciamento de risco, salário, encargos,
contabilidade, impostos, estacionamento, licenciamento, manutenção preventiva, outros), valor,
periodicidade (`mensal`|`anual`|`unico`), vigencia_inicio, vigencia_fim

**pneus** *(estrutura já na 1ª versão; interface pode ficar para fase futura)* —
numero_identificacao, marca, modelo, medida, data_compra, valor, cavalo_id, posicao,
km_instalacao, km_atual, custo_por_km (calculado), situacao
(`em_uso`|`estoque`|`reforma`|`descartado`)
- *recapagem/reforma detalhada fica para fase futura (campo `situacao` já contempla o estado)*

**documentos** (Central de Documentos) — categoria (CRLV, ANTT, apólice de seguro, CNH,
toxicológico, contrato, documento de veículo, documento de motorista, documento de cliente, outros),
titulo, numero, entidade_vinculada (`empresa`|`veiculo`|`carreta`|`motorista`|`cliente`),
entidade_id, arquivo (anexo), data_emissao, data_vencimento (quando aplicável), tags (busca),
filial_id, observacoes

**metas** — escopo (`empresa`|`veiculo`), cavalo_id (se por veículo), filial_id, ano, mes,
meta_faturamento, meta_lucro, meta_consumo (km/l), meta_km
- *percentual atingido é calculado comparando com os dados reais do período*

**anexos** (genérico) — entidade, entidade_id, tipo, url, nome_original, tamanho, descricao,
criado_por

**historico_alteracoes** (auditoria) — usuario_id, entidade, entidade_id,
acao (`criou`|`alterou`|`excluiu`), dados_antes, dados_depois, data

### Tabelas — fase 2 (já modeladas)

**manutencoes** — cavalo_id, data, km, oficina, tipo_servico, pecas, mao_de_obra, valor,
proxima_data, proximo_km, observacoes (+ anexos, + alertas por data/km)

*(Pneus foi antecipado para a 1ª modelagem; recapagem detalhada permanece na fase 2.)*

---

## 5. Módulos do sistema

| # | Módulo | 1ª versão |
|---|---|:--:|
| 1 | Usuários (admin/gestor/motorista) | ✅ |
| 2 | Veículos (cavalos + carretas, com histórico) | ✅ |
| 3 | Motoristas (+ alertas de vencimento) | ✅ |
| 4 | Clientes e transportadoras | ✅ |
| 5 | Fretes e viagens | ✅ |
| 6 | Despesas da viagem | ✅ |
| 7 | Abastecimentos (com cálculo de consumo) | ✅ |
| 8 | Contas a receber | ✅ |
| 9 | Custos fixos (cadastro) | ✅ |
| 10 | **Central de Documentos** (busca, categorias, vencimentos) | ✅ |
| 11 | **Dashboard Executivo** (tela inicial) | ✅ |
| 12 | Painel operacional (mensal) | ✅ |
| 13 | Relatórios (resultado por viagem e por caminhão) | ✅ (parcial) |
| 14 | **Ficha completa do veículo** (histórico de vida útil) | ✅ |
| 15 | **Indicadores por Cliente** | ✅ |
| 16 | **Calendário Operacional** | ✅ |
| 17 | **Metas** (por caminhão/empresa, % atingido) | ✅ |
| 18 | **Insights** (regras sobre os dados, sem IA) | ✅ (inicial) |
| 19 | Pneus (estrutura pronta; interface básica) | 🟡 estrutura |
| 20 | Manutenções | fase 2 |
| 21 | Integrações externas | fase 2 (arquitetura preparada) |

### Papéis e permissões

| Ação | Administrador | Gestor | Motorista |
|---|:--:|:--:|:--:|
| Configurações e usuários | ✅ | — | — |
| Cadastrar veículos/motoristas/clientes | ✅ | ✅ | — |
| Cadastrar/editar viagens | ✅ | ✅ | consulta as suas |
| Lançar despesas e anexar comprovantes | ✅ | ✅ | nas suas viagens |
| Lançar abastecimentos | ✅ | ✅ | nas suas viagens |
| Contas a receber | ✅ | ✅ | — |
| Documentos, Dashboard, Insights, Metas, Relatórios | ✅ | ✅ | — |
| Consultar suas próprias viagens | ✅ | ✅ | ✅ |

### 5.1 Central de Documentos (módulo 10)
Armazena todos os documentos importantes (CRLV, ANTT, apólices, CNH, toxicológico, contratos,
documentos de veículos/motoristas/clientes, outros). **Pesquisáveis, organizados por categoria e
com data de vencimento** quando aplicável. Alimenta os alertas do Calendário e dos Insights.

### 5.2 Dashboard Executivo (módulo 11 — tela inicial)
Tela inicial do sistema, com: caixa disponível; contas a receber; contas vencidas; faturamento do
mês; resultado operacional; lucro líquido; receita por caminhão; lucro por caminhão; número de
viagens; ticket médio dos fretes; percentual de km vazios.

### 5.3 Painel operacional (módulo 12)
Visão do dia a dia: viagens em andamento/concluídas, próximas manutenções, vencimentos, consumo
médio, custo/receita por km, valores a receber e vencidos.

### 5.4 Ficha completa do veículo (módulo 14)
Ao abrir um caminhão, exibe a **ficha de toda a vida útil**: histórico de viagens, abastecimentos,
despesas, manutenções, pneus, lucro acumulado, faturamento acumulado, km rodados, consumo médio e
custo médio por km.

### 5.5 Indicadores por Cliente (módulo 15)
Faturamento por cliente, lucro por cliente, quantidade de viagens, prazo médio de pagamento, índice
de atraso, ticket médio e **ranking dos melhores clientes**.

### 5.6 Calendário Operacional (módulo 16)
Calendário com todos os eventos e vencimentos: parcelas, manutenção preventiva, troca de óleo,
licenciamento, seguro, ANTT, CNH, exame toxicológico, contas a receber e demais vencimentos.
Os eventos são derivados dos cadastros (veículos, motoristas, documentos, custos fixos, recebimentos).

### 5.7 Metas (módulo 17)
Metas por caminhão e/ou empresa: faturamento mensal, lucro mensal, consumo e km rodados. O sistema
mostra **automaticamente o percentual atingido** comparando com os dados reais.

### 5.8 Insights (módulo 18 — sem IA)
Gera automaticamente alertas úteis **com base em regras e comparações dos próprios dados** (sem
inteligência artificial): consumo acima da média; lucro abaixo da média; cliente com atraso
recorrente; manutenção próxima; documentos próximos do vencimento; queda de faturamento; aumento de
despesas; caminhão parado muitos dias; evolução mensal da empresa. Arquitetura preparada para,
**futuramente**, usar IA — mas não agora.

---

## 6. Regras de cálculo

Regras isoladas na camada de domínio, **puras e com testes automatizados**. Dinheiro em decimal.

- **Saldo a receber** = `valor_bruto_frete − adiantamento − Σ(recebimentos)`
  *(adiantamento reduz o saldo a receber — confirmado)*
- **Resultado direto da viagem** = `frete bruto − comissão transportadora − despesas diretas −
  comissão do motorista − imposto`
  ✅ Comissão do motorista = **% sobre o frete bruto**. Salário fixo, se houver, é custo fixo.
  ✅ **Imposto sobre o frete** = **% sobre o frete bruto**, padrão **2,8%** (editável por viagem).
- **Resultado mensal do veículo** = `receitas do período − despesas variáveis − manutenção −
  rateio de custos fixos`
  ✅ Rateio = **valor fixo por caminhão** (custos da empresa divididos igualmente).
- **Consumo/custo de combustível** só com dados consistentes; sem dados → **"dados insuficientes"**.
- ✅ **Pedágio:** incluso = só informado; separado = despesa da viagem.
- **Caixa × competência** nunca se misturam (filtros distintos). Relatórios sempre mostram resultado
  **com e sem** custos fixos e os valores **faturados / recebidos / a receber**.
- **Ticket médio** = faturamento ÷ número de viagens (por período/cliente).
- **% de km vazios** = km_vazio ÷ (km_carregado + km_vazio).
- **Custo por km do pneu** = valor ÷ (km_atual − km_instalacao), quando houver km suficiente.
- **% de meta atingida** = realizado ÷ meta (faturamento, lucro, consumo, km).

---

## 7. Riscos de segurança e mitigação

| Risco | Mitigação |
|---|---|
| Senhas fracas/vazadas | Hash `argon2`/`bcrypt`, política mínima, nunca em texto. |
| Acesso indevido entre papéis | Permissão verificada **no servidor**; motorista só vê o que é seu. |
| Sequestro de sessão | HTTPS, cookies httpOnly/secure, expiração. |
| Injeção de SQL | ORM (Prisma) parametrizado; validação com Zod. |
| Upload malicioso | Validar tipo/tamanho, nome gerado pelo sistema, bucket privado. |
| Segredos no código | Variáveis de ambiente (`.env`) fora do versionamento. |
| Perda/alteração de dados | Auditoria + backups + exclusão lógica. |
| Dados pessoais (LGPD) | Acesso restrito por papel; mascaramento em listagens. |

Complementos: validação de formulários, tratamento de erros amigável, e **dados fictícios só em
desenvolvimento — nunca em produção**.

---

## 8. Backup e restauração

- **Backup automático diário** do banco (retenção mínima 7–30 dias) + **cópia externa**.
- Backup **também** dos documentos/comprovantes.
- **Teste de restauração** ao final da Fase 0 e periodicamente.
- Sem lock-in: dump completo PostgreSQL (`pg_dump`) e export CSV/planilha a qualquer momento.

---

## 9. Deploy e ambientes

- **Desenvolvimento: local com Docker** (Postgres + MinIO). Não depende de hospedagem.
- **Dev separado de produção** (bancos, chaves e `.env` distintos).
- Git + **migrações versionadas (Prisma)**; nunca alteração manual no banco de produção.
- **Backup antes de cada migração** em produção; migrações aditivas sempre que possível.
- **Produção só após o sistema estar completamente testado.**
- HTTPS obrigatório em produção.

---

## 10. Preparação para integrações futuras (não desenvolver agora)

A arquitetura (camada de infraestrutura + contratos no domínio) fica **preparada** para futuras
integrações, isoladas atrás de interfaces para não afetar o núcleo:
**Fretebras, rastreamento, emissão de CT-e, emissão de MDF-e, WhatsApp, e-mail e APIs bancárias.**
Nenhuma será implementada agora; ficam apenas os pontos de extensão previstos.

---

## 11. Etapas de desenvolvimento

**Fase 0 — Fundação**
1. Projeto Next.js + TypeScript com estrutura Clean Architecture/SOLID.
2. **Docker Compose local** (PostgreSQL + MinIO) e arquivos `.env` de dev.
3. Schema Prisma **completo** (todas as tabelas da seção 4) e primeira migração.
4. Autenticação base + criação segura do primeiro administrador (seed).
5. Layout responsivo base (pt-BR, R$, datas) e formatação/dinheiro em `/shared`.
6. Testes iniciais das utilidades financeiras.

**Fase 1 — MVP (um módulo por vez, com portão de qualidade)**
Usuários → Veículos → Motoristas → Clientes → Viagens → Despesas → Abastecimentos →
Contas a receber → Custos fixos → Central de Documentos → Metas → Indicadores por Cliente →
Calendário → Ficha do veículo → Dashboard Executivo + Painel → Insights (inicial) →
Relatórios (viagem e caminhão) → **testes das regras financeiras**.

**Fase 2 — Expansão**
Manutenções, recapagem de pneus, demais relatórios e exportações completas, PWA, integrações
externas, Insights com IA (opcional).

### Portão de qualidade (obrigatório por módulo)
Ao concluir **cada** módulo: **executar testes → corrigir erros → validar os cálculos → só então
avançar** para o próximo. **Prioridade é qualidade, estabilidade e manutenção — não velocidade.**

---

## 12. Decisões técnicas (resumo)

1. TypeScript de ponta a ponta com Next.js; **Clean Architecture + SOLID**, organizado por módulos.
2. PostgreSQL + Prisma; dinheiro em decimal; pt-BR, R$, datas brasileiras.
3. Autenticação Auth.js com hash forte; primeiro admin via seed seguro.
4. Histórico preservado guardando caminhão/carreta/motorista na própria viagem.
5. Regras financeiras puras e testadas; caixa e competência separados por filtro.
6. Documentos/comprovantes em object storage (MinIO no local); auditoria; backups.
7. **Desenvolvimento local com Docker**; produção só após testes completos.
8. Modelagem **pronta para crescer** (multi-filial/multiusuário) e para **integrações futuras**.
9. **Portão de qualidade por módulo.**

---

## 13. Pontos confirmados / padrões assumidos

- ✅ Adiantamento **reduz** o saldo a receber.
- ✅ Comissão do motorista = **% sobre frete bruto**.
- ✅ **Imposto sobre o frete = % sobre frete bruto, padrão 2,8% (editável por viagem).**
- ✅ Rateio de custos fixos = **valor fixo por caminhão**.
- ✅ Pedágio: incluso = informado; separado = despesa.
- Identidade visual: layout limpo e neutro no início (logo/cores podem ser enviados depois).

> ✅ **Decisão de ambiente (03/08/2026) — banco de dados:** nesta máquina o app usa o
> **PostgreSQL nativo do Windows** (serviço `postgresql-x64-16`, em `127.0.0.1:5432`), não o
> container Docker. O Docker Desktop apresentou instabilidade grave (sockets AF_UNIX / Winsock) e
> o container do banco estava duplicado e sem uso, então foi **desligado**. O `docker-compose.yml`
> permanece no projeto para uso futuro (ex.: MinIO/storage), mas **o banco de desenvolvimento é o
> nativo**. Como o app é agnóstico (Prisma + `DATABASE_URL`), isso não altera a arquitetura.

---

**Fase 0 autorizada. O desenvolvimento seguirá um módulo por vez, com portão de qualidade.**
