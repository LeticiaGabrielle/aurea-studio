export function mapOrcamentoRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    numero: row.numero,
    nomeCliente: row.nomeCliente,
    telefone: row.telefone,
    produto: row.produto,
    quantidade: row.quantidade,
    modelo: row.modelo,
    cores: row.cores,
    personalizacao: row.personalizacao,
    configuracao: row.configuracao,
    prazo: row.prazo,
    valorUnitario: row.valorUnitario,
    valorTotal: row.valorTotal,
    valorSinal: row.valorSinal,
    observacoes: row.observacoes,
    dataCriacao: row.dataCriacao,
    status: row.status,
    ...(row.possuiPedido !== undefined && row.possuiPedido !== null
      ? {
          possuiPedido:
            Number(row.possuiPedido) === 1 || row.possuiPedido === true,
        }
      : {}),
  };
}
