/**
 * Exportação do relatório "Resultado por caminhão" em CSV (planilha).
 * Formato pt-BR: separador ";", decimais com vírgula, UTF-8 com BOM
 * (abre corretamente no Excel brasileiro).
 */
import { auth } from "@/auth";
import { centavosParaReais, type Centavos } from "@/shared/dinheiro";
import { gerarResultadoMensalPorCaminhao } from "@/application/relatorios/resultado-mensal-caminhao";

export const runtime = "nodejs";

const MESES_ABREV = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

function num(c: Centavos): string {
  return centavosParaReais(c).toFixed(2).replace(".", ",");
}

function campo(v: string): string {
  if (/[";\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function linha(campos: string[]): string {
  return campos.map(campo).join(";");
}

export async function GET(request: Request) {
  const sessao = await auth();
  const papel = sessao?.user?.papel;
  if (papel !== "admin" && papel !== "gestor") {
    return new Response("Não autorizado.", { status: 403 });
  }

  const url = new URL(request.url);
  const ano = Number(url.searchParams.get("ano")) || new Date().getUTCFullYear();
  const cavaloId = url.searchParams.get("cavaloId") || null;

  const dados = await gerarResultadoMensalPorCaminhao({ ano, cavaloId });

  const cabecalho = [
    "Caminhão",
    "Mês",
    "Nº viagens",
    "Faturamento",
    "Imposto",
    "Comissão motorista",
    "Comissão transp.",
    "Combustível",
    "Outras despesas",
    "Manutenção",
    "Rateio custo fixo",
    "Resultado sem fixo",
    "Resultado líquido",
  ];

  const linhas: string[] = [];
  linhas.push(`RESULTADO POR CAMINHÃO - ${ano}`);
  linhas.push(linha(cabecalho));

  for (const cav of dados) {
    for (const m of cav.meses) {
      linhas.push(
        linha([
          cav.placa,
          MESES_ABREV[m.mes - 1] ?? String(m.mes),
          String(m.nViagens),
          num(m.faturamentoC),
          num(m.impostoC),
          num(m.comissaoMotoristaC),
          num(m.comissaoTranspC),
          num(m.combustivelC),
          num(m.outrasDespesasC),
          num(m.manutencaoC),
          num(m.rateioFixoC),
          num(m.resultadoSemFixoC),
          num(m.resultadoLiquidoC),
        ]),
      );
    }
    // Linha de total do caminhão.
    linhas.push(
      linha([
        cav.placa,
        `TOTAL ${ano}`,
        String(cav.total.nViagens),
        num(cav.total.faturamentoC),
        num(cav.total.impostoC),
        num(cav.total.comissaoMotoristaC),
        num(cav.total.comissaoTranspC),
        num(cav.total.combustivelC),
        num(cav.total.outrasDespesasC),
        num(cav.total.manutencaoC),
        num(cav.total.rateioFixoC),
        num(cav.total.resultadoSemFixoC),
        num(cav.total.resultadoLiquidoC),
      ]),
    );
    linhas.push("");
  }

  const csv = "﻿" + linhas.join("\r\n"); // BOM + CRLF

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="resultado-por-caminhao-${ano}.csv"`,
    },
  });
}
