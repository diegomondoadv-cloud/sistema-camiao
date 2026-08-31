"use client";

import { useState } from "react";
import { Campo, inputClass } from "@/components/campo";

/** Interpreta número em formato brasileiro (para o cálculo ao vivo). */
function paraNumero(v: string): number | null {
  let t = v.replace(/[^\d.,-]/g, "").trim();
  if (t === "") return null;
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}
function paraInt(v: string): number | null {
  const t = v.replace(/\D/g, "");
  if (t === "") return null;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : null;
}

export function AbastecimentoViagemForm({
  action,
  viagemId,
  ultimoKm,
  dataPadrao,
}: {
  action: (formData: FormData) => Promise<void>;
  viagemId: string;
  ultimoKm: number | null;
  dataPadrao: string;
}) {
  const [km, setKm] = useState("");
  const [litros, setLitros] = useState("");

  const kmNum = paraInt(km);
  const litrosNum = paraNumero(litros);
  const kmRodados =
    ultimoKm != null && kmNum != null && kmNum > ultimoKm ? kmNum - ultimoKm : null;
  const media =
    kmRodados != null && litrosNum != null && litrosNum > 0
      ? kmRodados / litrosNum
      : null;

  return (
    <div>
      <div className="mb-3 rounded-lg bg-slate-50 p-3 text-sm">
        <span className="text-slate-600">
          Último km registrado:{" "}
          <span className="font-semibold text-slate-800">
            {ultimoKm != null ? ultimoKm.toLocaleString("pt-BR") : "—"}
          </span>
        </span>
        {media != null ? (
          <span className="ml-4 rounded-full bg-emerald-100 px-3 py-1 font-semibold text-emerald-800">
            Média desta abastecida: {media.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/l
            <span className="ml-1 font-normal text-emerald-700">
              ({kmRodados?.toLocaleString("pt-BR")} km ÷ {litrosNum?.toLocaleString("pt-BR")} L)
            </span>
          </span>
        ) : (
          <span className="ml-4 text-slate-400">
            Informe o km atual (maior que o último) e os litros para ver a média.
          </span>
        )}
      </div>

      <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="viagemId" value={viagemId} />
        <Campo id="a-km" label="Km atual" dica="Hodômetro no abastecimento">
          <input
            id="a-km"
            name="km"
            inputMode="numeric"
            value={km}
            onChange={(e) => setKm(e.target.value)}
            placeholder="480000"
            className={inputClass}
          />
        </Campo>
        <Campo id="a-litros" label="Litros *" dica="Ex.: 250,5">
          <input
            id="a-litros"
            name="litros"
            inputMode="decimal"
            required
            value={litros}
            onChange={(e) => setLitros(e.target.value)}
            placeholder="0,000"
            className={inputClass}
          />
        </Campo>
        <Campo id="a-valorLitro" label="Valor por litro (R$) *" dica="Ex.: 6,29">
          <input id="a-valorLitro" name="valorLitro" inputMode="decimal" required placeholder="0,00" className={inputClass} />
        </Campo>
        <Campo id="a-data" label="Data">
          <input id="a-data" name="data" type="date" defaultValue={dataPadrao} className={inputClass} />
        </Campo>
        <Campo id="a-posto" label="Posto">
          <input id="a-posto" name="posto" placeholder="Posto Ipiranga" className={inputClass} />
        </Campo>
        <div className="flex items-center gap-2 pt-6">
          <input id="a-tanqueCheio" name="tanqueCheio" type="checkbox" value="true" defaultChecked className="h-4 w-4 rounded border-slate-300" />
          <label htmlFor="a-tanqueCheio" className="text-sm font-medium text-slate-700">Tanque cheio</label>
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700">
            Lançar abastecimento
          </button>
        </div>
      </form>
    </div>
  );
}
