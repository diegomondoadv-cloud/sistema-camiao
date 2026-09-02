/**
 * Seed de inicialização — cria a filial padrão e o PRIMEIRO USUÁRIO ADMIN
 * de forma segura:
 *   - executado manualmente (npm run db:seed), não por tela pública;
 *   - senha inicial vem de variável de ambiente (ADMIN_SENHA_INICIAL);
 *   - a senha é gravada com hash argon2 (nunca em texto);
 *   - o admin é obrigado a trocar a senha no primeiro acesso.
 *
 * É idempotente: rodar de novo não duplica o admin.
 */
import { PrismaClient } from "@prisma/client";
import { hash as argonHash } from "@node-rs/argon2";

const prisma = new PrismaClient();

async function main() {
  const nome = process.env.ADMIN_NOME ?? "Administrador";
  const email = process.env.ADMIN_EMAIL;
  const senhaInicial = process.env.ADMIN_SENHA_INICIAL;

  if (!email || !senhaInicial) {
    throw new Error(
      "Defina ADMIN_EMAIL e ADMIN_SENHA_INICIAL no arquivo .env antes de rodar o seed.",
    );
  }

  // Filial padrão
  let filial = await prisma.filial.findFirst({ where: { nome: "Matriz" } });
  if (!filial) {
    filial = await prisma.filial.create({ data: { nome: "Matriz" } });
    console.log("Filial padrão 'Matriz' criada.");
  }

  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) {
    console.log(`Usuário administrador já existe (${email}). Nada a fazer.`);
    return;
  }

  const senhaHash = await argonHash(senhaInicial);

  await prisma.usuario.create({
    data: {
      nome,
      email,
      senhaHash,
      papel: "admin",
      ativo: true,
      precisaTrocarSenha: true,
      filialId: filial.id,
    },
  });

  console.log(`Administrador criado: ${email}`);
  console.log("IMPORTANTE: troque a senha no primeiro acesso.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
