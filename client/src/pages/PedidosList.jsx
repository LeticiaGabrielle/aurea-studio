import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, formatDate } from "../utils/format";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "PENDENTE", label: "Pendente" },
  { value: "SINAL_PAGO", label: "Sinal pago" },
  { value: "PAGO", label: "Pago" },
  { value: "FINALIZADO", label: "Finalizado" },
  { value: "CANCELADO", label: "Cancelado" },
];

const QUICK = ["PENDENTE", "SINAL_PAGO", "PAGO", "FINALIZADO", "CANCELADO"];

export default function PedidosList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [patching, setPatching] = useState(null);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (search.trim()) q.set("search", search.trim());
    api
      .get(`/api/pedidos?${q}`)
      .then(setItems)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [status]);

  const onSearch = (e) => {
    e.preventDefault();
    load();
  };

  const quickStatus = async (id, newStatus) => {
    setPatching(id);
    try {
      await api.patch(`/api/pedidos/${id}/status`, { status: newStatus });
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setPatching(null);
    }
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
        <p className="text-slate-600">Altere o status rapidamente ou abra o pedido para editar tudo</p>
      </div>

      <form onSubmit={onSearch} className="mb-6 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value || "all"} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          type="search"
          placeholder="Buscar cliente, telefone, produto…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="min-w-[200px] flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
        >
          Buscar
        </button>
      </form>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{err}</div>
      )}

      {loading ? (
        <p className="text-slate-500">Carregando…</p>
      ) : items.length === 0 ? (
        <p className="text-slate-500">Nenhum pedido encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Total / Pago</th>
                <th className="px-4 py-3">Lucro</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Mudar status</th>
                <th className="px-4 py-3">Atualizado</th>
                <th className="px-4 py-3 text-right">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs">{p.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{p.nomeCliente}</div>
                    <div className="text-xs text-slate-500">{p.telefone}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{formatMoney(p.valorTotal)}</div>
                    <div className="text-xs text-slate-500">Pago: {formatMoney(p.valorPago)}</div>
                  </td>
                  <td className="px-4 py-3 font-medium text-emerald-800">{formatMoney(p.lucro)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.status} type="pedido" />
                  </td>
                  <td className="px-4 py-3">
                    <select
                      disabled={p.status === "CANCELADO" || patching === p.id}
                      value={p.status}
                      onChange={(e) => quickStatus(p.id, e.target.value)}
                      className="max-w-[140px] rounded-md border border-slate-300 px-2 py-1 text-xs disabled:bg-slate-100"
                    >
                      {QUICK.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_OPTIONS.find((o) => o.value === s)?.label || s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(p.dataAtualizacao)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/pedidos/${p.id}`}
                      className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
