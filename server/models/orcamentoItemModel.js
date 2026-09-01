export function mapOrcamentoItemRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    orcamentoId: row.orcamentoId,
    ordem: row.ordem ?? 0,
    produto: row.produto ?? "",
    quantidade: row.quantidade,
    modelo: row.modelo ?? "",
    cores: row.cores ?? "",
    personalizacao: row.personalizacao ?? "",
    configuracao: row.configuracao ?? "",
    prazo: row.prazo ?? "",
    valorUnitario: row.valorUnitario,
    valorTotal: row.valorTotal,
  };
}
