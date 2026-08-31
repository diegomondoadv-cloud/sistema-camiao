"use server";

/**
 * Ações de Abastecimentos. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import {
  abastecimentoSchema,
  lerAbastecimentoDoForm,
  calcularValorTotal,
} from "@/domain/abastecimentos/validacao";

export async function criarAbastecimento(formData: FormData) {
  await exigirGestor();

  const parsed = abastecimentoSchema.safeParse(lerAbastecimentoDoForm(formData));
  if (!parsed.success) redirect("/abastecimentos?erro=dados-invalidos");

  const d = parsed.data;

  const cavalo = await prisma.cavalo.findUnique({ where: { id: d.cavaloId } });
  if (!cavalo) redirect("/abastecimentos?erro=veiculo-invalido");

  await prisma.abastecimento.create({
    data: {
      cavaloId: d.cavaloId,
      viagemId: d.viagemId,
      data: d.data,
      posto: d.posto,
      cidade: d.cidade,
      km: d.km,
      litros: d.litros,
      valorLitro: d.valorLitro,
      valorTotal: calcularValorTotal(d.litros, d.valorLitro),
      tipoCombustivel: d.tipoCombustivel,
      tanqueCheio: d.tanqueCheio,
    },
  });

  // Mantém o km atual do cavalo em dia (só avança, nunca retrocede).
  if (d.km != null && (cavalo.kmAtual == null || d.km > cavalo.kmAtual)) {
    await prisma.cavalo.update({
      where: { id: d.cavaloId },
      data: { kmAtual: d.km },
    });
  }

  revalidatePath("/abastecimentos");
  redirect("/abastecimentos?ok=criado");
}

export async function editarAbastecimento(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/abastecimentos?erro=dados-invalidos");

  const parsed = abastecimentoSchema.safeParse(lerAbastecimentoDoForm(formData));
  if (!parsed.success) redirect(`/abastecimentos/${id}/editar?erro=dados-invalidos`);

  const d = parsed.data;

  const existente = await prisma.abastecimento.findUnique({
    where: { id },
    include: { despesa: { select: { id: true } } },
  });
  if (!existente) redirect("/abastecimentos?erro=veiculo-invalido");

  const cavalo = await prisma.cavalo.findUnique({ where: { id: d.cavaloId } });
  if (!cavalo) redirect(`/abastecimentos/${id}/editar?erro=veiculo-invalido`);

  const valorTotal = calcularValorTotal(d.litros, d.valorLitro);

  await prisma.abastecimento.update({
    where: { id },
    data: {
      cavaloId: d.cavaloId,
      viagemId: d.viagemId,
      data: d.data,
      posto: d.posto,
      cidade: d.cidade,
      km: d.km,
      litros: d.litros,
      valorLitro: d.valorLitro,
      valorTotal,
      tipoCombustivel: d.tipoCombustivel,
      tanqueCheio: d.tanqueCheio,
    },
  });

  // Se este abastecimento foi lançado pela viagem (tem despesa vinculada),
  // mantém a despesa em dia para o resultado da viagem não ficar errado.
  if (existente!.despesa) {
    await prisma.despesa.update({
      where: { id: existente!.despesa.id },
      data: { valor: valorTotal, data: d.data },
    });
  }

  // Mantém o km atual do cavalo em dia (só avança, nunca retrocede).
  if (d.km != null && (cavalo.kmAtual == null || d.km > cavalo.kmAtual)) {
    await prisma.cavalo.update({
      where: { id: d.cavaloId },
      data: { kmAtual: d.km },
    });
  }

  revalidatePath("/abastecimentos");
  redirect("/abastecimentos?ok=editado");
}

export async function removerAbastecimento(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  await prisma.abastecimento.deleteMany({ where: { id } });

  revalidatePath("/abastecimentos");
  redirect("/abastecimentos?ok=removido");
}
