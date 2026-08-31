/**
 * Validação de viagens/fretes (camada de domínio, testável).
 * Valores monetários entram em reais (Decimal no banco); a conversão para
 * centavos e o cálculo de saldo ficam na camada financeira (calculos.ts).
 */
import { z } from "zod";
import { paraInteiro, paraDecimal, paraData, textoOpcional } from "@/shared/parse";

export const STATUS_VIAGEM = [
  "planejada",
  "aguardando_carregamento",
  "em_viagem",
  "entregue",
  "aguardando_pagamento",
  "finalizada",
  "cancelada",
] as const;

export const ROTULO_STATUS: Record<string, string> = {
  planejada: "Planejada",
  aguardando_carregamento: "Aguardando carregamento",
  em_viagem: "Em viagem",
  entregue: "Entregue",
  aguardando_pagamento: "Aguardando pagamento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export const COR_STATUS: Record<string, string> = {
  planejada: "bg-slate-100 text-slate-600",
  aguardando_carregamento: "bg-amber-50 text-amber-700",
  em_viagem: "bg-sky-50 text-sky-700",
  entregue: "bg-indigo-50 text-indigo-700",
  aguardando_pagamento: "bg-amber-50 text-amber-700",
  finalizada: "bg-emerald-50 text-emerald-700",
  cancelada: "bg-red-50 text-red-700",
};

const idOuNulo = (v: unknown): string | null => {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
};

export const viagemSchema = z.object({
  cavaloId: z.string().min(1, "Selecione o caminhão."),
  carretaId: z.string().nullable(),
  motoristaId: z.string().nullable(),
  clienteId: z.string().nullable(),

  embarcador: textoOpcional,
  destinatario: textoOpcional,
  origem: textoOpcional,
  destino: textoOpcional,

  dataCarregamento: z.date().nullable(),
  previsaoEntrega: z.date().nullable(),
  dataEntrega: z.date().nullable(),

  tipoCarga: textoOpcional,
  peso: z.number().min(0).max(999_999).nullable(),
  numeroPaletes: z.number().int().min(0).max(100_000).nullable(),

  valorBrutoFrete: z.number().min(0).max(99_999_999),
  adiantamento: z.number().min(0).max(99_999_999),
  comissaoTransportadora: z.number().min(0).max(99_999_999),
  percentualImposto: z.number().min(0).max(100).default(2.8),
  pedagioIncluso: z.boolean(),

  kmInicial: z.number().int().min(0).max(9_999_999).nullable(),
  kmFinal: z.number().int().min(0).max(9_999_999).nullable(),
  kmCarregado: z.number().int().min(0).max(9_999_999).nullable(),
  kmVazio: z.number().int().min(0).max(9_999_999).nullable(),

  status: z.enum(STATUS_VIAGEM),
  numeroCte: textoOpcional,
  numeroMdfe: textoOpcional,
  observacoes: textoOpcional,
});
export type ViagemInput = z.infer<typeof viagemSchema>;

/** Monta o objeto de viagem a partir do FormData. */
export function lerViagemDoForm(fd: FormData) {
  return {
    cavaloId: String(fd.get("cavaloId") ?? "").trim(),
    carretaId: idOuNulo(fd.get("carretaId")),
    motoristaId: idOuNulo(fd.get("motoristaId")),
    clienteId: idOuNulo(fd.get("clienteId")),

    embarcador: fd.get("embarcador"),
    destinatario: fd.get("destinatario"),
    origem: fd.get("origem"),
    destino: fd.get("destino"),

    dataCarregamento: paraData(fd.get("dataCarregamento")),
    previsaoEntrega: paraData(fd.get("previsaoEntrega")),
    dataEntrega: paraData(fd.get("dataEntrega")),

    tipoCarga: fd.get("tipoCarga"),
    peso: paraDecimal(fd.get("peso")),
    numeroPaletes: paraInteiro(fd.get("numeroPaletes")),

    valorBrutoFrete: paraDecimal(fd.get("valorBrutoFrete")) ?? 0,
    adiantamento: paraDecimal(fd.get("adiantamento")) ?? 0,
    comissaoTransportadora: paraDecimal(fd.get("comissaoTransportadora")) ?? 0,
    percentualImposto: paraDecimal(fd.get("percentualImposto")) ?? 2.8,
    pedagioIncluso: fd.get("pedagioIncluso") === "sim",

    kmInicial: paraInteiro(fd.get("kmInicial")),
    kmFinal: paraInteiro(fd.get("kmFinal")),
    kmCarregado: paraInteiro(fd.get("kmCarregado")),
    kmVazio: paraInteiro(fd.get("kmVazio")),

    status: fd.get("status"),
    numeroCte: fd.get("numeroCte"),
    numeroMdfe: fd.get("numeroMdfe"),
    observacoes: fd.get("observacoes"),
  };
}
