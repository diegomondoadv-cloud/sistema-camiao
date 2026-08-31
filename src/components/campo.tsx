/**
 * Campo de formulário reutilizável: rótulo + conteúdo + dica opcional.
 * Componente de apresentação puro (sem estado).
 */
export const inputClass =
  "rounded-lg border border-slate-300 px-3 py-2 text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

export function Campo({
  id,
  label,
  children,
  dica,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
  dica?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {dica && <span className="text-xs text-slate-400">{dica}</span>}
    </div>
  );
}
