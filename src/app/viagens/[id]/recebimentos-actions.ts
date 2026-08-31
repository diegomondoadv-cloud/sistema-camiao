"use server";

/**
 * Ações de Recebimentos (contas a receber) de uma viagem.
 * Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import {
  recebimentoSchema,
  lerRecebimentoDoForm,
} from "@/domain/recebimentos/validacao";

export async function criarRecebimento(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");

  const parsed = recebimentoSchema.safeParse(lerRecebimentoDoForm(formData));
  if (!parsed.success) redirect(`/viagens/${viagemId}?erro=recebimento-invalido`);

  const viagem = await prisma.viagem.findUnique({ where: { id: viagemId } });
  if (!viagem) redirect("/viagens?erro=nao-encontrada");

  await prisma.recebimento.create({
    data: {
      viagemId,
      valor: parsed.data.valor,
      dataEfetiva: parsed.data.data,
      formaPagamento: parsed.data.formaPagamento,
      situacao: "recebida",
    },
  });

  revalidatePath(`/viagens/${viagemId}`);
  revalidatePath("/contas-receber");
  redirect(`/viagens/${viagemId}?ok=recebimento-criado`);
}

export async function editarRecebimento(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");
  const recebimentoId = String(formData.get("recebimentoId") ?? "");

  const parsed = recebimentoSchema.safeParse(lerRecebimentoDoForm(formData));
  if (!parsed.success)
    redirect(`/viagens/${viagemId}/recebimentos/${recebimentoId}/editar?erro=recebimento-invalido`);

  const existente = await prisma.recebimento.findFirst({
    where: { id: recebimentoId, viagemId },
    select: { id: true },
  });
  if (!existente) redirect(`/viagens/${viagemId}?erro=recebimento-invalido`);

  await prisma.recebimento.update({
    where: { id: recebimentoId },
    data: {
      valor: parsed.data.valor,
      dataEfetiva: parsed.data.data,
      formaPagamento: parsed.data.formaPagamento,
    },
  });

  revalidatePath(`/viagens/${viagemId}`);
  revalidatePath("/contas-receber");
  redirect(`/viagens/${viagemId}?ok=recebimento-editado`);
}

export async function removerRecebimento(formData: FormData) {
  await exigirGestor();
  const viagemId = String(formData.get("viagemId") ?? "");
  const recebimentoId = String(formData.get("recebimentoId") ?? "");

  await prisma.recebimento.deleteMany({ where: { id: recebimentoId, viagemId } });

  revalidatePath(`/viagens/${viagemId}`);
  revalidatePath("/contas-receber");
  redirect(`/viagens/${viagemId}?ok=recebimento-removido`);
}
