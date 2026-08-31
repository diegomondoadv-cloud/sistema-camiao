import { Campo, inputClass } from "@/components/campo";
import { dataParaInput } from "@/shared/parse";
import { SITUACOES_PNEU, ROTULO_SITUACAO_PNEU } from "@/domain/pneus/validacao";

export type OpcaoCavalo = { id: string; rotulo: string };

type ValoresPneu = {
  id?: string;
  numeroIdentificacao?: string;
  marca?: string | null;
  modelo?: string | null;
  medida?: string | null;
  dataCompra?: Date | null;
  valor?: unknown;
  cavaloId?: string | null;
  posicao?: string | null;
  kmInstalacao?: number | null;
  kmAtual?: number | null;
  situacao?: string;
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export function PneuForm({
  action,
  cavalos,
  pneu,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  cavalos: OpcaoCavalo[];
  pneu?: ValoresPneu | null;
  submitLabel: string;
}) {
  const p = pneu ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {p.id && <input type="hidden" name="id" value={p.id} />}
      <Campo id="numeroIdentificacao" label="Nº de identificação *">
        <input id="numeroIdentificacao" name="numeroIdentificacao" required defaultValue={txt(p.numeroIdentificacao)} placeholder="PN-001" className={inputClass} />
      </Campo>
      <Campo id="situacao" label="Situação *">
        <select id="situacao" name="situacao" required defaultValue={p.situacao ?? "estoque"} className={inputClass}>
          {SITUACOES_PNEU.map((s) => (
            <option key={s} value={s}>{ROTULO_SITUACAO_PNEU[s]}</option>
          ))}
        </select>
      </Campo>
      <Campo id="cavaloId" label="Veículo">
        <select id="cavaloId" name="cavaloId" defaultValue={p.cavaloId ?? ""} className={inputClass}>
          <option value="">— nenhum (estoque) —</option>
          {cavalos.map((c) => (
            <option key={c.id} value={c.id}>{c.rotulo}</option>
          ))}
        </select>
      </Campo>
      <Campo id="marca" label="Marca">
        <input id="marca" name="marca" defaultValue={txt(p.marca)} placeholder="Michelin" className={inputClass} />
      </Campo>
      <Campo id="modelo" label="Modelo">
        <input id="modelo" name="modelo" defaultValue={txt(p.modelo)} placeholder="X Multi Z" className={inputClass} />
      </Campo>
      <Campo id="medida" label="Medida">
        <input id="medida" name="medida" defaultValue={txt(p.medida)} placeholder="295/80 R22.5" className={inputClass} />
      </Campo>
      <Campo id="posicao" label="Posição">
        <input id="posicao" name="posicao" defaultValue={txt(p.posicao)} placeholder="Eixo 2 direito / estepe" className={inputClass} />
      </Campo>
      <Campo id="valor" label="Valor (R$)">
        <input id="valor" name="valor" inputMode="decimal" defaultValue={txt(p.valor)} placeholder="2.500,00" className={inputClass} />
      </Campo>
      <Campo id="dataCompra" label="Data da compra">
        <input id="dataCompra" name="dataCompra" type="date" defaultValue={dataParaInput(p.dataCompra)} className={inputClass} />
      </Campo>
      <Campo id="kmInstalacao" label="Km de instalação">
        <input id="kmInstalacao" name="kmInstalacao" inputMode="numeric" defaultValue={p.kmInstalacao != null ? String(p.kmInstalacao) : ""} placeholder="400000" className={inputClass} />
      </Campo>
      <Campo id="kmAtual" label="Km atual">
        <input id="kmAtual" name="kmAtual" inputMode="numeric" defaultValue={p.kmAtual != null ? String(p.kmAtual) : ""} placeholder="450000" className={inputClass} />
      </Campo>
      <div className="sm:col-span-2 lg:col-span-3">
        <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
