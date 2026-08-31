"use server";

/**
 * Ações de Contas a Pagar. Verificam admin/gestor no servidor.
 */
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/infrastructure/prisma";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { contaPagarSchema, lerContaPagarDoForm, CATEGORIAS_CONTA_PAGAR } from "@/domain/contas-pagar/validacao";
import { ROTULO_CATEGORIA_CUSTO } from "@/domain/custos-fixos/validacao";
import { fornecedorSchema, lerFornecedorDoForm } from "@/domain/fornecedores/validacao";
import { paraInteiro } from "@/shared/parse";

/** Cadastro rápido de fornecedor a partir da tela de contas a pagar. */
export async function criarFornecedorRapido(formData: FormData) {
  await exigirGestor();
  const parsed = fornecedorSchema.safeParse(lerFornecedorDoForm(formData));
  if (!parsed.success) redirect("/contas-pagar?erro=fornecedor-invalido");

  const filial = await prisma.filial.findFirst();
  await prisma.fornecedor.create({
    data: { ...parsed.data, filialId: filial?.id ?? null },
  });

  revalidatePath("/contas-pagar");
  redirect("/contas-pagar?ok=fornecedor-criado");
}

/** Soma `n` meses a uma data, mantendo o dia (com ajuste no fim do mês). */
function addMeses(base: Date, n: number): Date {
  const dia = base.getUTCDate();
  const alvoMesInicio = new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth() + n, 1, 12));
  const diasNoMes = new Date(
    Date.UTC(alvoMesInicio.getUTCFullYear(), alvoMesInicio.getUTCMonth() + 1, 0),
  ).getUTCDate();
  alvoMesInicio.setUTCDate(Math.min(dia, diasNoMes));
  return alvoMesInicio;
}

export async function criarContaPagar(formData: FormData) {
  await exigirGestor();

  const parsed = contaPagarSchema.safeParse(lerContaPagarDoForm(formData));
  if (!parsed.success) redirect("/contas-pagar?erro=dados-invalidos");

  const d = parsed.data;
  const filial = await prisma.filial.findFirst();
  const filialId = filial?.id ?? null;

  // Nº de parcelas (1 = conta única). Ex.: financiamento em 24x.
  const parcelas = Math.min(120, Math.max(1, paraInteiro(formData.get("parcelas")) ?? 1));

  if (parcelas <= 1) {
    await prisma.contaPagar.create({ data: { ...d, filialId } });
    revalidatePath("/contas-pagar");
    redirect("/contas-pagar?ok=criada");
  }

  // Lançamento parcelado: uma conta por mês, vencimentos mensais.
  const dados = Array.from({ length: parcelas }, (_, i) => ({
    ...d,
    descricao: `${d.descricao} (${i + 1}/${parcelas})`,
    dataVencimento: d.dataVencimento ? addMeses(d.dataVencimento, i) : null,
    filialId,
  }));
  await prisma.contaPagar.createMany({ data: dados });

  revalidatePath("/contas-pagar");
  redirect(`/contas-pagar?ok=parcelada&n=${parcelas}`);
}

export async function alternarPagaContaPagar(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  const conta = await prisma.contaPagar.findUnique({
    where: { id },
    select: { paga: true },
  });
  if (!conta) redirect("/contas-pagar?erro=nao-encontrada");

  const paga = !conta.paga;
  await prisma.contaPagar.update({
    where: { id },
    data: { paga, dataPagamento: paga ? new Date() : null },
  });

  revalidatePath("/contas-pagar");
  redirect("/contas-pagar?ok=atualizada");
}

/**
 * Gera contas a pagar a partir dos custos fixos MENSAIS (rastreador, seguro,
 * financiamento, etc.), para 1 ou VÁRIOS meses a partir de um mês/ano.
 * Idempotente: o índice único (custoFixoId, competencia) + skipDuplicates
 * evita duplicar se rodar de novo para o mesmo mês.
 */
export async function gerarContasFixasDoMes(formData: FormData) {
  await exigirGestor();
  const anoBase = Number(formData.get("ano")) || new Date().getFullYear();
  const mesBase = Math.min(12, Math.max(1, Number(formData.get("mes")) || 1));
  const meses = Math.min(24, Math.max(1, paraInteiro(formData.get("meses")) ?? 1));

  const filial = await prisma.filial.findFirst();
  const custos = await prisma.custoFixo.findMany({
    where: { periodicidade: "mensal" },
    include: { cavalo: { select: { placa: true, vencimentoParcela: true } } },
  });
  const categoriasConta = CATEGORIAS_CONTA_PAGAR as readonly string[];

  let total = 0;
  for (let k = 0; k < meses; k++) {
    const ref = new Date(Date.UTC(anoBase, mesBase - 1 + k, 1));
    const ano = ref.getUTCFullYear();
    const mes = ref.getUTCMonth() + 1;
    const competencia = `${ano}-${String(mes).padStart(2, "0")}`;
    const inicioMes = new Date(Date.UTC(ano, mes - 1, 1));
    const fimMes = new Date(Date.UTC(ano, mes, 0, 23, 59, 59));
    const diasNoMes = new Date(Date.UTC(ano, mes, 0)).getUTCDate();

    const dados = custos
      .filter((cf) => {
        // Respeita a vigência do custo, quando informada.
        if (cf.vigenciaInicio && cf.vigenciaInicio.getTime() > fimMes.getTime()) return false;
        if (cf.vigenciaFim && cf.vigenciaFim.getTime() < inicioMes.getTime()) return false;
        return true;
      })
      .map((cf) => {
        const rotulo = ROTULO_CATEGORIA_CUSTO[cf.categoria] ?? cf.categoria;
        const descricao =
          cf.escopo === "veiculo" && cf.cavalo
            ? `${rotulo} — ${cf.cavalo.placa}`
            : rotulo;
        const dia = cf.cavalo?.vencimentoParcela ?? 10;
        const dataVencimento = new Date(Date.UTC(ano, mes - 1, Math.min(dia, diasNoMes), 12));
        return {
          descricao,
          categoria: categoriasConta.includes(cf.categoria) ? cf.categoria : "outros",
          valor: cf.valor,
          dataVencimento,
          origem: "custo_fixo",
          custoFixoId: cf.id,
          competencia,
          cavaloId: cf.cavaloId,
          filialId: cf.filialId ?? filial?.id ?? null,
        };
      });

    const res = await prisma.contaPagar.createMany({ data: dados, skipDuplicates: true });
    total += res.count;
  }

  revalidatePath("/contas-pagar");
  redirect(`/contas-pagar?ok=geradas&n=${total}`);
}

export async function editarContaPagar(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/contas-pagar?erro=dados-invalidos");

  const parsed = contaPagarSchema.safeParse(lerContaPagarDoForm(formData));
  if (!parsed.success) redirect(`/contas-pagar/${id}/editar?erro=dados-invalidos`);

  const existente = await prisma.contaPagar.findUnique({ where: { id }, select: { id: true } });
  if (!existente) redirect("/contas-pagar?erro=nao-encontrada");

  // Atualiza só os campos editáveis (não mexe em paga/pagamento/origem/parcelas).
  await prisma.contaPagar.update({ where: { id }, data: { ...parsed.data } });

  revalidatePath("/contas-pagar");
  redirect("/contas-pagar?ok=editada");
}

export async function removerContaPagar(formData: FormData) {
  await exigirGestor();
  const id = String(formData.get("id") ?? "");

  await prisma.contaPagar.deleteMany({ where: { id } });

  revalidatePath("/contas-pagar");
  redirect("/contas-pagar?ok=removida");
}
