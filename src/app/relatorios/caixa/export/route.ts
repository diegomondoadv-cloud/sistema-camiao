/**
 * Exportação CSV do extrato de caixa.
 * Formato pt-BR: separador ";", decimais com vírgula, UTF-8 com BOM.
 */
import { auth } from "@/auth";
import { centavosParaReais, type Centavos } from "@/shared/dinheiro";
import { paraData } from "@/shared/parse";
import { gerarFluxoDeCaixa } from "@/application/relatorios/fluxo-de-caixa";

export const runtime = "nodejs";

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

function dataBR(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(d);
}

export async function GET(request: Request) {
  const sessao = await auth();
  const papel = sessao?.user?.papel;
  if (papel !== "admin" && papel !== "gestor") {
    return new Response("Não autorizado.", { status: 403 });
  }

  const url = new URL(request.url);
  const agora = new Date();
  const inicioSp = paraData(url.searchParams.get("inicio"));
  const fimSp = paraData(url.searchParams.get("fim"));

  let ini: Date;
  let fimExcl: Date;
  if (inicioSp || fimSp) {
    ini = inicioSp ?? new Date(Date.UTC(1970, 0, 1));
    fimExcl = fimSp ? new Date(fimSp.getTime() + 24 * 60 * 60 * 1000) : new Date(Date.UTC(agora.getUTCFullYear() + 50, 0, 1));
  } else {
    const mes = Math.min(12, Math.max(1, Number(url.searchParams.get("mes")) || agora.getUTCMonth() + 1));
    const ano = Number(url.searchParams.get("ano")) || agora.getUTCFullYear();
    ini = new Date(Date.UTC(ano, mes - 1, 1));
    fimExcl = new Date(Date.UTC(ano, mes, 1));
  }

  const fluxo = await gerarFluxoDeCaixa(ini, fimExcl);

  const linhas: string[] = [];
  linhas.push("EXTRATO DE CAIXA");
  linhas.push("");
  linhas.push(linha(["Data", "Descrição", "Categoria", "Entrada", "Saída", "Saldo"]));
  linhas.push(linha(["", "Saldo inicial", "", "", "", num(fluxo.saldoInicialC)]));
  for (const l of fluxo.linhas) {
    linhas.push(
      linha([
        dataBR(l.data),
        l.descricao,
        l.categoria,
        l.valorC >= 0 ? num(l.valorC) : "",
        l.valorC < 0 ? num(-l.valorC) : "",
        num(l.saldoC),
      ]),
    );
  }
  linhas.push(linha(["", "TOTAIS", "", num(fluxo.entradasC), num(fluxo.saidasC), num(fluxo.saldoFinalC)]));

  const csv = "﻿" + linhas.join("\r\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="extrato-de-caixa.csv"',
    },
  });
}
