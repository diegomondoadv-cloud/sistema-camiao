import { Campo, inputClass } from "@/components/campo";
import { dataParaInput } from "@/shared/parse";
import {
  CATEGORIAS_CUSTO_FIXO,
  ROTULO_CATEGORIA_CUSTO,
  PERIODICIDADES,
  ROTULO_PERIODICIDADE,
} from "@/domain/custos-fixos/validacao";

export type OpcaoCavalo = { id: string; rotulo: string };

type ValoresCusto = {
  id?: string;
  escopo?: string;
  cavaloId?: string | null;
  categoria?: string;
  valor?: unknown;
  periodicidade?: string;
  vigenciaInicio?: Date | null;
  vigenciaFim?: Date | null;
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

export function CustoFixoForm({
  action,
  cavalos,
  custo,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  cavalos: OpcaoCavalo[];
  custo?: ValoresCusto | null;
  submitLabel: string;
}) {
  const c = custo ?? {};
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {c.id && <input type="hidden" name="id" value={c.id} />}

      <Campo id="escopo" label="Escopo *" dica="Empresa ou por veículo">
        <select id="escopo" name="escopo" required defaultValue={c.escopo ?? "empresa"} className={inputClass}>
          <option value="empresa">Empresa (geral)</option>
          <option value="veiculo">Por veículo</option>
        </select>
      </Campo>

      <Campo id="cavaloId" label="Veículo" dica="Só para custo por veículo">
        <select id="cavaloId" name="cavaloId" defaultValue={c.cavaloId ?? ""} className={inputClass}>
          <option value="">— nenhum —</option>
          {cavalos.map((o) => (
            <option key={o.id} value={o.id}>{o.rotulo}</option>
          ))}
        </select>
      </Campo>

      <Campo id="categoria" label="Categoria *">
        <select id="categoria" name="categoria" required defaultValue={c.categoria ?? "financiamento"} className={inputClass}>
          {CATEGORIAS_CUSTO_FIXO.map((k) => (
            <option key={k} value={k}>{ROTULO_CATEGORIA_CUSTO[k]}</option>
          ))}
        </select>
      </Campo>

      <Campo id="valor" label="Valor (R$) *" dica="Ex.: 8.500,00">
        <input id="valor" name="valor" inputMode="decimal" required defaultValue={txt(c.valor)} placeholder="0,00" className={inputClass} />
      </Campo>

      <Campo id="periodicidade" label="Periodicidade *">
        <select id="periodicidade" name="periodicidade" required defaultValue={c.periodicidade ?? "mensal"} className={inputClass}>
          {PERIODICIDADES.map((p) => (
            <option key={p} value={p}>{ROTULO_PERIODICIDADE[p]}</option>
          ))}
        </select>
      </Campo>

      <Campo id="vigenciaInicio" label="Vigência — início">
        <input id="vigenciaInicio" name="vigenciaInicio" type="date" defaultValue={dataParaInput(c.vigenciaInicio)} className={inputClass} />
      </Campo>

      <Campo id="vigenciaFim" label="Vigência — fim">
        <input id="vigenciaFim" name="vigenciaFim" type="date" defaultValue={dataParaInput(c.vigenciaFim)} className={inputClass} />
      </Campo>

      <div className="sm:col-span-2 lg:col-span-3">
        <button
          type="submit"
          className="rounded-lg bg-emerald-600 px-4 py-2 font-semibold text-white transition hover:bg-emerald-700"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
