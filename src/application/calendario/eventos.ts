/**
 * Calendário operacional (camada de aplicação): reúne, numa agenda única, os
 * vencimentos e eventos importantes — CNH, exame toxicológico, documentos,
 * parcelas do caminhão, próximas manutenções e contas a receber previstas.
 */
import { prisma } from "@/infrastructure/prisma";
import { reaisParaCentavos, formatarBRL, aplicarPercentual, type Centavos } from "@/shared/dinheiro";
import { calcularSaldoAReceber } from "@/domain/financeiro/calculos";

export type StatusEvento = "vencido" | "proximo" | "futuro";

export interface EventoCalendario {
  data: Date;
  tipo: string;
  rotuloTipo: string;
  titulo: string;
  detalhe: string | null;
  status: StatusEvento;
}

const ROTULO_TIPO: Record<string, string> = {
  cnh: "CNH",
  toxicologico: "Exame toxicológico",
  documento: "Documento",
  manutencao: "Manutenção",
  parcela: "Parcela do caminhão",
  recebimento: "Conta a receber",
};

function statusData(data: Date, hoje: Date, diasProximo = 30): StatusEvento {
  const dias = (data.getTime() - hoje.getTime()) / 86_400_000;
  if (dias < 0) return "vencido";
  if (dias <= diasProximo) return "proximo";
  return "futuro";
}

function somarDias(base: Date, dias: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + dias);
  return d;
}

/** Próxima ocorrência de uma parcela mensal (dia do mês), a partir de hoje. */
function proximaParcela(dia: number, hoje: Date): Date {
  const y = hoje.getFullYear();
  const m = hoje.getMonth();
  const diasNoMes = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  let d = new Date(Date.UTC(y, m, Math.min(dia, diasNoMes), 12));
  if (d.getTime() < hoje.getTime()) {
    const diasProx = new Date(Date.UTC(y, m + 2, 0)).getUTCDate();
    d = new Date(Date.UTC(y, m + 1, Math.min(dia, diasProx), 12));
  }
  return d;
}

export async function gerarEventosCalendario(
  hoje: Date,
  horizonteDias: number,
): Promise<EventoCalendario[]> {
  const limite = somarDias(hoje, horizonteDias);
  const eventos: EventoCalendario[] = [];

  const [motoristas, documentos, manutencoes, cavalos, viagens] = await Promise.all([
    prisma.motorista.findMany({
      select: { nome: true, vencCnh: true, vencToxicologico: true },
    }),
    prisma.documento.findMany({
      where: { dataVencimento: { not: null } },
      select: { titulo: true, categoria: true, dataVencimento: true },
    }),
    prisma.manutencao.findMany({
      where: { proximaData: { not: null } },
      select: { proximaData: true, tipoServico: true, cavalo: { select: { placa: true } } },
    }),
    prisma.cavalo.findMany({
      where: { vencimentoParcela: { not: null }, situacao: { not: "vendido" } },
      select: { placa: true, vencimentoParcela: true, valorParcela: true },
    }),
    prisma.viagem.findMany({
      where: { status: { not: "cancelada" } },
      select: {
        origem: true,
        destino: true,
        valorBrutoFrete: true,
        adiantamento: true,
        percentualImposto: true,
        dataEntrega: true,
        dataCarregamento: true,
        cliente: { select: { razaoSocial: true, prazoMedioPagamento: true } },
        recebimentos: { select: { valor: true } },
      },
    }),
  ]);

  const adiciona = (
    data: Date | null,
    tipo: string,
    titulo: string,
    detalhe: string | null = null,
  ) => {
    if (!data) return;
    if (data.getTime() > limite.getTime()) return; // além do horizonte
    eventos.push({ data, tipo, rotuloTipo: ROTULO_TIPO[tipo] ?? tipo, titulo, detalhe, status: statusData(data, hoje) });
  };

  for (const m of motoristas) {
    adiciona(m.vencCnh, "cnh", `CNH — ${m.nome}`);
    adiciona(m.vencToxicologico, "toxicologico", `Toxicológico — ${m.nome}`);
  }

  for (const d of documentos) {
    adiciona(d.dataVencimento, "documento", d.titulo, d.categoria);
  }

  for (const mn of manutencoes) {
    adiciona(mn.proximaData, "manutencao", `${mn.cavalo.placa} — ${mn.tipoServico ?? "manutenção"}`);
  }

  for (const c of cavalos) {
    if (c.vencimentoParcela == null) continue;
    const data = proximaParcela(c.vencimentoParcela, hoje);
    const valor: Centavos = reaisParaCentavos(Number(c.valorParcela ?? 0));
    adiciona(data, "parcela", `Parcela — ${c.placa}`, valor > 0 ? formatarBRL(valor) : null);
  }

  for (const v of viagens) {
    const brutoC = reaisParaCentavos(Number(v.valorBrutoFrete));
    const adiantC = reaisParaCentavos(Number(v.adiantamento));
    const recsC = v.recebimentos.map((r) => reaisParaCentavos(Number(r.valor)));
    const impostoC = aplicarPercentual(brutoC, Number(v.percentualImposto ?? 0));
    const saldo = calcularSaldoAReceber(brutoC, adiantC, recsC, impostoC);
    if (saldo <= 0) continue;
    const base = v.dataEntrega ?? v.dataCarregamento;
    const prazo = v.cliente?.prazoMedioPagamento ?? null;
    if (!base || prazo == null) continue;
    const data = somarDias(base, prazo);
    const rota = [v.origem, v.destino].filter(Boolean).join(" → ") || "viagem";
    adiciona(data, "recebimento", `Receber — ${v.cliente?.razaoSocial ?? rota}`, formatarBRL(saldo));
  }

  eventos.sort((a, b) => a.data.getTime() - b.data.getTime());
  return eventos;
}
