import type { Metadata } from "next";
import Link from "next/link";
import { exigirGestor } from "@/infrastructure/auth/sessao";
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL } from "@/shared/dinheiro";
import { formatarData, formatarNumero } from "@/shared/formato";
import { dataParaInput, paraData } from "@/shared/parse";
import { Campo, inputClass } from "@/components/campo";
import {
  calcularConsumoDoVeiculo,
  diferencaConsumo,
  type AbastecimentoConsumo,
} from "@/domain/abastecimentos/consumo";
import { criarAbastecimento, removerAbastecimento } from "./actions";

export const metadata: Metadata = {
  title: "Abastecimentos · Sistema Transportadora",
};

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const mensagens: Record<string, { texto: string; tipo: "ok" | "erro" }> = {
  criado: { texto: "Abastecimento lançado com sucesso.", tipo: "ok" },
  editado: { texto: "Abastecimento atualizado.", tipo: "ok" },
  removido: { texto: "Abastecimento removido.", tipo: "ok" },
  "dados-invalidos": {
    texto: "Verifique os dados: veículo, litros e valor por litro são obrigatórios.",
    tipo: "erro",
  },
  "veiculo-invalido": { texto: "Veículo não encontrado.", tipo: "erro" },
};

function rotaViagem(v: { origem: string | null; destino: string | null } | null) {
  if (!v) return null;
  const r = [v.origem, v.destino].filter(Boolean).join(" → ");
  return r || null;
}

