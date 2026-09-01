export function formatMoney(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatDate(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function calcOrcamento(quantidade, valorUnitario) {
  const q = Number(quantidade) || 0;
  const vu = Number(valorUnitario) || 0;
  const valorTotal = Math.round(q * vu * 100) / 100;
  const valorSinal = Math.round(valorTotal * 0.5 * 100) / 100;
  return { valorTotal, valorSinal };
}

export function emptyOrcamentoItem() {
  return {
    produto: "",
    quantidade: 1,
    modelo: "",
    cores: "",
    personalizacao: "",
    configuracao: "",
    prazo: "",
    valorUnitario: "",
  };
}

export function calcOrcamentoItens(itens) {
  const normalized = (itens ?? []).map((item) => {
    const { valorTotal } = calcOrcamento(item.quantidade, item.valorUnitario);
    return {
      ...item,
      quantidade: Number(item.quantidade) || 0,
      valorUnitario: Number(item.valorUnitario) || 0,
      valorTotal,
    };
  });
  const valorTotal =
    Math.round(normalized.reduce((sum, item) => sum + item.valorTotal, 0) * 100) / 100;
  const valorSinal = Math.round(valorTotal * 0.5 * 100) / 100;
  return { itens: normalized, valorTotal, valorSinal };
}

function sanitizeFilenamePart(value) {
  return String(value ?? "")
    .trim()
    .replace(/[^\w\u00C0-\u024F-]+/gi, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 80);
}

export function isOrcamentoNumeroPlaceholder(numero) {
  return !numero || /ser[aá]\s*gerado/i.test(String(numero));
}

/** Texto no PDF/cabeçalho: número do orçamento, nome do cliente ou «Rascunho». */
export function orcamentoReferenciaExibicao(numero, nomeCliente) {
  if (!isOrcamentoNumeroPlaceholder(numero)) return String(numero).trim();
  const cliente = String(nomeCliente ?? "").trim();
  if (cliente) return cliente;
  return "Rascunho";
}

/** Nome do ficheiro PDF: número do orçamento ou nome do cliente. */
export function orcamentoPdfFilename(numero, nomeCliente) {
  const isPlaceholder = isOrcamentoNumeroPlaceholder(numero);
  const numPart = isPlaceholder ? "" : sanitizeFilenamePart(numero);
  const clientPart = sanitizeFilenamePart(nomeCliente);
  if (numPart) return numPart;
  if (clientPart) return clientPart;
  return "orcamento";
}
