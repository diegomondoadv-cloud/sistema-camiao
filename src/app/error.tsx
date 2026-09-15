"use client";

/**
 * Tela de erro amigável (App Router). Aparece no lugar do "Application error"
 * feio quando alguma página tem uma exceção no servidor — muito comum no
 * "cold start" dos planos gratuitos (o servidor/banco acabou de acordar).
 * Oferece um botão para tentar de novo.
 */
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Registra no console do servidor/navegador para diagnóstico.
    console.error("Erro ao carregar a página:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col items-center justify-center p-6 text-center">
      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-4xl">🔄</p>
        <h1 className="mt-3 text-xl font-bold text-slate-800">
          O sistema estava acordando
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          A página não carregou de primeira — geralmente é só o servidor
          &ldquo;acordando&rdquo; (leva alguns segundos no plano gratuito).
          É só tentar de novo.
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Tentar de novo
          </button>
          <button
            onClick={() => window.location.assign("/")}
            className="rounded-lg border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Ir para o início
          </button>
        </div>
      </div>
    </main>
  );
}
