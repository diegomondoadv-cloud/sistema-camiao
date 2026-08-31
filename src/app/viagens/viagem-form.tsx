import { Campo, inputClass } from "@/components/campo";
import { dataParaInput } from "@/shared/parse";
import { STATUS_VIAGEM, ROTULO_STATUS } from "@/domain/viagens/validacao";

export type Opcao = { id: string; rotulo: string };

type ValoresViagem = {
  id?: string;
  cavaloId?: string;
  carretaId?: string | null;
  motoristaId?: string | null;
  clienteId?: string | null;
  embarcador?: string | null;
  destinatario?: string | null;
  origem?: string | null;
  destino?: string | null;
  dataCarregamento?: Date | null;
  previsaoEntrega?: Date | null;
  dataEntrega?: Date | null;
  tipoCarga?: string | null;
  peso?: unknown;
  numeroPaletes?: number | null;
  valorBrutoFrete?: unknown;
  adiantamento?: unknown;
  comissaoTransportadora?: unknown;
  percentualImposto?: unknown;
  pedagioIncluso?: boolean;
  kmInicial?: number | null;
  kmFinal?: number | null;
  kmCarregado?: number | null;
  kmVazio?: number | null;
  status?: string;
  numeroCte?: string | null;
  numeroMdfe?: string | null;
  observacoes?: string | null;
};

