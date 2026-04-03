import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney } from "../utils/format";

export default function PedidoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get(`/api/pedidos/${id}`)
      .then(setForm)
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const lucroPreview = useMemo(() => {
    if (!form) return 0;
    const vt = Number(form.valorTotal) || 0;
    const c = Number(form.custo) || 0;
    return Math.round((vt - c) * 100) / 100;
  }, [form]);

  const valorSinalPreview = useMemo(() => {
    if (!form) return 0;
    const vt = Number(form.valorTotal) || 0;
    return Math.round(vt * 0.5 * 100) / 100;
  }, [form]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async (e) => {
    e.preventDefault();
    if (!form || form.status === "CANCELADO") return;
    if (Number(form.quantidade) <= 0) {
      alert("Quantidade deve ser maior que zero.");
      return;
    }
    if (Number(form.valorTotal) <= 0) {
      alert("Valor total deve ser maior que zero.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await api.put(`/api/pedidos/${id}`, {
        nomeCliente: form.nomeCliente,
        telefone: form.telefone,
        produto: form.produto,
        quantidade: Number(form.quantidade),
        modelo: form.modelo,
        cores: form.cores,
        personalizacao: form.personalizacao,
        configuracao: form.configuracao,
        prazo: form.prazo,
        valorTotal: Number(form.valorTotal),
        valorPago: Number(form.valorPago) || 0,
        custo: Number(form.custo) || 0,
        status: form.status,
        tipoPagamento: form.tipoPagamento,
        chavePix: form.chavePix,
        nomeRecebedor: form.nomeRecebedor,
        tipoEntrega: form.tipoEntrega,
        observacoesEntrega: form.observacoesEntrega,
        observacoes: form.observacoes,
      });
      navigate("/pedidos");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-slate-500">Carregando…</p>;
  if (!form) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {err || "Pedido não encontrado."}
      </div>
    );
  }

  const locked = form.status === "CANCELADO";

  return (
    <div>
      <div className="mb-8">
        <Link to="/pedidos" className="text-sm text-sky-700 hover:underline">
          ← Voltar aos pedidos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Pedido {form.numero}</h1>
        <p className="text-sm text-slate-500">Orçamento origem ID: {form.orcamentoId}</p>
      </div>

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{err}</div>
      )}

      {locked && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-amber-900">
          Pedido cancelado — apenas visualização.
        </div>
      )}

      <form
        onSubmit={save}
        className="max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nome do cliente</span>
            <input
              disabled={locked}
              value={form.nomeCliente}
              onChange={(e) => set("nomeCliente", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Telefone</span>
            <input
              disabled={locked}
              value={form.telefone}
              onChange={(e) => set("telefone", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Status</span>
            <select
              disabled={locked}
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            >
              <option value="PENDENTE">Pendente</option>
              <option value="SINAL_PAGO">Sinal pago</option>
              <option value="PAGO">Pago</option>
              <option value="FINALIZADO">Finalizado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Produto</span>
            <input
              disabled={locked}
              value={form.produto}
              onChange={(e) => set("produto", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Quantidade</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              disabled={locked}
              value={form.quantidade}
              onChange={(e) => set("quantidade", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Valor total (R$)</span>
            <input
              type="number"
              min={0.01}
              step={0.01}
              disabled={locked}
              value={form.valorTotal}
              onChange={(e) => set("valorTotal", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Valor pago (R$)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              disabled={locked}
              value={form.valorPago}
              onChange={(e) => set("valorPago", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Custo (R$)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              disabled={locked}
              value={form.custo}
              onChange={(e) => set("custo", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">
            <p>
              <span className="text-slate-600">Sinal (50% do total, recalculado ao salvar): </span>
              <strong className="text-amber-800">{formatMoney(valorSinalPreview)}</strong>
            </p>
            <p>
              <span className="text-slate-600">Lucro estimado (total − custo): </span>
              <strong className="text-emerald-800">{formatMoney(lucroPreview)}</strong>
            </p>
          </div>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Modelo</span>
            <input
              disabled={locked}
              value={form.modelo}
              onChange={(e) => set("modelo", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Cores</span>
            <input
              disabled={locked}
              value={form.cores}
              onChange={(e) => set("cores", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Personalização</span>
            <textarea
              disabled={locked}
              rows={3}
              value={form.personalizacao}
              onChange={(e) => set("personalizacao", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Configuração</span>
            <textarea
              disabled={locked}
              rows={3}
              value={form.configuracao}
              onChange={(e) => set("configuracao", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Prazo</span>
            <input
              disabled={locked}
              value={form.prazo}
              onChange={(e) => set("prazo", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tipo de pagamento</span>
            <input
              disabled={locked}
              value={form.tipoPagamento}
              onChange={(e) => set("tipoPagamento", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Chave PIX</span>
            <input
              disabled={locked}
              value={form.chavePix}
              onChange={(e) => set("chavePix", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Nome do recebedor</span>
            <input
              disabled={locked}
              value={form.nomeRecebedor}
              onChange={(e) => set("nomeRecebedor", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Tipo de entrega</span>
            <input
              disabled={locked}
              value={form.tipoEntrega}
              onChange={(e) => set("tipoEntrega", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Observações de entrega</span>
            <textarea
              disabled={locked}
              rows={2}
              value={form.observacoesEntrega}
              onChange={(e) => set("observacoesEntrega", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-sm font-medium text-slate-700">Observações</span>
            <textarea
              disabled={locked}
              rows={3}
              value={form.observacoes}
              onChange={(e) => set("observacoes", e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
            />
          </label>
        </div>
        <button
          type="submit"
          disabled={saving || locked}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
      </form>
    </div>
  );
}
