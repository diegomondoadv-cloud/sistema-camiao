"use server";

/**
 * Ações de Despesas de uma viagem. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor, idUsuarioAtual } from "@/infrastructure/auth/sessao";
import { despesaSchema, lerDespesaDoForm } from "@/domain/despesas/validacao";

export async function criarDespesa(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");

  const parsed = despesaSchema.safeParse(lerDespesaDoForm(formData));
  if (!parsed.success) redirect(`/viagens/${viagemId}?erro=despesa-invalida`);

  const viagem = await prisma.viagem.findUnique({ where: { id: viagemId } });
  if (!viagem) redirect("/viagens?erro=nao-encontrada");

  // Resolve o autor pelo banco (tolera sessão antiga com id inexistente).
  const criadoPorId = await idUsuarioAtual();

  await prisma.despesa.create({
    data: { ...parsed.data, viagemId, criadoPorId },
  });

  revalidatePath(`/viagens/${viagemId}`);
  redirect(`/viagens/${viagemId}?ok=despesa-criada`);
}

export async function editarDespesa(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");
  const despesaId = String(formData.get("despesaId") ?? "");

  const parsed = despesaSchema.safeParse(lerDespesaDoForm(formData));
  if (!parsed.success)
    redirect(`/viagens/${viagemId}/despesas/${despesaId}/editar?erro=despesa-invalida`);

  const existente = await prisma.despesa.findFirst({
    where: { id: despesaId, viagemId },
    select: { id: true, abastecimentoId: true },
  });
  if (!existente) redirect(`/viagens/${viagemId}?erro=despesa-invalida`);

  // Despesa de abastecimento: a fonte é a abastecida (litros × R$/L). Não deixa
  // editar por aqui para não dessincronizar; manda editar pela abastecida.
  if (existente.abastecimentoId) {
    redirect(`/abastecimentos/${existente.abastecimentoId}/editar`);
  }

  await prisma.despesa.update({
    where: { id: despesaId },
    data: { ...parsed.data },
  });

  revalidatePath(`/viagens/${viagemId}`);
  redirect(`/viagens/${viagemId}?ok=despesa-editada`);
}

export async function removerDespesa(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");
  const despesaId = String(formData.get("despesaId") ?? "");

  await prisma.despesa.deleteMany({ where: { id: despesaId, viagemId } });

  revalidatePath(`/viagens/${viagemId}`);
  redirect(`/viagens/${viagemId}?ok=despesa-removida`);
}
