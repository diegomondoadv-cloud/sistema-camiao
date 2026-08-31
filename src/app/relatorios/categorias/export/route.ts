/**
 * Exportação CSV do relatório de receitas e despesas por categoria.
 * Formato pt-BR: separador ";", decimais com vírgula, UTF-8 com BOM.
 */
import { auth } from "@/auth";
import { centavosParaReais, type Centavos } from "@/shared/dinheiro";
import {
  gerarRelatorioCategorias,
  type RegimeRelatorio,
} from "@/application/relatorios/receitas-despesas-categoria";

export const runtime = "nodejs";

const MESES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
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
  const agora = new Date();
  const mes = Math.min(12, Math.max(1, Number(url.searchParams.get("mes")) || agora.getUTCMonth() + 1));
  const ano = Number(url.searchParams.get("ano")) || agora.getUTCFullYear();
  const regime: RegimeRelatorio = url.searchParams.get("regime") === "caixa" ? "caixa" : "competencia";
  const ehCaixa = regime === "caixa";

  const rel = await gerarRelatorioCategorias(mes, ano, regime);

  const linhas: string[] = [];
  linhas.push(
    `RECEITAS E DESPESAS POR CATEGORIA - ${MESES[mes - 1]}/${ano} (${ehCaixa ? "caixa" : "competência"})`,
  );
  linhas.push("");
  linhas.push(linha([ehCaixa ? "ENTRADAS" : "RECEITAS", ""]));
  linhas.push(linha([ehCaixa ? "Entradas (recebimentos + adiantamentos)" : "Fretes", num(rel.receitaBrutaC)]));
  if (!ehCaixa) linhas.push(linha(["Receita líquida (− imposto)", num(rel.receitaLiquidaC)]));
  linhas.push("");
  linhas.push(linha([ehCaixa ? "SAÍDAS POR CATEGORIA" : "DESPESAS POR CATEGORIA", "Grupo", "Valor"]));
  for (const l of rel.despesas) {
    linhas.push(linha([l.rotulo, l.grupo, num(l.valorC)]));
  }
  linhas.push(linha([ehCaixa ? "TOTAL SAÍDAS" : "TOTAL DESPESAS", "", num(rel.totalDespesasC)]));
  linhas.push("");
  linhas.push(linha([ehCaixa ? "RESULTADO DE CAIXA" : "RESULTADO DO MÊS", num(rel.resultadoC)]));

  const csv = "﻿" + linhas.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="receitas-despesas-categoria-${ano}-${String(mes).padStart(2, "0")}.csv"`,
    },
  });
}
