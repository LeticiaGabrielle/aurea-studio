import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import StatusBadge from "../components/StatusBadge";
import { formatMoney, formatDate } from "../utils/format";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "RASCUNHO", label: "Rascunho" },
  { value: "ENVIADO", label: "Enviado" },
  { value: "APROVADO", label: "Aprovado" },
  { value: "RECUSADO", label: "Recusado" },
];

export default function OrcamentosList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (status) q.set("status", status);
    if (search.trim()) q.set("search", search.trim());
    api
      .get(`/api/orcamentos?${q}`)
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

  const remove = async (id) => {
    if (!confirm("Excluir este orçamento?")) return;
    try {
      await api.delete(`/api/orcamentos/${id}`);
      load();
    } catch (e) {
      alert(e.message);
    }
  };

  const converter = async (id) => {
    setBusyId(id);
    try {
      await api.post(`/api/orcamentos/${id}/converter-pedido`);
      alert("Pedido criado com sucesso.");
      load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orçamentos</h1>
          <p className="text-slate-600">Crie, filtre e converta em pedido quando aprovado</p>
        </div>
        <Link
          to="/orcamentos/novo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo orçamento
        </Link>
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
        <p className="text-slate-500">Nenhum orçamento encontrado.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Criado</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 font-mono text-xs">{o.numero}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.nomeCliente}</div>
                    <div className="text-xs text-slate-500">{o.telefone}</div>
                  </td>
                  <td className="px-4 py-3 max-w-[180px] truncate">{o.produto}</td>
                  <td className="px-4 py-3 font-medium">{formatMoney(o.valorTotal)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(o.dataCriacao)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {o.status === "APROVADO" && (
                        <button
                          type="button"
                          disabled={busyId === o.id}
                          onClick={() => converter(o.id)}
                          className="rounded-md bg-emerald-600 px-2 py-1 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                        >
                          {busyId === o.id ? "…" : "Converter em pedido"}
                        </button>
                      )}
                      {o.status === "APROVADO" ? (
                        <span className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-400">
                          Editar
                        </span>
                      ) : (
                        <Link
                          to={`/orcamentos/${o.id}/editar`}
                          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium hover:bg-slate-50"
                        >
                          Editar
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => remove(o.id)}
                        className="rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                      >
                        Excluir
                      </button>
                    </div>
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