export default async function AbastecimentosPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    erro?: string;
    mes?: string;
    ano?: string;
    inicio?: string;
    fim?: string;
  }>;
}) {
  await exigirGestor();
  const sp = await searchParams;
  const { ok, erro } = sp;
  const aviso = mensagens[ok ?? ""] ?? mensagens[erro ?? ""];

  const anoAtual = new Date().getFullYear();

  // Filtro por período (data do abastecimento): mês/ano ou período específico.
  const mesSel = Number(sp.mes) || 0;
  const anoSel = Number(sp.ano) || 0;
  const inicio = paraData(sp.inicio ?? null);
  const fim = paraData(sp.fim ?? null);
  let rangeIni: Date | null = null;
  let rangeFim: Date | null = null; // exclusivo
  if (inicio || fim) {
    rangeIni = inicio;
    rangeFim = fim ? new Date(fim.getTime() + 24 * 60 * 60 * 1000) : null;
  } else if (anoSel > 0) {
    if (mesSel > 0) {
      rangeIni = new Date(Date.UTC(anoSel, mesSel - 1, 1));
      rangeFim = new Date(Date.UTC(anoSel, mesSel, 1));
    } else {
      rangeIni = new Date(Date.UTC(anoSel, 0, 1));
      rangeFim = new Date(Date.UTC(anoSel + 1, 0, 1));
    }
  }
  const temFiltro =
    mesSel > 0 || anoSel > 0 || Boolean(sp.inicio) || Boolean(sp.fim);
  const noPeriodo = (d: Date | null) => {
    if (rangeIni == null && rangeFim == null) return true;
    if (!d) return false;
    if (rangeIni && d.getTime() < rangeIni.getTime()) return false;
    if (rangeFim && d.getTime() >= rangeFim.getTime()) return false;
    return true;
  };

  const [cavalos, viagens, abastecimentos] = await Promise.all([
    prisma.cavalo.findMany({
      orderBy: { placa: "asc" },
      select: {
        id: true,
        placa: true,
        marca: true,
        modelo: true,
        kmAtual: true,
        mediaConsumoEsperada: true,
      },
    }),
    prisma.viagem.findMany({
      orderBy: { dataCarregamento: "desc" },
      take: 100,
      select: { id: true, origem: true, destino: true },
    }),
    prisma.abastecimento.findMany({
      orderBy: { data: "desc" },
      include: {
        cavalo: { select: { placa: true } },
        viagem: { select: { origem: true, destino: true } },
      },
    }),
  ]);

  // Agrupa abastecimentos por veículo para o painel de consumo.
  const porCavalo = new Map<string, AbastecimentoConsumo[]>();
  for (const a of abastecimentos) {
    const lista = porCavalo.get(a.cavaloId) ?? [];
    lista.push({
      km: a.km,
      litros: Number(a.litros),
      valorTotal: Number(a.valorTotal),
      tanqueCheio: a.tanqueCheio,
      data: a.data,
    });
    porCavalo.set(a.cavaloId, lista);
  }

  const consumoPorCavalo = cavalos.map((c) => {
    const resultado = calcularConsumoDoVeiculo(porCavalo.get(c.id) ?? []);
    const esperado =
      c.mediaConsumoEsperada != null ? Number(c.mediaConsumoEsperada) : null;
    // Preço médio do diesel pago (Σ valor / Σ litros).
    const fills = porCavalo.get(c.id) ?? [];
    const litrosTot = fills.reduce((s, a) => s + a.litros, 0);
    const valorTot = fills.reduce((s, a) => s + a.valorTotal, 0);
    const precoMedioLitro = litrosTot > 0 ? valorTot / litrosTot : null;
    return { cavalo: c, resultado, esperado, precoMedioLitro };
  });

  // Média por abastecida — método TANQUE-A-TANQUE: a média de um trecho é a
  // distância entre dois tanques cheios ÷ (litros das PARCIAIS do meio + os
  // litros que completaram o tanque). A média fica atribuída à abastecida que
  // FECHOU o trecho (o tanque cheio). Abastecidas parciais são marcadas.
  const mediaPorId = new Map<string, number | null>(); // km/l do trecho (só nos que fecham)
  const segKmPorId = new Map<string, number>(); // km rodados do trecho
  const segLitrosPorId = new Map<string, number>(); // litros do trecho
  const parcialPorId = new Map<string, boolean>();
  const porCavId = new Map<string, typeof abastecimentos>();
  for (const a of abastecimentos) {
    const l = porCavId.get(a.cavaloId) ?? [];
    l.push(a);
    porCavId.set(a.cavaloId, l);
  }
  for (const [, lista] of porCavId) {
    // Ordena por DATA (empate por km) — parciais podem não ter km.
    const ordenados = [...lista].sort(
      (x, y) =>
        x.data.getTime() - y.data.getTime() ||
        (x.km ?? Infinity) - (y.km ?? Infinity),
    );
    // Acumula litros desde o último tanque cheio COM km; ao fechar no próximo
    // tanque cheio com km, atribui o trecho (dkm ÷ litros acumulados) a ele.
    let ultimoKm: number | null = null;
    let accLitros = 0;
    for (const a of ordenados) {
      parcialPorId.set(a.id, !a.tanqueCheio);
      mediaPorId.set(a.id, null);
      accLitros += Number(a.litros);
      if (a.tanqueCheio && a.km != null) {
        if (ultimoKm != null) {
          const dkm = a.km - ultimoKm;
          if (dkm > 0 && accLitros > 0) {
            mediaPorId.set(a.id, dkm / accLitros);
            segKmPorId.set(a.id, dkm);
            segLitrosPorId.set(a.id, accLitros);
          }
        }
        accLitros = 0;
        ultimoKm = a.km;
      }
    }
  }

  // Lista filtrada pelo período escolhido.
  const abastecimentosFiltrados = abastecimentos.filter((a) => noPeriodo(a.data));

  // Totais do período (a partir da lista filtrada).
  const litrosPeriodo = abastecimentosFiltrados.reduce(
    (s, a) => s + Number(a.litros),
    0,
  );
  const gastoPeriodoC = abastecimentosFiltrados.reduce(
    (s, a) => s + reaisParaCentavos(Number(a.valorTotal)),
    0,
  );
  const precoMedioPeriodoC =
    litrosPeriodo > 0
      ? reaisParaCentavos(Number(gastoPeriodoC) / 100 / litrosPeriodo)
      : null;
  // Média km/l do período (tanque-a-tanque): soma os km e os litros dos TRECHOS
  // fechados (tanque cheio → tanque cheio) cuja abastecida de fechamento cai no
  // período. Cada trecho já inclui as parciais do meio.
  let kmPeriodo = 0;
  let litrosMediaPeriodo = 0;
  for (const a of abastecimentosFiltrados) {
    const segKm = segKmPorId.get(a.id);
    const segLitros = segLitrosPorId.get(a.id);
    if (segKm != null && segLitros != null && segLitros > 0) {
      kmPeriodo += segKm;
      litrosMediaPeriodo += segLitros;
    }
  }
  const mediaPeriodo =
    litrosMediaPeriodo > 0 ? kmPeriodo / litrosMediaPeriodo : null;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Abastecimentos</h1>
        <Link href="/" className="text-sm text-emerald-700 hover:underline">
          ← Voltar ao início
        </Link>
      </div>

      {aviso && (
        <p
          role="alert"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            aviso.tipo === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-700"
          }`}
        >
          {aviso.texto}
        </p>
      )}

      {/* Painel de consumo por veículo */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-800">
          Consumo por veículo{" "}
          <span className="text-sm font-normal text-slate-400">(histórico completo)</span>
        </h2>
        {consumoPorCavalo.length === 0 && (
          <p className="text-sm text-slate-400">Nenhum veículo cadastrado.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {consumoPorCavalo.map(({ cavalo, resultado, esperado, precoMedioLitro }) => {
            const dif = resultado.suficiente
              ? diferencaConsumo(resultado.kmPorLitro, esperado)
              : null;
            return (
              <div
                key={cavalo.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="font-semibold text-slate-800">{cavalo.placa}</p>
                {precoMedioLitro != null && (
                  <p className="mt-1 text-sm text-slate-600">
                    Diesel médio pago:{" "}
                    <span className="font-semibold">{formatarBRL(reaisParaCentavos(precoMedioLitro))}</span>/L
                  </p>
                )}
                {resultado.suficiente ? (
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-slate-700">
                      Consumo real:{" "}
                      <span className="font-bold text-slate-900">
                        {formatarNumero(resultado.kmPorLitro, 2)} km/l
                      </span>
                    </p>
                    <p className="text-slate-600">
                      Custo por km:{" "}
                      {formatarBRL(reaisParaCentavos(resultado.custoPorKm))}
                    </p>
                    <p className="text-slate-500">
                      Esperado:{" "}
                      {esperado != null
                        ? `${formatarNumero(esperado, 2)} km/l`
                        : "não informado"}
                    </p>
                    {dif != null && (
                      <p
                        className={
                          dif >= 0
                            ? "font-medium text-emerald-700"
                            : "font-medium text-red-600"
                        }
                      >
                        Diferença: {dif >= 0 ? "+" : ""}
                        {formatarNumero(dif, 2)} km/l
                      </p>
                    )}
                    <p className="text-xs text-slate-400">
                      Base: {resultado.kmRodados} km em{" "}
                      {formatarNumero(resultado.litrosConsumidos, 1)} L
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-sm text-amber-600">
                    Dados insuficientes. {resultado.motivo}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filtro por período */}
      <form
        method="get"
        className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      >
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Mês</label>
          <select name="mes" defaultValue={mesSel || ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {MESES.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Ano</label>
          <select name="ano" defaultValue={anoSel || ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option value="">Todos</option>
            {Array.from({ length: 6 }, (_, i) => anoAtual + 1 - i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Início (período)</label>
          <input type="date" name="inicio" defaultValue={sp.inicio ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        </div>
        <div className="flex flex-col">
          <label className="mb-1 text-xs text-slate-500">Fim (período)</label>
          <input type="date" name="fim" defaultValue={sp.fim ?? ""} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
        </div>
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-emerald-700">
          Filtrar
        </button>
        {temFiltro && (
          <Link href="/abastecimentos" className="rounded-lg border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Limpar
          </Link>
        )}
        <p className="w-full text-xs text-slate-400">
          O período específico (início/fim) tem prioridade sobre mês/ano. O filtro
          usa a data do abastecimento.
        </p>
      </form>

      {/* Totais do período */}
      <div className="mb-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Litros no período</p>
          <p className="text-lg font-bold text-slate-800">
            {formatarNumero(litrosPeriodo, 1)} L
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Gasto no período</p>
          <p className="text-lg font-bold text-slate-800">
            {formatarBRL(gastoPeriodoC)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Diesel médio (R$/L)</p>
          <p className="text-lg font-bold text-slate-800">
            {precoMedioPeriodoC != null ? `${formatarBRL(precoMedioPeriodoC)}/L` : "—"}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Média do período</p>
          <p className="text-lg font-bold text-slate-800">
            {mediaPeriodo != null ? `${formatarNumero(mediaPeriodo, 2)} km/l` : "—"}
          </p>
          {mediaPeriodo != null && (
            <p className="text-xs text-slate-400">
              {kmPeriodo.toLocaleString("pt-BR")} km / {formatarNumero(litrosMediaPeriodo, 1)} L
            </p>
          )}
        </div>
      </div>

      {/* Lista de abastecimentos */}
      <div className="mb-8 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Data</th>
              <th className="px-4 py-3 font-medium">Veículo</th>
              <th className="px-4 py-3 font-medium">Km</th>
              <th className="px-4 py-3 font-medium">Litros</th>
              <th className="px-4 py-3 font-medium">Média</th>
              <th className="px-4 py-3 font-medium">R$/L</th>
              <th className="px-4 py-3 font-medium">Total</th>
              <th className="px-4 py-3 font-medium">Tanque</th>
              <th className="px-4 py-3 font-medium">Ação</th>
            </tr>
          </thead>
          <tbody>
            {abastecimentosFiltrados.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6 text-center text-slate-400">
                  {temFiltro
                    ? "Nenhum abastecimento no período selecionado."
                    : "Nenhum abastecimento lançado ainda."}
                </td>
              </tr>
            )}
            {abastecimentosFiltrados.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-600">{formatarData(a.data)}</td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {a.cavalo.placa}
                  {rotaViagem(a.viagem) && (
                    <span className="block text-xs font-normal text-slate-400">
                      {rotaViagem(a.viagem)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.km != null ? a.km.toLocaleString("pt-BR") : "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarNumero(Number(a.litros), 1)}
                </td>
                <td className="px-4 py-3 font-medium text-slate-700">
                  {mediaPorId.get(a.id) != null ? (
                    `${formatarNumero(mediaPorId.get(a.id) as number, 2)} km/l`
                  ) : parcialPorId.get(a.id) ? (
                    <span className="text-xs text-slate-400">parcial</span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatarBRL(reaisParaCentavos(Number(a.valorLitro)))}
                </td>
                <td className="px-4 py-3 font-medium text-slate-800">
                  {formatarBRL(reaisParaCentavos(Number(a.valorTotal)))}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {a.tanqueCheio ? "Cheio" : "Parcial"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/abastecimentos/${a.id}/editar`}
                      className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 transition hover:bg-slate-50"
                    >
                      Editar
                    </Link>
                    <form action={removerAbastecimento}>
                      <input type="hidden" name="id" value={a.id} />
                      <button
                        type="submit"
                        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-red-600 transition hover:bg-red-50"
                      >
                        Remover
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Lançar abastecimento */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">
          Lançar abastecimento
        </h2>
        {cavalos.length === 0 ? (
          <p className="text-sm text-slate-500">
            Cadastre um veículo antes de lançar abastecimentos.
          </p>
        ) : (
          <form
            action={criarAbastecimento}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            <Campo id="cavaloId" label="Veículo *" dica="O último km é a referência para a média">
              <select id="cavaloId" name="cavaloId" required className={inputClass}>
                {cavalos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {[c.placa, c.marca, c.modelo].filter(Boolean).join(" ")}
                    {c.kmAtual != null ? ` · últ. km ${c.kmAtual.toLocaleString("pt-BR")}` : ""}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="viagemId" label="Viagem (opcional)">
              <select id="viagemId" name="viagemId" defaultValue="" className={inputClass}>
                <option value="">— sem viagem —</option>
                {viagens.map((v) => (
                  <option key={v.id} value={v.id}>
                    {rotaViagem(v) ?? `Viagem ${v.id.slice(0, 6)}`}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo id="data" label="Data">
              <input
                id="data"
                name="data"
                type="date"
                defaultValue={dataParaInput(new Date())}
                className={inputClass}
              />
            </Campo>
            <Campo id="km" label="Quilometragem" dica="Hodômetro no momento">
              <input id="km" name="km" inputMode="numeric" placeholder="480000" className={inputClass} />
            </Campo>
            <Campo id="litros" label="Litros *" dica="Ex.: 250,5">
              <input id="litros" name="litros" inputMode="decimal" required placeholder="0,000" className={inputClass} />
            </Campo>
            <Campo id="valorLitro" label="Valor por litro (R$) *" dica="Ex.: 6,29">
              <input id="valorLitro" name="valorLitro" inputMode="decimal" required placeholder="0,00" className={inputClass} />
            </Campo>
            <Campo id="posto" label="Posto">
              <input id="posto" name="posto" placeholder="Posto Ipiranga" className={inputClass} />
            </Campo>
            <Campo id="cidade" label="Cidade">
              <input id="cidade" name="cidade" placeholder="Curitiba" className={inputClass} />
            </Campo>
            <Campo id="tipoCombustivel" label="Tipo de combustível">
              <input id="tipoCombustivel" name="tipoCombustivel" placeholder="Diesel S10" className={inputClass} />
            </Campo>
            <div className="flex items-center gap-2 pt-6">
              <input
                id="tanqueCheio"
                name="tanqueCheio"
                type="checkbox"
                value="true"
                defaultChecked
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="tanqueCheio" className="text-sm font-medium text-slate-700">
                Tanque cheio (necessário para calcular consumo)
              </label>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <button
                type="submit"
                className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
              >
                Lançar abastecimento
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
