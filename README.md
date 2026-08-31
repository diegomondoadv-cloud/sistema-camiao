# Sistema Transportadora

Controle financeiro e operacional de transportadora rodoviária.
Consulte o [PLANO_DO_SISTEMA.md](PLANO_DO_SISTEMA.md) para o escopo completo.

> **Estado atual:** Fase 0 (Fundação). Estrutura do projeto, banco de dados e
> regras financeiras iniciais prontos. Os módulos serão desenvolvidos um a um.

---

## 1. Pré-requisitos (instalar uma vez)

| Ferramenta | Versão | Para quê |
|---|---|---|
| **Node.js** | 20 ou superior | Rodar a aplicação e os testes |
| **Docker Desktop** | recente | Subir PostgreSQL e MinIO localmente |
| **Git** | qualquer | Versionamento (já instalado) |

- Node.js: https://nodejs.org (baixe a versão **LTS**).
- Docker Desktop: https://www.docker.com/products/docker-desktop/

Confira a instalação:

```bash
node -v
docker -v
```

---

## 2. Configurar o ambiente

1. Copie o arquivo de exemplo de variáveis:

```bash
copy .env.example .env
```

2. Abra o `.env` e ajuste, no mínimo:
   - `AUTH_SECRET` (gere um valor forte);
   - `ADMIN_EMAIL` e `ADMIN_SENHA_INICIAL` (primeiro administrador).

---

## 3. Subir a infraestrutura local (Docker)

```bash
docker compose up -d
```

Isso inicia:
- **PostgreSQL** em `localhost:5432`
- **MinIO** (armazenamento) em `localhost:9000` e console em `localhost:9001`

Parar tudo quando quiser:

```bash
docker compose down
```

---

## 4. Instalar dependências e preparar o banco

```bash
npm install
npm run prisma:migrate
npm run db:seed
```

- `prisma:migrate` cria as tabelas no banco.
- `db:seed` cria a filial padrão e o primeiro administrador (senha do `.env`,
  a ser trocada no primeiro acesso).

---

## 5. Rodar em desenvolvimento

```bash
npm run dev
```

Acesse http://localhost:3000 (funciona também no navegador do celular na mesma rede).

---

## 6. Testes (regras financeiras)

```bash
npm test
```

Os testes cobrem as regras de cálculo (resultado da viagem, saldo a receber,
resultado mensal, consumo e km vazios) e o módulo de dinheiro.
**Regra do projeto:** ao concluir cada módulo, rodar os testes e validar os
cálculos antes de avançar.

Verificação de tipos:

```bash
npm run typecheck
```

---

## 7. Estrutura do projeto (Clean Architecture)

```
/prisma            → schema e migrações do banco (Prisma)
/src
  /app             → interface (Next.js: páginas e rotas de API)
  /components      → componentes de interface reutilizáveis
  /domain          → núcleo: entidades e regras puras (cálculos financeiros)
  /application     → casos de uso (serviços) por módulo
  /infrastructure  → detalhes técnicos (Prisma, storage, autenticação)
  /shared          → utilidades (dinheiro em centavos, formatação pt-BR)
docker-compose.yml → PostgreSQL + MinIO para desenvolvimento local
```

Princípios: o domínio não depende de banco nem de framework; regras
financeiras são puras e testáveis; permissões são verificadas no servidor.

---

## 8. Comandos úteis

| Comando | O que faz |
|---|---|
| `npm run dev` | Roda a aplicação em desenvolvimento |
| `npm test` | Executa os testes |
| `npm run typecheck` | Verifica tipos TypeScript |
| `npm run prisma:studio` | Abre um visualizador do banco |
| `npm run prisma:migrate` | Cria/aplica migrações |
| `npm run db:seed` | Cria o primeiro administrador |
| `docker compose up -d` | Sobe banco e storage |
| `docker compose down` | Encerra banco e storage |