function txt(v: unknown): string {
  return v == null ? "" : String(v);
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-2 text-sm font-semibold text-slate-700">{titulo}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

export function ViagemForm({
  action,
  opcoes,
  viagem,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  opcoes: {
    cavalos: Opcao[];
    carretas: Opcao[];
    motoristas: Opcao[];
    clientes: Opcao[];
  };
  viagem?: ValoresViagem | null;
  submitLabel: string;
}) {
  const v = viagem ?? {};

  return (
    <form action={action} className="flex flex-col gap-6">
      {v.id && <input type="hidden" name="id" value={v.id} />}

      <Secao titulo="Identificação e rota">
        <Campo id="cavaloId" label="Caminhão (cavalo) *">
          <select id="cavaloId" name="cavaloId" required defaultValue={v.cavaloId ?? ""} className={inputClass}>
            <option value="">— selecione —</option>
            {opcoes.cavalos.map((o) => (
              <option key={o.id} value={o.id}>{o.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo id="carretaId" label="Carreta">
          <select id="carretaId" name="carretaId" defaultValue={v.carretaId ?? ""} className={inputClass}>
            <option value="">— nenhuma —</option>
            {opcoes.carretas.map((o) => (
              <option key={o.id} value={o.id}>{o.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo id="motoristaId" label="Motorista">
          <select id="motoristaId" name="motoristaId" defaultValue={v.motoristaId ?? ""} className={inputClass}>
            <option value="">— nenhum —</option>
            {opcoes.motoristas.map((o) => (
              <option key={o.id} value={o.id}>{o.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo id="clienteId" label="Cliente">
          <select id="clienteId" name="clienteId" defaultValue={v.clienteId ?? ""} className={inputClass}>
            <option value="">— nenhum —</option>
            {opcoes.clientes.map((o) => (
              <option key={o.id} value={o.id}>{o.rotulo}</option>
            ))}
          </select>
        </Campo>
        <Campo id="origem" label="Origem">
          <input id="origem" name="origem" defaultValue={txt(v.origem)} placeholder="São Paulo/SP" className={inputClass} />
        </Campo>
        <Campo id="destino" label="Destino">
          <input id="destino" name="destino" defaultValue={txt(v.destino)} placeholder="Curitiba/PR" className={inputClass} />
        </Campo>
        <Campo id="embarcador" label="Embarcador">
          <input id="embarcador" name="embarcador" defaultValue={txt(v.embarcador)} className={inputClass} />
        </Campo>
        <Campo id="destinatario" label="Destinatário">
          <input id="destinatario" name="destinatario" defaultValue={txt(v.destinatario)} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Datas">
        <Campo id="dataCarregamento" label="Carregamento">
          <input id="dataCarregamento" name="dataCarregamento" type="date" defaultValue={dataParaInput(v.dataCarregamento)} className={inputClass} />
        </Campo>
        <Campo id="previsaoEntrega" label="Previsão de entrega">
          <input id="previsaoEntrega" name="previsaoEntrega" type="date" defaultValue={dataParaInput(v.previsaoEntrega)} className={inputClass} />
        </Campo>
        <Campo id="dataEntrega" label="Entrega">
          <input id="dataEntrega" name="dataEntrega" type="date" defaultValue={dataParaInput(v.dataEntrega)} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Carga">
        <Campo id="tipoCarga" label="Tipo de carga">
          <input id="tipoCarga" name="tipoCarga" defaultValue={txt(v.tipoCarga)} className={inputClass} />
        </Campo>
        <Campo id="peso" label="Peso (kg)" dica="Ex.: 28000">
          <input id="peso" name="peso" inputMode="decimal" defaultValue={txt(v.peso)} className={inputClass} />
        </Campo>
        <Campo id="numeroPaletes" label="Nº de paletes">
          <input id="numeroPaletes" name="numeroPaletes" inputMode="numeric" defaultValue={txt(v.numeroPaletes)} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Valores (R$)">
        <Campo id="valorBrutoFrete" label="Valor bruto do frete" dica="Ex.: 5.000,00">
          <input id="valorBrutoFrete" name="valorBrutoFrete" inputMode="decimal" defaultValue={txt(v.valorBrutoFrete)} placeholder="0,00" className={inputClass} />
        </Campo>
        <Campo id="adiantamento" label="Adiantamento" dica="Reduz o saldo a receber">
          <input id="adiantamento" name="adiantamento" inputMode="decimal" defaultValue={txt(v.adiantamento)} placeholder="0,00" className={inputClass} />
        </Campo>
        <Campo id="comissaoTransportadora" label="Comissão da transportadora">
          <input id="comissaoTransportadora" name="comissaoTransportadora" inputMode="decimal" defaultValue={txt(v.comissaoTransportadora)} placeholder="0,00" className={inputClass} />
        </Campo>
        <Campo id="percentualImposto" label="Imposto sobre o frete (%)" dica="Padrão 2,8% — ajuste se necessário">
          <input id="percentualImposto" name="percentualImposto" inputMode="decimal" defaultValue={v.percentualImposto != null ? txt(v.percentualImposto) : "2,8"} placeholder="2,8" className={inputClass} />
        </Campo>
        <Campo id="pedagioIncluso" label="Pedágio incluso no frete?">
          <select id="pedagioIncluso" name="pedagioIncluso" defaultValue={v.pedagioIncluso === false ? "nao" : "sim"} className={inputClass}>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
        </Campo>
      </Secao>

      <Secao titulo="Quilometragem">
        <Campo id="kmInicial" label="KM inicial">
          <input id="kmInicial" name="kmInicial" inputMode="numeric" defaultValue={txt(v.kmInicial)} className={inputClass} />
        </Campo>
        <Campo id="kmFinal" label="KM final">
          <input id="kmFinal" name="kmFinal" inputMode="numeric" defaultValue={txt(v.kmFinal)} className={inputClass} />
        </Campo>
        <Campo id="kmCarregado" label="KM carregado">
          <input id="kmCarregado" name="kmCarregado" inputMode="numeric" defaultValue={txt(v.kmCarregado)} className={inputClass} />
        </Campo>
        <Campo id="kmVazio" label="KM vazio">
          <input id="kmVazio" name="kmVazio" inputMode="numeric" defaultValue={txt(v.kmVazio)} className={inputClass} />
        </Campo>
      </Secao>

      <Secao titulo="Documentos e status">
        <Campo id="status" label="Status *">
          <select id="status" name="status" required defaultValue={v.status ?? "planejada"} className={inputClass}>
            {STATUS_VIAGEM.map((s) => (
              <option key={s} value={s}>{ROTULO_STATUS[s]}</option>
            ))}
          </select>
        </Campo>
        <Campo id="numeroCte" label="Nº CT-e">
          <input id="numeroCte" name="numeroCte" defaultValue={txt(v.numeroCte)} className={inputClass} />
        </Campo>
        <Campo id="numeroMdfe" label="Nº MDF-e">
          <input id="numeroMdfe" name="numeroMdfe" defaultValue={txt(v.numeroMdfe)} className={inputClass} />
        </Campo>
        <div className="sm:col-span-2 lg:col-span-3">
          <Campo id="observacoes" label="Observações">
            <textarea id="observacoes" name="observacoes" rows={2} defaultValue={txt(v.observacoes)} className={inputClass} />
          </Campo>
        </div>
      </Secao>

      <div>
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
