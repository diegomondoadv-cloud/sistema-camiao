# Deploy — Vercel + Supabase

Guia para publicar o sistema (Next.js + Prisma + PostgreSQL) usando **Supabase**
como banco e **Vercel** como hospedagem. (Netlify também funciona, mas a Vercel é
o caminho mais direto para Next.js.)

Resumo: o app roda na Vercel (serverless) e conversa com o Postgres do Supabase.
Em serverless é obrigatório usar a **conexão pooler** do Supabase para o app e a
**conexão direta** só para migrações — já deixamos o código preparado
(`DATABASE_URL` + `DIRECT_URL` no `schema.prisma`).

---

## 1. Criar o projeto no Supabase

1. Acesse https://supabase.com → **New project**.
2. Defina uma **senha do banco** forte (guarde-a).
3. Após criar, vá em **Project Settings → Database → Connection string** e copie
   as duas formas (troque `[YOUR-PASSWORD]` pela senha):
   - **Transaction pooler** (porta **6543**) → será o `DATABASE_URL`.
     Acrescente ao final: `?pgbouncer=true&connection_limit=1`
   - **Direct connection** / **Session** (porta **5432**) → será o `DIRECT_URL`.

Exemplo:
```
DATABASE_URL="postgresql://postgres.abcdefgh:SENHA@aws-0-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.abcdefgh:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres"
```
> Dica: prefira uma região próxima (ex.: `sa-east-1`, São Paulo).

---

## 2. Aplicar as migrações e criar o admin (uma vez)

Faça isto **uma vez**, do seu computador, apontando para o Supabase. Crie um
arquivo temporário `.env.production.local` (ou exporte as variáveis) com o
`DATABASE_URL` e `DIRECT_URL` do Supabase e rode:

```bash
npx dotenv -e .env.production.local -- npx prisma migrate deploy
```

Se não usar o `dotenv-cli`, exporte as variáveis e rode `npx prisma migrate deploy`.
Isso cria todas as tabelas no Supabase (as migrações já estão em `prisma/migrations`).

Depois, crie o primeiro administrador (defina `ADMIN_EMAIL` e `ADMIN_SENHA_INICIAL`):

```bash
npx dotenv -e .env.production.local -- npm run db:seed
```

> Alternativa: dá para rodar as migrações direto pelo SQL Editor do Supabase,
> colando o conteúdo dos arquivos em `prisma/migrations/*/migration.sql` em ordem.

---

## 3. Subir o código para o GitHub

A Vercel faz deploy a partir de um repositório Git.

```bash
git init
git add .
git commit -m "Sistema transportadora"
```
Crie um repositório no GitHub e faça o push.
> O `.gitignore` já protege `.env` e `node_modules`.

---

## 4. Publicar na Vercel

1. https://vercel.com → **Add New → Project** → importe o repositório.
2. Framework: **Next.js** (detectado automaticamente).
3. Em **Environment Variables**, adicione:
   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | conexão **pooler** (6543, com `?pgbouncer=true&connection_limit=1`) |
   | `DIRECT_URL` | conexão **direta** (5432) |
   | `AUTH_SECRET` | um segredo forte (`npx auth secret`) |
   | `AUTH_URL` | a URL pública (ex.: `https://seuprojeto.vercel.app`) |
   | `ADMIN_EMAIL` / `ADMIN_SENHA_INICIAL` | só se for rodar o seed pela Vercel |
4. **Deploy**. O `postinstall` roda `prisma generate` automaticamente.
5. Após o primeiro deploy, ajuste `AUTH_URL` para o domínio final e redeploy
   (ou configure o domínio próprio).

---

## 5. Conferências finais

- Acesse a URL, faça login com o admin criado no passo 2.
- **Node**: a Vercel usa Node 20+ (compatível com o projeto).
- **Migrações futuras**: crie a migração localmente (fluxo já documentado no
  projeto) e rode `npx prisma migrate deploy` apontando para o Supabase — ou
  deixe rodar no build. As migrações são versionadas em `prisma/migrations`.

---

## Observações importantes

- **Segurança:** nunca comite o `.env`. Gere um `AUTH_SECRET` novo para produção.
  Troque a senha inicial do admin no primeiro acesso.
- **Backups:** o Supabase (plano Pro) faz backup diário automático. Recomendado
  para uso real.
- **Anexos/arquivos:** hoje o sistema guarda apenas referências; upload de
  comprovantes (fotos/notas) pode ser ligado depois usando o **Supabase Storage**.
- **`argon2`** (hash de senha) é um módulo nativo com binários pré-compilados para
  o ambiente da Vercel (Linux x64) — funciona sem configuração. Se algum dia der
  problema de binário no build, troca-se por uma alternativa em JS puro.
- **Pooler é obrigatório** na Vercel: sem o `?pgbouncer=true` no `DATABASE_URL` o
  app pode esgotar conexões do banco.
