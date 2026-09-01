import { calcOrcamento, formatMoney } from "../utils/format";

export default function OrcamentoItemFields({
  index,
  item,
  onChange,
  onRemove,
  canRemove,
  disabled,
}) {
  const set = (key, value) => onChange(index, { ...item, [key]: value });
  const { valorTotal } = calcOrcamento(item.quantidade, item.valorUnitario);

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-800">Produto {index + 1}</h3>
        {canRemove ? (
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(index)}
            className="text-xs font-medium text-red-700 hover:text-red-800 disabled:opacity-50"
          >
            Remover
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Produto *</span>
          <input
            required
            disabled={disabled}
            value={item.produto}
            onChange={(e) => set("produto", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Quantidade *</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            disabled={disabled}
            value={item.quantidade}
            onChange={(e) => set("quantidade", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Valor unitário (R$) *</span>
          <input
            type="number"
            min={0.01}
            step={0.01}
            disabled={disabled}
            value={item.valorUnitario}
            onChange={(e) => set("valorUnitario", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <span className="text-slate-600">Subtotal deste item: </span>
          <strong>{formatMoney(valorTotal)}</strong>
        </div>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Modelo</span>
          <input
            disabled={disabled}
            value={item.modelo}
            onChange={(e) => set("modelo", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Cores</span>
          <input
            disabled={disabled}
            value={item.cores}
            onChange={(e) => set("cores", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Personalização</span>
          <textarea
            disabled={disabled}
            rows={2}
            value={item.personalizacao}
            onChange={(e) => set("personalizacao", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Configuração</span>
          <textarea
            disabled={disabled}
            rows={2}
            value={item.configuracao}
            onChange={(e) => set("configuracao", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Prazo</span>
          <input
            disabled={disabled}
            value={item.prazo}
            onChange={(e) => set("prazo", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </label>
      </div>
    </div>
  );
}
