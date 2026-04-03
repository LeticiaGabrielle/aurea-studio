import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import html2pdf from "html2pdf.js";
import { api } from "../services/api";
import OrcamentoPreview from "../components/OrcamentoPreview";
import { calcOrcamento, formatMoney } from "../utils/format";

const empty = {
  nomeCliente: "",
  telefone: "",
  produto: "",
  quantidade: 1,
  modelo: "",
  cores: "",
  personalizacao: "",
  configuracao: "",
  prazo: "",
  valorUnitario: "",
  observacoes: "",
  status: "RASCUNHO",
};

export default function OrcamentoForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [form, setForm] = useState(empty);
  const [meta, setMeta] = useState({
    numero: "Será gerado ao salvar",
    dataCriacao: new Date().toISOString(),
  });
  const [pdfExtras, setPdfExtras] = useState({
    tipoPagamento: "",
    chavePix: "",
    nomeRecebedor: "",
    tipoEntrega: "",
    observacoesEntrega: "",
  });
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [possuiPedido, setPossuiPedido] = useState(false);
  /** Status que veio do servidor ao abrir o formulário — não o valor atual do dropdown. */
  const [initialStatus, setInitialStatus] = useState(null);

  const bloqueadoPorJaAprovado = isEdit && initialStatus === "APROVADO";

  useEffect(() => {
    if (!id) {
      setInitialStatus(null);
      return;
    }
    api
      .get(`/api/orcamentos/${id}`)
      .then((o) => {
        setInitialStatus(o.status);
        setPossuiPedido(Boolean(o.possuiPedido));
        if (o.status === "APROVADO") {
          setNotice(
            "Este orçamento já está aprovado e não pode ser alterado. O pedido foi criado automaticamente — em Pedidos use o status (Sinal pago, Pago, etc.) para acompanhar o pagamento."
          );
        } else {
          setNotice("");
        }
        setMeta({ numero: o.numero, dataCriacao: o.dataCriacao });
        setForm({
          nomeCliente: o.nomeCliente,
          telefone: o.telefone,
          produto: o.produto,
          quantidade: o.quantidade,
          modelo: o.modelo,
          cores: o.cores,
          personalizacao: o.personalizacao,
          configuracao: o.configuracao,
          prazo: o.prazo,
          valorUnitario: o.valorUnitario,
          observacoes: o.observacoes,
          status: o.status,
        });
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const { valorTotal, valorSinal } = useMemo(
    () => calcOrcamento(form.quantidade, form.valorUnitario),
    [form.quantidade, form.valorUnitario]
  );

  const previewData = useMemo(
    () => ({
      ...form,
      valorUnitario: Number(form.valorUnitario) || 0,
      quantidade: Number(form.quantidade) || 0,
      valorTotal,
      valorSinal,
      numero: meta.numero,
      dataCriacao: meta.dataCriacao,
    }),
    [form, valorTotal, valorSinal, meta]
  );

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const validate = () => {
    if (!String(form.nomeCliente).trim()) return "Informe o nome do cliente.";
    if (Number(form.quantidade) <= 0) return "Quantidade deve ser maior que zero.";
    if (Number(form.valorUnitario) <= 0) return "Valor unitário deve ser maior que zero.";
    return "";
  };

  const buildPayload = (statusOverride) => ({
    nomeCliente: form.nomeCliente,
    telefone: form.telefone,
    produto: form.produto,
    quantidade: Number(form.quantidade),
    modelo: form.modelo,
    cores: form.cores,
    personalizacao: form.personalizacao,
    configuracao: form.configuracao,
    prazo: form.prazo,
    valorUnitario: Number(form.valorUnitario),
    observacoes: form.observacoes,
    status: statusOverride ?? form.status,
  });

  const submitOrcamento = async (statusOverride) => {
    const v = validate();
    if (v) {
      alert(v);
      return;
    }
    setSaving(true);
    setErr("");
    const payload = buildPayload(statusOverride);
    try {
      let data;
      if (isEdit) {
        data = await api.put(`/api/orcamentos/${id}`, payload);
      } else {
        data = await api.post("/api/orcamentos", payload);
      }
      if (data?.pedidoCriadoAutomaticamente) {
        const p = data.pedidoCriadoAutomaticamente;
        alert(
          `Pedido ${p.numero} criado.\n\nEm Pedidos, atualize o status (ex.: Sinal pago, Pago) conforme o cliente for pagando.`
        );
        navigate("/pedidos");
        return;
      }
      navigate("/orcamentos");
    } catch (e) {
      setErr(e.message);
    } finally {
      setSaving(false);
    }
  };

  const save = (e) => {
    e.preventDefault();
    submitOrcamento(undefined);
  };

  const aprovarECriarPedido = () => {
    submitOrcamento("APROVADO");
  };

  const gerarPdf = () => {
    const el = document.getElementById("orcamento-pdf-root");
    if (!el) return;
    const safeName = String(previewData.numero).replace(/[^\w-]+/g, "_");
    const opt = {
      margin: 10,
      filename: `${safeName || "orcamento"}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().set(opt).from(el).save();
  };

  if (loading) return <p className="text-slate-500">Carregando…</p>;

  return (
    <div>
      <div className="mb-8">
        <Link to="/orcamentos" className="text-sm text-sky-700 hover:underline">
          ← Voltar aos orçamentos
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">
          {isEdit ? "Editar orçamento" : "Novo orçamento"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          <strong>Aprovar</strong> é aqui no <strong>orçamento</strong> (não no pedido): escolha o status{" "}
          <strong>Aprovado</strong> e salve, ou use o botão verde abaixo. O sistema cria o{" "}
          <strong>pedido</strong> sozinho. O acompanhamento do pagamento fica no menu <strong>Pedidos</strong>, pelo{" "}
          <strong>status</strong> do pedido — não nesta página e não nos campos «só para o PDF».
        </p>
      </div>

      {notice && (
        <div className="mb-4 rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          {notice}
          {possuiPedido ? (
            <div className="mt-3">
              <Link
                to="/pedidos"
                className="inline-flex rounded-lg bg-aurea-navy px-3 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                Ir para Pedidos
              </Link>
            </div>
          ) : null}
        </div>
      )}

      {err && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">{err}</div>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <form onSubmit={save} className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Nome do cliente *</span>
              <input
                required
                disabled={bloqueadoPorJaAprovado}
                value={form.nomeCliente}
                onChange={(e) => set("nomeCliente", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Telefone</span>
              <input
                disabled={bloqueadoPorJaAprovado}
                value={form.telefone}
                onChange={(e) => set("telefone", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Status do orçamento</span>
              <p className="mt-0.5 text-xs text-slate-500">
                «Aprovado» + Salvar cria o pedido automaticamente. Pedidos usam outro status (Pendente, Pago…).
              </p>
              <select
                disabled={bloqueadoPorJaAprovado}
                value={form.status}
                onChange={(e) => set("status", e.target.value)}
                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                title={bloqueadoPorJaAprovado ? "Orçamento já aprovado no servidor" : undefined}
              >
                <option value="RASCUNHO">Rascunho</option>
                <option value="ENVIADO">Enviado</option>
                <option value="APROVADO">Aprovado — gera o pedido ao salvar</option>
                <option value="RECUSADO">Recusado</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Produto</span>
              <input
                disabled={bloqueadoPorJaAprovado}
                value={form.produto}
                onChange={(e) => set("produto", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Quantidade *</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                disabled={bloqueadoPorJaAprovado}
                value={form.quantidade}
                onChange={(e) => set("quantidade", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Valor unitário (R$) *</span>
              <input
                type="number"
                min={0.01}
                step={0.01}
                disabled={bloqueadoPorJaAprovado}
                value={form.valorUnitario}
                onChange={(e) => set("valorUnitario", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <div className="sm:col-span-2 rounded-lg bg-slate-50 p-3 text-sm">
              <p>
                <span className="text-slate-600">Total: </span>
                <strong>{formatMoney(valorTotal)}</strong>
              </p>
              <p>
                <span className="text-slate-600">Sinal (50%): </span>
                <strong className="text-amber-800">{formatMoney(valorSinal)}</strong>
              </p>
            </div>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Modelo</span>
              <input
                disabled={bloqueadoPorJaAprovado}
                value={form.modelo}
                onChange={(e) => set("modelo", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Cores</span>
              <input
                disabled={bloqueadoPorJaAprovado}
                value={form.cores}
                onChange={(e) => set("cores", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Personalização</span>
              <textarea
                disabled={bloqueadoPorJaAprovado}
                rows={3}
                value={form.personalizacao}
                onChange={(e) => set("personalizacao", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Configuração</span>
              <textarea
                disabled={bloqueadoPorJaAprovado}
                rows={3}
                value={form.configuracao}
                onChange={(e) => set("configuracao", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Prazo</span>
              <input
                disabled={bloqueadoPorJaAprovado}
                value={form.prazo}
                onChange={(e) => set("prazo", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Observações</span>
              <textarea
                disabled={bloqueadoPorJaAprovado}
                rows={3}
                value={form.observacoes}
                onChange={(e) => set("observacoes", e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </label>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-semibold uppercase text-slate-500">Só para o PDF (opcional)</p>
            <p className="mt-1 text-xs text-amber-800">
              Estes campos são só para impressão do orçamento. O estado do pagamento do pedido acompanha-se em{" "}
              <strong>Pedidos</strong> pelo status.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <input
                placeholder="Tipo de pagamento"
                value={pdfExtras.tipoPagamento}
                onChange={(e) => setPdfExtras((x) => ({ ...x, tipoPagamento: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Chave PIX"
                value={pdfExtras.chavePix}
                onChange={(e) => setPdfExtras((x) => ({ ...x, chavePix: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Nome do recebedor"
                value={pdfExtras.nomeRecebedor}
                onChange={(e) => setPdfExtras((x) => ({ ...x, nomeRecebedor: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Tipo de entrega"
                value={pdfExtras.tipoEntrega}
                onChange={(e) => setPdfExtras((x) => ({ ...x, tipoEntrega: e.target.value }))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <textarea
                placeholder="Observações de entrega"
                rows={2}
                className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={pdfExtras.observacoesEntrega}
                onChange={(e) => setPdfExtras((x) => ({ ...x, observacoesEntrega: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? "Salvando…" : "Salvar"}
            </button>
            {!bloqueadoPorJaAprovado && (
              <button
                type="button"
                disabled={saving}
                onClick={aprovarECriarPedido}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                Aprovar orçamento e criar pedido
              </button>
            )}
            <button
              type="button"
              onClick={gerarPdf}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Gerar PDF
            </button>
          </div>
        </form>

        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">Pré-visualização</p>
          <OrcamentoPreview data={previewData} payment={pdfExtras} delivery={pdfExtras} />
        </div>
      </div>
    </div>
  );
}
