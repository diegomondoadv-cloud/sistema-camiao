"use client";

/** Botão que abre a impressão do navegador (permite "Salvar como PDF"). */
export function BotaoImprimir() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 print:hidden"
    >
      Imprimir / Salvar PDF
    </button>
  );
}
