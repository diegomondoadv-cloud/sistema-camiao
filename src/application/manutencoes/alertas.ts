/**
 * Alertas de manutenção (camada de aplicação).
 *
 * Lista as manutenções que estão VENCIDAS ou PRÓXIMAS (por data ou por km),
 * reaproveitando a regra pura e testada do domínio (statusAlertaManutencao).
 *
 * Para um aviso confiável:
 *  - considera apenas veículos que NÃO estão vendidos;
 *  - de cada combinação (veículo + tipo de serviço), usa somente a manutenção
 *    MAIS RECENTE — assim, ao registrar a próxima troca, o alerta antigo some
 *    (não fica avisando de um serviço que já foi feito).
 */
import { prisma } from "@/infrastructure/prisma";
import { statusAlertaManutencao } from "@/domain/manutencoes/validacao";

export interface AlertaManutencao {
  id: string;
  cavaloId: string;
  placa: string;
  tipoServico: string | null;
  proximaData: Date | null;
  proximoKm: number | null;
  kmAtual: number | null;
  status: "vencida" | "proxima";
}

export interface ResumoAlertasManutencao {
  alertas: AlertaManutencao[];
  vencidas: number;
  proximas: number;
}

export async function listarAlertasManutencao(
  hoje: Date = new Date(),
): Promise<ResumoAlertasManutencao> {
  const manutencoes = await prisma.manutencao.findMany({
    where: {
      cavalo: { situacao: { not: "vendido" } },
      OR: [{ proximaData: { not: null } }, { proximoKm: { not: null } }],
    },
    orderBy: { data: "desc" }, // mais recente primeiro
    include: { cavalo: { select: { placa: true, kmAtual: true, situacao: true } } },
  });

  // Mantém apenas a manutenção mais recente por (veículo + tipo de serviço).
  const maisRecentePorChave = new Map<string, (typeof manutencoes)[number]>();
  for (const m of manutencoes) {
    const chave = `${m.cavaloId}::${(m.tipoServico ?? "").trim().toLowerCase()}`;
    if (!maisRecentePorChave.has(chave)) {
      maisRecentePorChave.set(chave, m); // já vem ordenado por data desc
    }
  }

  const alertas: AlertaManutencao[] = [];
  for (const m of maisRecentePorChave.values()) {
    const status = statusAlertaManutencao(
      m.proximaData,
      m.proximoKm,
      m.cavalo.kmAtual,
      hoje,
    );
    if (status === "vencida" || status === "proxima") {
      alertas.push({
        id: m.id,
        cavaloId: m.cavaloId,
        placa: m.cavalo.placa,
        tipoServico: m.tipoServico,
        proximaData: m.proximaData,
        proximoKm: m.proximoKm,
        kmAtual: m.cavalo.kmAtual,
        status,
      });
    }
  }

  // Vencidas primeiro; depois por data da próxima (mais cedo primeiro).
  const ordem = { vencida: 0, proxima: 1 };
  alertas.sort(
    (a, b) =>
      ordem[a.status] - ordem[b.status] ||
      (a.proximaData?.getTime() ?? Number.MAX_SAFE_INTEGER) -
        (b.proximaData?.getTime() ?? Number.MAX_SAFE_INTEGER),
  );

  return {
    alertas,
    vencidas: alertas.filter((a) => a.status === "vencida").length,
    proximas: alertas.filter((a) => a.status === "proxima").length,
  };
}
