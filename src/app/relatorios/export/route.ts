/**
 * Exportação do relatório de resultado em CSV (planilha).
 * Formato pt-BR: separador ";", decimais com vírgula, UTF-8 com BOM
 * (abre corretamente no Excel brasileiro).
 */
import { auth } from "@/auth";
import { paraData } from "@/shared/parse";
import { centavosParaReais, type Centavos } from "@/shared/dinheiro";
import {
  gerarRelatorioResultado,
  type FiltroRelatorio,
} from "@/application/relatorios/resultado";

export const runtime = "nodejs";

function num(c: Centavos): string {
  // 1000000 -> "10000,00" (sem separador de milhar, para não quebrar o CSV)
  return centavosParaReais(c).toFixed(2).replace(".", ",");
}

function campo(v: string): string {
  // Escapa aspas e envolve em aspas se necessário.
  if (/[";\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function linha(campos: string[]): string {
  return campos.map(campo).join(";");
}

function dataBR(d: Date | null): string {
  if (!d) return "";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export async function GET(request: Request) {
  const sessao = await auth();
  const papel = sessao?.user?.papel;
  if (papel !== "admin" && papel !== "gestor") {
    return new Response("Não autorizado.", { status: 403 });
  }

  const url = new URL(request.url);
  const filtro: FiltroRelatorio = {
    inicio: paraData(url.searchParams.get("inicio")),
    fim: paraData(url.searchParams.get("fim")),
    cavaloId: url.searchParams.get("cavaloId") || null,
    clienteId: url.searchParams.get("clienteId") || null,
  };

  const rel = await gerarRelatorioResultado(filtro);

  const linhas: string[] = [];
  linhas.push("RESULTADO POR VIAGEM");
  linhas.push(
    linha([
      "Data",
      "Rota",
      "Caminhão",
      "Cliente",
      "Frete bruto",
      "Despesas",
      "Comissão transp.",
      "Comissão motorista",
      "Imposto",
      "Resultado",
    ]),
  );
  for (const v of rel.viagens) {
    linhas.push(
      linha([
        dataBR(v.data),
        v.rota,
        v.caminhao,
        v.cliente,
        num(v.brutoC),
        num(v.despesasC),
        num(v.comissaoTranspC),
        num(v.comissaoMotoristaC),
        num(v.impostoC),
        num(v.resultadoC),
      ]),
    );
  }

  linhas.push("");
  linhas.push("RESULTADO POR CAMINHÃO");
  linhas.push(
    linha(["Caminhão", "Nº viagens", "Faturamento", "Custos", "Resultado"]),
  );
  for (const c of rel.porCaminhao) {
    linhas.push(
      linha([
        c.placa,
        String(c.nViagens),
        num(c.faturamentoC),
        num(c.custosC),
        num(c.resultadoC),
      ]),
    );
  }
  linhas.push(
    linha([
      "TOTAL",
      String(rel.viagens.length),
      num(rel.totais.faturamentoC),
      num(rel.totais.custosC),
      num(rel.totais.resultadoC),
    ]),
  );

  const csv = "﻿" + linhas.join("\r\n"); // BOM + CRLF

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="relatorio-resultado.csv"',
    },
  });
}
