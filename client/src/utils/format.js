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
