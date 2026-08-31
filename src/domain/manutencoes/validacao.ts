/**
 * Validação de manutenções (camada de domínio, testável) + alertas por
 * data e por quilometragem para a próxima manutenção.
 */
import { z } from "zod";
import { paraDecimal, paraInteiro, paraData, textoOpcional } from "@/shared/parse";

export const manutencaoSchema = z.object({
  cavaloId: z.string().min(1, "Selecione o veículo."),
  data: z.date(),
  km: z.number().int().min(0).max(9_999_999).nullable(),
  oficina: textoOpcional,
  tipoServico: textoOpcional,
  pecas: z.number().min(0).max(99_999_999).nullable(),
  maoDeObra: z.number().min(0).max(99_999_999).nullable(),
  valor: z.number().positive("Informe o valor (ou peças/mão de obra).").max(99_999_999),
  proximaData: z.date().nullable(),
  proximoKm: z.number().int().min(0).max(9_999_999).nullable(),
  observacoes: textoOpcional,
});
export type ManutencaoInput = z.infer<typeof manutencaoSchema>;

/**
 * Lê a manutenção do formulário. Se o valor total não for informado, usa a
 * soma de peças + mão de obra.
 */
export function lerManutencaoDoForm(fd: FormData) {
  const pecas = paraDecimal(fd.get("pecas"));
  const maoDeObra = paraDecimal(fd.get("maoDeObra"));
  const valorInformado = paraDecimal(fd.get("valor"));
  const valor = valorInformado ?? (pecas ?? 0) + (maoDeObra ?? 0);

  return {
    cavaloId: String(fd.get("cavaloId") ?? "").trim(),
    data: paraData(fd.get("data")) ?? new Date(),
    km: paraInteiro(fd.get("km")),
    oficina: fd.get("oficina"),
    tipoServico: fd.get("tipoServico"),
    pecas,
    maoDeObra,
    valor,
    proximaData: paraData(fd.get("proximaData")),
    proximoKm: paraInteiro(fd.get("proximoKm")),
    observacoes: fd.get("observacoes"),
  };
}

export type StatusAlerta = "vencida" | "proxima" | "ok" | null;

const ORDEM: Record<Exclude<StatusAlerta, null>, number> = {
  vencida: 3,
  proxima: 2,
  ok: 1,
};

/** Alerta pela data da próxima manutenção (dias de antecedência). */
export function statusAlertaData(
  proximaData: Date | null | undefined,
  hoje: Date,
  diasAntecedencia = 30,
): StatusAlerta {
  if (!proximaData) return null;
  const dias = (proximaData.getTime() - hoje.getTime()) / 86_400_000;
  if (dias < 0) return "vencida";
  if (dias <= diasAntecedencia) return "proxima";
  return "ok";
}

/** Alerta pela quilometragem da próxima manutenção (margem em km). */
export function statusAlertaKm(
  proximoKm: number | null | undefined,
  kmAtual: number | null | undefined,
  margem = 5000,
): StatusAlerta {
  if (proximoKm == null || kmAtual == null) return null;
  if (kmAtual >= proximoKm) return "vencida";
  if (proximoKm - kmAtual <= margem) return "proxima";
  return "ok";
}

/** Combina os alertas de data e km, devolvendo o mais urgente. */
export function statusAlertaManutencao(
  proximaData: Date | null | undefined,
  proximoKm: number | null | undefined,
  kmAtual: number | null | undefined,
  hoje: Date,
): StatusAlerta {
  const candidatos = [
    statusAlertaData(proximaData, hoje),
    statusAlertaKm(proximoKm, kmAtual),
  ].filter((s): s is Exclude<StatusAlerta, null> => s != null);
  if (candidatos.length === 0) return null;
  return candidatos.reduce((a, b) => (ORDEM[b] > ORDEM[a] ? b : a));
}
