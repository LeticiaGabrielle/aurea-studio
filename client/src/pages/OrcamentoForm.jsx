import { useEffect, useMemo, useState } from "react";

import { Link, useNavigate, useParams } from "react-router-dom";

import html2pdf from "html2pdf.js";

import { api } from "../services/api";

import OrcamentoItemFields from "../components/OrcamentoItemFields";

import OrcamentoPreview from "../components/OrcamentoPreview";

import { calcOrcamentoItens, emptyOrcamentoItem, formatMoney, orcamentoPdfFilename } from "../utils/format";



const emptyHeader = {

  nomeCliente: "",

  telefone: "",

  observacoes: "",

  status: "RASCUNHO",

};



export default function OrcamentoForm() {

  const { id } = useParams();

  const navigate = useNavigate();

  const isEdit = Boolean(id);

  const [header, setHeader] = useState(emptyHeader);

  const [itens, setItens] = useState([emptyOrcamentoItem()]);

  const [meta, setMeta] = useState({

    numero: "",

    dataCriacao: new Date().toISOString(),

    dataAtualizacao: new Date().toISOString(),

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

        setMeta({

          numero: o.numero,

          dataCriacao: o.dataCriacao,

          dataAtualizacao: o.dataAtualizacao ?? o.dataCriacao,

        });

        setHeader({

          nomeCliente: o.nomeCliente,

          telefone: o.telefone,

          observacoes: o.observacoes,

          status: o.status,

        });

        setItens(

          o.itens?.length

            ? o.itens.map((item) => ({

                produto: item.produto ?? "",

                quantidade: item.quantidade ?? 1,

                modelo: item.modelo ?? "",

                cores: item.cores ?? "",

                personalizacao: item.personalizacao ?? "",

                configuracao: item.configuracao ?? "",

                prazo: item.prazo ?? "",

                valorUnitario: item.valorUnitario ?? "",

              }))

            : [

                {

                  produto: o.produto ?? "",

                  quantidade: o.quantidade ?? 1,

                  modelo: o.modelo ?? "",

                  cores: o.cores ?? "",

                  personalizacao: o.personalizacao ?? "",

                  configuracao: o.configuracao ?? "",

                  prazo: o.prazo ?? "",

                  valorUnitario: o.valorUnitario ?? "",

                },

              ]

        );

        setPdfExtras({

          tipoPagamento: o.tipoPagamento ?? "",

          chavePix: o.chavePix ?? "",

          nomeRecebedor: o.nomeRecebedor ?? "",

          tipoEntrega: o.tipoEntrega ?? "",

          observacoesEntrega: o.observacoesEntrega ?? "",

        });

      })

      .catch((e) => setErr(e.message))

      .finally(() => setLoading(false));

  }, [id]);



  const { itens: itensCalculados, valorTotal, valorSinal } = useMemo(

    () => calcOrcamentoItens(itens),

    [itens]

  );



  const previewData = useMemo(

    () => ({

      ...header,

      itens: itensCalculados,

      valorTotal,

      valorSinal,

      numero: meta.numero,

      dataCriacao: meta.dataCriacao,

      dataAtualizacao: meta.dataAtualizacao,

    }),

    [header, itensCalculados, valorTotal, valorSinal, meta]

  );



  const setHeaderField = (k, v) => setHeader((f) => ({ ...f, [k]: v }));



  const updateItem = (index, next) => {

    setItens((list) => list.map((item, i) => (i === index ? next : item)));

  };



  const addItem = () => {

    setItens((list) => [...list, emptyOrcamentoItem()]);

  };



  const removeItem = (index) => {

    setItens((list) => list.filter((_, i) => i !== index));

  };



  const validate = () => {

    if (!String(header.nomeCliente).trim()) return "Informe o nome do cliente.";

    if (!itens.length) return "Adicione pelo menos um produto.";

    for (let i = 0; i < itens.length; i++) {

      const item = itens[i];

      const n = i + 1;

      if (!String(item.produto).trim()) return `Produto ${n}: informe o nome.`;

      if (Number(item.quantidade) <= 0) return `Produto ${n}: quantidade deve ser maior que zero.`;

      if (Number(item.valorUnitario) <= 0) {

        return `Produto ${n}: valor unitário deve ser maior que zero.`;

      }

    }

    return "";

  };



  const buildPayload = (statusOverride) => ({

    nomeCliente: header.nomeCliente,

    telefone: header.telefone,

    observacoes: header.observacoes,

    status: statusOverride ?? header.status,

    itens: itens.map((item) => ({

      produto: item.produto,

      quantidade: Number(item.quantidade),

      modelo: item.modelo,

      cores: item.cores,

      personalizacao: item.personalizacao,

      configuracao: item.configuracao,

      prazo: item.prazo,

      valorUnitario: Number(item.valorUnitario),

    })),

    tipoPagamento: pdfExtras.tipoPagamento,

    chavePix: pdfExtras.chavePix,

    nomeRecebedor: pdfExtras.nomeRecebedor,

    tipoEntrega: pdfExtras.tipoEntrega,

    observacoesEntrega: pdfExtras.observacoesEntrega,

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

        setMeta((m) => ({

          ...m,

          dataAtualizacao: data.dataAtualizacao ?? data.dataCriacao,

        }));

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

    const filename = `${orcamentoPdfFilename(previewData.numero, previewData.nomeCliente)}.pdf`;

    const opt = {

      margin: 10,

      filename,

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

          Adicione quantos produtos precisar no mesmo orçamento. O <strong>total</strong> e o{" "}

          <strong>sinal (50%)</strong> são calculados automaticamente. Ao aprovar, o pedido é criado

          com o valor total de todos os itens.

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

                value={header.nomeCliente}

                onChange={(e) => setHeaderField("nomeCliente", e.target.value)}

                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

            </label>

            <label className="block">

              <span className="text-sm font-medium text-slate-700">Telefone</span>

              <input

                disabled={bloqueadoPorJaAprovado}

                value={header.telefone}

                onChange={(e) => setHeaderField("telefone", e.target.value)}

                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

            </label>

            <label className="block sm:col-span-2">

              <span className="text-sm font-medium text-slate-700">Status do orçamento</span>

              <select

                disabled={bloqueadoPorJaAprovado}

                value={header.status}

                onChange={(e) => setHeaderField("status", e.target.value)}

                className="mt-1 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              >

                <option value="RASCUNHO">Rascunho</option>

                <option value="ENVIADO">Enviado</option>

                <option value="APROVADO">Aprovado — gera o pedido ao salvar</option>

                <option value="RECUSADO">Recusado</option>

              </select>

            </label>

          </div>



          <div className="space-y-4 border-t border-slate-200 pt-4">

            <div className="flex flex-wrap items-center justify-between gap-2">

              <p className="text-sm font-semibold text-slate-800">Produtos do orçamento</p>

              {!bloqueadoPorJaAprovado && (

                <button

                  type="button"

                  onClick={addItem}

                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium hover:bg-slate-50"

                >

                  + Adicionar produto

                </button>

              )}

            </div>

            {itens.map((item, index) => (

              <OrcamentoItemFields

                key={index}

                index={index}

                item={item}

                onChange={updateItem}

                onRemove={removeItem}

                canRemove={itens.length > 1}

                disabled={bloqueadoPorJaAprovado}

              />

            ))}

            <div className="rounded-lg bg-slate-900 px-4 py-3 text-sm text-white">

              <p>

                Total geral: <strong>{formatMoney(valorTotal)}</strong>

              </p>

              <p className="mt-1 text-amber-200">

                Sinal (50%): <strong>{formatMoney(valorSinal)}</strong>

              </p>

            </div>

          </div>



          <label className="block border-t border-slate-200 pt-4">

            <span className="text-sm font-medium text-slate-700">Observações gerais</span>

            <textarea

              disabled={bloqueadoPorJaAprovado}

              rows={3}

              value={header.observacoes}

              onChange={(e) => setHeaderField("observacoes", e.target.value)}

              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

            />

          </label>



          <div className="border-t border-slate-200 pt-4">

            <p className="text-xs font-semibold uppercase text-slate-500">Pagamento e entrega no PDF (opcional)</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">

              <input

                placeholder="Tipo de pagamento"

                disabled={bloqueadoPorJaAprovado}

                value={pdfExtras.tipoPagamento}

                onChange={(e) => setPdfExtras((x) => ({ ...x, tipoPagamento: e.target.value }))}

                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

              <input

                placeholder="Chave PIX"

                disabled={bloqueadoPorJaAprovado}

                value={pdfExtras.chavePix}

                onChange={(e) => setPdfExtras((x) => ({ ...x, chavePix: e.target.value }))}

                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

              <input

                placeholder="Nome do recebedor"

                disabled={bloqueadoPorJaAprovado}

                value={pdfExtras.nomeRecebedor}

                onChange={(e) => setPdfExtras((x) => ({ ...x, nomeRecebedor: e.target.value }))}

                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

              <input

                placeholder="Tipo de entrega"

                disabled={bloqueadoPorJaAprovado}

                value={pdfExtras.tipoEntrega}

                onChange={(e) => setPdfExtras((x) => ({ ...x, tipoEntrega: e.target.value }))}

                className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

              />

              <textarea

                placeholder="Observações de entrega"

                rows={2}

                disabled={bloqueadoPorJaAprovado}

                className="sm:col-span-2 rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"

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

