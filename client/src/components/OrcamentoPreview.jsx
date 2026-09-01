import { formatMoney, formatDate, orcamentoReferenciaExibicao } from "../utils/format";
import { BRAND_LOGO_SRC, BRAND_NAME } from "./BrandLogo";

function hasText(value) {
  return String(value ?? "").trim().length > 0;
}

function DetailField({ label, value, wide = false }) {
  if (!hasText(value)) return null;
  return (
    <div className={wide ? "md:col-span-2" : undefined}>
      <dt className="text-slate-500">{label}</dt>
      <dd className={`font-medium text-slate-900${wide ? " whitespace-pre-wrap" : ""}`}>{value}</dd>
    </div>
  );
}

function resolveItens(data) {
  if (data.itens?.length) return data.itens;
  return [
    {
      produto: data.produto,
      quantidade: data.quantidade,
      modelo: data.modelo,
      cores: data.cores,
      personalizacao: data.personalizacao,
      configuracao: data.configuracao,
      prazo: data.prazo,
      valorUnitario: data.valorUnitario,
      valorTotal: data.valorTotal,
    },
  ];
}

/**
 * Conteúdo usado na tela e na exportação PDF (html2pdf clona este nó).
 */
export default function OrcamentoPreview({ data, payment = {}, delivery = {} }) {
  if (!data) return null;
  const itens = resolveItens(data);
  const referencia = orcamentoReferenciaExibicao(data.numero, data.nomeCliente);
  const temPagamento =
    hasText(payment.tipoPagamento) ||
    hasText(payment.chavePix) ||
    hasText(payment.nomeRecebedor);
  const temEntrega = hasText(delivery.tipoEntrega) || hasText(delivery.observacoesEntrega);

  return (
    <div
      id="orcamento-pdf-root"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm print:border-0 print:shadow-none"
    >
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <img
            src={BRAND_LOGO_SRC}
            alt={BRAND_NAME}
            className="h-16 w-auto max-w-[120px] shrink-0 object-contain sm:h-20 sm:max-w-[150px]"
          />
          <div className="min-w-0 text-left">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-aurea-blue">Documento</p>
            <h1 className="text-lg font-bold leading-tight text-aurea-navy sm:text-xl">ORÇAMENTO</h1>
            <p className="text-xs text-slate-600">{referencia}</p>
            <p className="text-[10px] font-medium text-aurea-navy">{BRAND_NAME}</p>
          </div>
        </div>
        <div className="text-left text-xs text-slate-600 sm:text-right">
          <p>Última atualização</p>
          <p className="font-medium text-aurea-navy">
            {formatDate(data.dataAtualizacao ?? data.dataCriacao)}
          </p>
          {data.dataCriacao &&
          data.dataAtualizacao &&
          data.dataCriacao !== data.dataAtualizacao ? (
            <p className="mt-0.5 text-[10px] text-slate-500">
              Criado em {formatDate(data.dataCriacao)}
            </p>
          ) : null}
        </div>
      </div>

      <section className="mt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Cliente</h2>
        <p className="mt-1 font-medium text-slate-900">{data.nomeCliente}</p>
        {hasText(data.telefone) ? (
          <p className="text-sm text-slate-600">{data.telefone}</p>
        ) : null}
      </section>

      <section className="mt-6 space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Produtos ({itens.length})
        </h2>
        {itens.map((item, index) => (
          <div
            key={index}
            className="rounded-lg border border-slate-200 bg-slate-50 p-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Item {index + 1}</p>
                <p className="mt-1 font-medium text-slate-900">{item.produto || "—"}</p>
              </div>
              <p className="text-sm font-semibold text-aurea-navy">
                {formatMoney(item.valorTotal)}
              </p>
            </div>
            <dl className="mt-3 grid gap-2 text-sm md:grid-cols-2">
              <div>
                <dt className="text-slate-500">Quantidade</dt>
                <dd className="font-medium text-slate-900">{item.quantidade}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Valor unitário</dt>
                <dd className="font-medium text-slate-900">{formatMoney(item.valorUnitario)}</dd>
              </div>
              <DetailField label="Modelo" value={item.modelo} />
              <DetailField label="Cores" value={item.cores} />
              <DetailField label="Personalização" value={item.personalizacao} wide />
              <DetailField label="Configuração" value={item.configuracao} wide />
              <DetailField label="Prazo" value={item.prazo} />
            </dl>
          </div>
        ))}
      </section>

      <section className="mt-6 border-t border-slate-200 pt-6">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Valores</h2>
        <div className="mt-4 space-y-2 text-sm">
          <div className="flex justify-between text-base">
            <span className="font-semibold text-aurea-navy">Total geral</span>
            <span className="font-bold text-aurea-navy">{formatMoney(data.valorTotal)}</span>
          </div>
          <div className="flex justify-between rounded-lg border-2 border-amber-400 bg-amber-50 px-4 py-3 text-base">
            <span className="font-semibold text-amber-900">Sinal (50%)</span>
            <span className="font-bold text-amber-900">{formatMoney(data.valorSinal)}</span>
          </div>
        </div>
      </section>

      {temPagamento || temEntrega ? (
        <section className="mt-6 grid gap-6 rounded-lg border border-slate-200 p-4 md:grid-cols-2">
          {temPagamento ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pagamento</h2>
              {hasText(payment.tipoPagamento) ? (
                <p className="mt-2 text-sm text-slate-700">
                  <span className="text-slate-500">Forma: </span>
                  {payment.tipoPagamento}
                </p>
              ) : null}
              {hasText(payment.chavePix) ? (
                <p className="text-sm text-slate-700">
                  <span className="text-slate-500">PIX: </span>
                  {payment.chavePix}
                </p>
              ) : null}
              {hasText(payment.nomeRecebedor) ? (
                <p className="text-sm text-slate-700">
                  <span className="text-slate-500">Recebedor: </span>
                  {payment.nomeRecebedor}
                </p>
              ) : null}
            </div>
          ) : null}
          {temEntrega ? (
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Entrega</h2>
              {hasText(delivery.tipoEntrega) ? (
                <p className="mt-2 text-sm text-slate-700">
                  <span className="text-slate-500">Tipo: </span>
                  {delivery.tipoEntrega}
                </p>
              ) : null}
              {hasText(delivery.observacoesEntrega) ? (
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {delivery.observacoesEntrega}
                </p>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      {hasText(data.observacoes) ? (
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
