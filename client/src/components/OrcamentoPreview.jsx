import { formatMoney, formatDate } from "../utils/format";
import { BRAND_LOGO_SRC, BRAND_NAME } from "./BrandLogo";

/**
 * Conteúdo usado na tela e na exportação PDF (html2pdf clona este nó).
 */
export default function OrcamentoPreview({ data, payment = {}, delivery = {} }) {
  if (!data) return null;
  return (
    <div
      id="orcamento-pdf-root"
      className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm print:border-0 print:shadow-none"
    >
      <div className="flex flex-col gap-6 border-b border-slate-200 pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
          <img
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            className="h-28 w-auto max-w-[200px] object-contain sm:h-32 sm:max-w-[220px]"
          />
          <div className="text-center sm:text-left">
            <p className="text-xs font-semibold uppercase tracking-wider text-aurea-blue">Documento</p>
            <h1 className="text-2xl font-bold text-aurea-navy">ORÇAMENTO</h1>
            <p className="text-sm text-slate-600">{data.numero}</p>
            <p className="mt-1 text-xs font-medium text-aurea-navy">{BRAND_NAME}</p>
          </div>
        </div>
        <div className="text-center text-sm text-slate-600 sm:text-right">
          <p>Emitido em</p>
          <p className="font-medium text-aurea-navy">{formatDate(data.dataCriacao)}</p>
        </div>
      </div>

      <section className="mt-6 grid gap-6 md:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</h2>
          <p className="mt-1 font-medium text-slate-900">{data.nomeCliente || "—"}</p>
          <p className="text-sm text-slate-600">{data.telefone || "—"}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Produto</h2>
          <p className="mt-1 font-medium text-slate-900">{data.produto || "—"}</p>
          <p className="text-sm text-slate-600">Quantidade: {data.quantidade}</p>
        </div>
      </section>

      <section className="mt-6 rounded-lg bg-slate-50 p-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Detalhes</h2>
        <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <div>
            <dt className="text-slate-500">Modelo</dt>
            <dd className="font-medium text-slate-900">{data.modelo || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Cores</dt>
            <dd className="font-medium text-slate-900">{data.cores || "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-slate-500">Personalização</dt>
            <dd className="font-medium text-slate-900 whitespace-pre-wrap">{data.personalizacao || "—"}</dd>
          </div>
          <div className="md:col-span-2">
            <dt className="text-slate-500">Configuração</dt>
            <dd className="font-medium text-slate-900 whitespace-pre-wrap">{data.configuracao || "—"}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Prazo</dt>
            <dd className="font-medium text-slate-900">{data.prazo || "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="mt-6 border-t border-slate-200 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valores</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-600">Valor unitário</span>
            <span className="font-medium">{formatMoney(data.valorUnitario)}</span>
          </div>
          <div className="flex justify-between text-base">
            <span className="font-semibold text-aurea-navy">Total</span>
            <span className="font-bold text-aurea-navy">{formatMoney(data.valorTotal)}</span>
          </div>
          <div className="flex justify-between rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base">
            <span className="font-semibold text-amber-900">Sinal (50%)</span>
            <span className="font-bold text-amber-900">{formatMoney(data.valorSinal)}</span>
          </div>
        </div>
      </section>

      <section className="mt-6 grid gap-6 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</h2>
          <p className="mt-2 text-sm text-slate-700">
            <span className="text-slate-500">Forma: </span>
            {payment.tipoPagamento || "A combinar"}
          </p>
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">PIX: </span>
            {payment.chavePix || "—"}
          </p>
          <p className="text-sm text-slate-700">
            <span className="text-slate-500">Recebedor: </span>
            {payment.nomeRecebedor || "—"}
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entrega</h2>
          <p className="mt-2 text-sm text-slate-700">
            <span className="text-slate-500">Tipo: </span>
            {delivery.tipoEntrega || "A combinar"}
          </p>
          <p className="text-sm text-slate-700 whitespace-pre-wrap">
            {delivery.observacoesEntrega || "—"}
          </p>
        </div>
      </section>

      {data.observacoes ? (
        <section className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Observações</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{data.observacoes}</p>
        </section>
      ) : null}

      <p className="mt-8 text-center text-xs text-slate-400">
        {BRAND_NAME} · documento gerado eletronicamente · válido conforme combinado com o cliente
      </p>
    </div>
  );
}
