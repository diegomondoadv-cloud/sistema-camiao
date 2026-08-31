"use server";

/**
 * Abastecimento lançado DENTRO de uma viagem. Cria o abastecimento (para o
 * painel de consumo/média) E, junto, a despesa de combustível (para contar no
 * resultado da viagem), ambos vinculados. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor, idUsuarioAtual } from "@/infrastructure/auth/sessao";
import { paraDecimal, paraInteiro, paraData } from "@/shared/parse";
import { calcularValorTotal } from "@/domain/abastecimentos/validacao";

export async function criarAbastecimentoViagem(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");

  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    select: { cavaloId: true },
  });
  if (!viagem) redirect("/viagens?erro=nao-encontrada");

  const litros = paraDecimal(formData.get("litros")) ?? 0;
  const valorLitro = paraDecimal(formData.get("valorLitro")) ?? 0;
  if (litros <= 0 || valorLitro <= 0) {
    redirect(`/viagens/${viagemId}?erro=abast-invalido`);
  }

  const km = paraInteiro(formData.get("km"));
  const data = paraData(formData.get("data")) ?? new Date();
  const posto = String(formData.get("posto") ?? "").trim() || null;
  const tanqueCheio = formData.get("tanqueCheio") === "true";
  const valorTotal = calcularValorTotal(litros, valorLitro);
  const criadoPorId = await idUsuarioAtual();

  // Cria o abastecimento + a despesa de combustível vinculada (nested create).
  await prisma.abastecimento.create({
    data: {
      cavaloId: viagem.cavaloId,
      viagemId,
      data,
      km,
      litros,
      valorLitro,
      valorTotal,
      posto,
      tanqueCheio,
      despesa: {
        create: {
          viagemId,
          data,
          categoria: "combustivel",
          valor: valorTotal,
          estabelecimento: posto,
          criadoPorId,
        },
      },
    },
  });

  // Mantém o km atual do cavalo em dia (só avança).
  if (km != null) {
    const cav = await prisma.cavalo.findUnique({
      where: { id: viagem.cavaloId },
      select: { kmAtual: true },
    });
    if (cav && (cav.kmAtual == null || km > cav.kmAtual)) {
      await prisma.cavalo.update({ where: { id: viagem.cavaloId }, data: { kmAtual: km } });
    }
  }

  revalidatePath(`/viagens/${viagemId}`);
  revalidatePath("/abastecimentos");
  redirect(`/viagens/${viagemId}?ok=abast-criado`);
}

export async function removerAbastecimentoViagem(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");
  const id = String(formData.get("abastecimentoId") ?? "");

  // Cascade: remover o abastecimento também remove a despesa de combustível vinculada.
  await prisma.abastecimento.deleteMany({ where: { id, viagemId } });

  revalidatePath(`/viagens/${viagemId}`);
  revalidatePath("/abastecimentos");
  redirect(`/viagens/${viagemId}?ok=abast-removido`);
}
