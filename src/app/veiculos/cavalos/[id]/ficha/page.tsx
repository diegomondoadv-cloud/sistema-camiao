import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, type Centavos } from "@/shared/dinheiro";
import { formatarData, formatarNumero } from "@/shared/formato";
import { calcularResultadoDireto } from "@/domain/financeiro/calculos";
import {
  calcularConsumoDoVeiculo,
  diferencaConsumo,
  type AbastecimentoConsumo,
} from "@/domain/abastecimentos/consumo";
import { ROTULO_STATUS, COR_STATUS } from "@/domain/viagens/validacao";

export const metadata: Metadata = {
  title: "Ficha do veículo · Sistema Transportadora",
};

function Card({
  titulo,
  valor,
  destaque,
}: {
  titulo: string;
  valor: string;
  destaque?: "verde" | "vermelho";
}) {
  const cor =
    destaque === "verde"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : destaque === "vermelho"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-slate-200 bg-white text-slate-800";
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${cor}`}>
      <p className="text-xs opacity-70">{titulo}</p>
      <p className="text-lg font-bold">{valor}</p>
    </div>
  );
}

export default async function FichaVeiculoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirGestor();
  const { id } = await params;

  const cavalo = await prisma.cavalo.findUnique({
    where: { id },
    include: {
      viagens: {
        where: { status: { not: "cancelada" } },
        orderBy: { dataCarregamento: "desc" },
        include: {
          despesas: { select: { categoria: true, valor: true } },
          recebimentos: { select: { valor: true } },
          motorista: { select: { nome: true, percentualComissao: true } },
          cliente: { select: { razaoSocial: true } },
        },
      },
      abastecimentos: { orderBy: { data: "desc" } },
      _count: { select: { pneus: true } },
    },
  });
  if (!cavalo) redirect("/veiculos/cavalos?erro=nao-encontrado");

  // Acumulados a partir das viagens
  let faturamentoC: Centavos = 0;
  let lucroC: Centavos = 0;
  let custosOperacionaisC: Centavos = 0;
  let kmRodados = 0;

  const linhasViagem = cavalo.viagens.map((v) => {
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const comissaoTranspC = reaisParaCentavos(Number(v.comissaoTransportadora));
    const despesasC = v.despesas
      .filter((d) => d.categoria !== "comissao_motorista")
      .reduce((s, d) => s + reaisParaCentavos(Number(d.valor)), 0);
    const { resultadoDireto } = calcularResultadoDireto({
      valorBrutoFrete: brutoC,
      comissaoTransportadora: comissaoTranspC,
      despesasDiretas: despesasC,
      percentualComissaoMotorista: Number(v.motorista?.percentualComissao ?? 0),
      percentualImposto: Number(v.percentualImposto ?? 0),
    });

    faturamentoC += brutoC;
    lucroC += resultadoDireto;
    custosOperacionaisC += brutoC - resultadoDireto;

    if (v.kmInicial != null && v.kmFinal != null && v.kmFinal > v.kmInicial) {
      kmRodados += v.kmFinal - v.kmInicial;
    }

    return {
      id: v.id,
      data: v.dataCarregamento ?? v.dataEntrega,
      rota: [v.origem, v.destino].filter(Boolean).join(" → ") || "—",
      cliente: v.cliente?.razaoSocial ?? "—",
      motorista: v.motorista?.nome ?? "—",
      status: v.status,
      brutoC,
      resultadoC: resultadoDireto,
    };
  });

  // Consumo (método tanque cheio a tanque cheio)
  const abastConsumo: AbastecimentoConsumo[] = cavalo.abastecimentos.map((a) => ({
    km: a.km,
    litros: Number(a.litros),
    valorTotal: Number(a.valorTotal),
    tanqueCheio: a.tanqueCheio,
  }));
  const consumo = calcularConsumoDoVeiculo(abastConsumo);
  const esperado =
    cavalo.mediaConsumoEsperada != null ? Number(cavalo.mediaConsumoEsperada) : null;
  const dif = consumo.suficiente ? diferencaConsumo(consumo.kmPorLitro, esperado) : null;

  const custoOperacionalPorKmC =
    kmRodados > 0 ? Math.round(custosOperacionaisC / kmRodados) : null;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Ficha do veículo · {cavalo.placa}
          </h1>
          <p className="text-sm text-slate-500">
            {[cavalo.marca, cavalo.modelo, cavalo.ano].filter(Boolean).join(" ")}
            {cavalo.kmAtual != null && ` · ${formatarNumero(cavalo.kmAtual, 0)} km atuais`}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/veiculos/cavalos/${cavalo.id}`} className="text-sm text-emerald-700 hover:underline">
            Editar
          </Link>
          <Link href="/veiculos/cavalos" className="text-sm text-emerald-700 hover:underline">
            ← Voltar
          </Link>
        </div>
      </div>

      {/* Indicadores acumulados */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card titulo="Faturamento acumulado" valor={formatarBRL(faturamentoC)} />
        <Card
          titulo="Lucro acumulado (sem custos fixos)"
          valor={formatarBRL(lucroC)}
          destaque={lucroC >= 0 ? "verde" : "vermelho"}
        />
        <Card titulo="Nº de viagens" valor={String(cavalo.viagens.length)} />
        <Card
          titulo="Quilômetros rodados"
          valor={kmRodados > 0 ? `${formatarNumero(kmRodados, 0)} km` : "—"}
        />
        <Card
          titulo="Consumo médio"
          valor={consumo.suficiente ? `${formatarNumero(consumo.kmPorLitro, 2)} km/l` : "dados insuficientes"}
        />
        <Card
          titulo="Custo operacional por km"
          valor={custoOperacionalPorKmC != null ? formatarBRL(custoOperacionalPorKmC) : "—"}
        />
      </div>

      {consumo.suficiente && (
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <p className="text-slate-700">
            Custo de combustível por km:{" "}
            <span className="font-semibold">{formatarBRL(reaisParaCentavos(consumo.custoPorKm))}</span>
            {esperado != null && (
              <>
                {" "}· Esperado: {formatarNumero(esperado, 2)} km/l
                {dif != null && (
                  <span className={dif >= 0 ? "text-emerald-700" : "text-red-600"}>
                    {" "}(diferença {dif >= 0 ? "+" : ""}{formatarNumero(dif, 2)} km/l)
                  </span>
                )}
              </>
            )}
          </p>
        </div>
      )}

      {/* Histórico de viagens */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800">Histórico de viagens</h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Rota</th>
              <th className="px-4 py-3 font-medium">Cliente</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Frete</th>
              <th className="px-4 py-3 font-medium">Resultado</th>
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {linhasViagem.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-slate-400">
                  Nenhuma viagem registrada para este veículo.
                </td>
              </tr>
            )}
            {linhasViagem.map((v) => (
              <tr key={v.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-600">{formatarData(v.data)}</td>
                <td className="px-4 py-3 text-slate-700">{v.rota}</td>
                <td className="px-4 py-3 text-slate-600">{v.cliente}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COR_STATUS[v.status] ?? "bg-slate-100 text-slate-500"}`}>
                    {ROTULO_STATUS[v.status] ?? v.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-700">{formatarBRL(v.brutoC)}</td>
                <td className={`px-4 py-3 font-semibold ${v.resultadoC >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {formatarBRL(v.resultadoC)}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/viagens/${v.id}`} className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                    Abrir
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Abastecimentos */}
      <h2 className="mb-3 text-lg font-semibold text-slate-800">Abastecimentos</h2>
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Posto</th>
              <th className="px-4 py-3 font-medium">Km</th>
              <th className="px-4 py-3 font-medium">Litros</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Tanque</th>
            </tr>
          </thead>
          <tbody>
            {cavalo.abastecimentos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-slate-400">
                  Nenhum abastecimento registrado.
                </td>
              </tr>
            )}
            {cavalo.abastecimentos.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-600">{formatarData(a.data)}</td>
                <td className="px-4 py-3 text-slate-600">{a.posto ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{a.km != null ? formatarNumero(a.km, 0) : "—"}</td>
                <td className="px-4 py-3 text-slate-600">{formatarNumero(Number(a.litros), 1)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">{formatarBRL(reaisParaCentavos(Number(a.valorTotal)))}</td>
                <td className="px-4 py-3 text-slate-600">{a.tanqueCheio ? "Cheio" : "Parcial"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-400">
        Manutenções e pneus ({cavalo._count.pneus} cadastrado(s)) terão histórico
        detalhado nas próximas fases. O lucro acumulado é o resultado direto das
        viagens (antes do rateio de custos fixos).
      </p>
    </main>
  );
}
