"use server";

/**
 * Ações de Vales do motorista. Verificam admin/gestor no servidor.
 * Vale é só registro/consulta: não afeta caixa nem resultado.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { valeSchema, lerValeDoForm } from "@/domain/vales/validacao";

export async function criarVale(formData: FormData) {
  await exigirGestor();

  const parsed = valeSchema.safeParse(lerValeDoForm(formData));
  if (!parsed.success) redirect("/vales?erro=dados-invalidos");

  const motorista = await prisma.motorista.findUnique({
    where: { id: parsed.data.motoristaId },
    select: { filialId: true },
  });
  if (!motorista) redirect("/vales?erro=motorista-invalido");

  const filial = await prisma.filial.findFirst({ select: { id: true } });

  await prisma.valeMotorista.create({
    data: {
      motoristaId: parsed.data.motoristaId,
      valor: parsed.data.valor,
      data: parsed.data.data,
      dataVencimento: parsed.data.dataVencimento,
      observacoes: parsed.data.observacoes,
      filialId: motorista.filialId ?? filial?.id ?? null,
    },
  });

  revalidatePath("/vales");
  redirect("/vales?ok=criado");
}

export async function editarVale(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/vales?erro=dados-invalidos");

  const parsed = valeSchema.safeParse(lerValeDoForm(formData));
  if (!parsed.success) redirect(`/vales/${id}/editar?erro=dados-invalidos`);

  const existente = await prisma.valeMotorista.findUnique({ where: { id }, select: { id: true } });
  if (!existente) redirect("/vales?erro=nao-encontrado");

  await prisma.valeMotorista.update({
    where: { id },
    data: {
      motoristaId: parsed.data.motoristaId,
      valor: parsed.data.valor,
      data: parsed.data.data,
      dataVencimento: parsed.data.dataVencimento,
      observacoes: parsed.data.observacoes,
    },
  });

  revalidatePath("/vales");
  redirect("/vales?ok=editado");
}

export async function alternarAcertadoVale(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const vale = await prisma.valeMotorista.findUnique({
    where: { id },
    select: { acertado: true },
  });
  if (!vale) redirect("/vales?erro=nao-encontrado");

  const acertado = !vale.acertado;
  await prisma.valeMotorista.update({
    where: { id },
    data: { acertado, dataAcerto: acertado ? new Date() : null },
  });

  revalidatePath("/vales");
  redirect("/vales?ok=atualizado");
}

export async function removerVale(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  await prisma.valeMotorista.deleteMany({ where: { id } });

  revalidatePath("/vales");
  redirect("/vales?ok=removido");
}
