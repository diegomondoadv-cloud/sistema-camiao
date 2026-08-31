"use server";

/**
 * Ações de Manutenções. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { manutencaoSchema, lerManutencaoDoForm } from "@/domain/manutencoes/validacao";

export async function criarManutencao(formData: FormData) {
  await exigirGestor();

  const parsed = manutencaoSchema.safeParse(lerManutencaoDoForm(formData));
  if (!parsed.success) redirect("/manutencoes?erro=dados-invalidos");

  const d = parsed.data;

  const cavalo = await prisma.cavalo.findUnique({ where: { id: d.cavaloId } });
  if (!cavalo) redirect("/manutencoes?erro=veiculo-invalido");

  await prisma.manutencao.create({
    data: {
      cavaloId: d.cavaloId,
      data: d.data,
      km: d.km,
      oficina: d.oficina,
      tipoServico: d.tipoServico,
      pecas: d.pecas,
      maoDeObra: d.maoDeObra,
      valor: d.valor,
      proximaData: d.proximaData,
      proximoKm: d.proximoKm,
      observacoes: d.observacoes,
    },
  });

  // Mantém o km atual do cavalo em dia (só avança).
  if (d.km != null && (cavalo.kmAtual == null || d.km > cavalo.kmAtual)) {
    await prisma.cavalo.update({ where: { id: d.cavaloId }, data: { kmAtual: d.km } });
  }

  revalidatePath("/manutencoes");
  redirect("/manutencoes?ok=criada");
}

export async function editarManutencao(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/manutencoes?erro=dados-invalidos");

  const parsed = manutencaoSchema.safeParse(lerManutencaoDoForm(formData));
  if (!parsed.success) redirect(`/manutencoes/${id}/editar?erro=dados-invalidos`);

  const d = parsed.data;

  const cavalo = await prisma.cavalo.findUnique({ where: { id: d.cavaloId } });
  if (!cavalo) redirect(`/manutencoes/${id}/editar?erro=veiculo-invalido`);

  await prisma.manutencao.update({
    where: { id },
    data: {
      cavaloId: d.cavaloId,
      data: d.data,
      km: d.km,
      oficina: d.oficina,
      tipoServico: d.tipoServico,
      pecas: d.pecas,
      maoDeObra: d.maoDeObra,
      valor: d.valor,
      proximaData: d.proximaData,
      proximoKm: d.proximoKm,
      observacoes: d.observacoes,
    },
  });

  // Mantém o km atual do cavalo em dia (só avança).
  if (d.km != null && (cavalo.kmAtual == null || d.km > cavalo.kmAtual)) {
    await prisma.cavalo.update({ where: { id: d.cavaloId }, data: { kmAtual: d.km } });
  }

  revalidatePath("/manutencoes");
  redirect("/manutencoes?ok=editada");
}

export async function removerManutencao(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  await prisma.manutencao.deleteMany({ where: { id } });

  revalidatePath("/manutencoes");
  redirect("/manutencoes?ok=removida");
}
