/**
 * Página inicial (protegida pelo middleware). Para admin/gestor, mostra o
 * Dashboard Executivo. Motoristas veem uma tela simples.
 */
import Link from "next/link";
import { auth } from "@/auth";
import { DashboardExecutivo } from "./dashboard-executivo";
import { AlertasManutencaoBanner } from "./manutencoes/alertas-banner";

const rotuloPapel: Record<string, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  motorista: "Motorista",
};

export default async function Home() {
  const sessao = await auth();
  const usuario = sessao?.user;
  const gestao = usuario?.papel === "admin" || usuario?.papel === "gestor";

  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Sistema Transportadora</h1>
            {usuario && (
              <p className="mt-1 text-sm text-slate-600">
                Olá, <span className="font-semibold">{usuario.name}</span> ·{" "}
                {rotuloPapel[usuario.papel] ?? usuario.papel}
              </p>
            )}
          </div>
          <a
            href="/sair"
            className="inline-block rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Sair
          </a>
        </div>

        {/* Navegação */}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          {gestao && (
            <>
              <Link href="/painel" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                📊 Painel mensal
              </Link>
              <Link href="/viagens" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                🚦 Viagens
              </Link>
              <Link href="/veiculos" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Veículos
              </Link>
              <Link href="/motoristas" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Motoristas
              </Link>
              <Link href="/clientes" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Clientes
              </Link>
              <Link href="/fornecedores" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Fornecedores
              </Link>
              <Link href="/abastecimentos" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Abastecimentos
              </Link>
              <Link href="/contas-receber" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Contas a receber
              </Link>
              <Link href="/contas-pagar" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Contas a pagar
              </Link>
              <Link href="/custos-fixos" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Custos fixos
              </Link>
              <Link href="/manutencoes" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Manutenções
              </Link>
              <Link href="/pneus" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Pneus
              </Link>
              <Link href="/comissoes" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Comissões
              </Link>
              <Link href="/vales" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
                Vales do motorista
              </Link>
              <Link href="/calendario" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                📅 Calendário
              </Link>
              <Link href="/metas" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                🎯 Metas
              </Link>
              <Link href="/insights" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                💡 Insights
              </Link>
              <Link href="/relatorios" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                📄 Relatórios
              </Link>
              <Link href="/relatorios/por-caminhao" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                🚛 Resultado por caminhão
              </Link>
              <Link href="/relatorios/categorias" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                🧾 Receitas e despesas por categoria
              </Link>
              <Link href="/relatorios/caixa" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                💵 Extrato de caixa
              </Link>
              <Link href="/indicadores-clientes" className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-900">
                📈 Indicadores por cliente
              </Link>
            </>
          )}
          {usuario?.papel === "admin" && (
            <Link href="/usuarios" className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800">
              Gerir usuários
            </Link>
          )}
        </div>
      </div>

      {gestao && <AlertasManutencaoBanner />}

      {gestao ? (
        <DashboardExecutivo />
      ) : (
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 text-slate-600 shadow-sm">
          <p>Bem-vindo. Suas viagens e lançamentos aparecerão aqui.</p>
        </div>
      )}

      <p className="mt-6 text-center text-xs text-slate-400">
        Ambiente de desenvolvimento local · pt-BR · R$
      </p>
    </main>
  );
}
