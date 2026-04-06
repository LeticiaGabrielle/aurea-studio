import { db, nextNumber, calcPedidoLucro } from "../db.js";
import { mapPedidoRow } from "../models/pedidoModel.js";

/**
 * Cria pedido a partir de orçamento aprovado, se ainda não existir.
 * @returns {Promise<{ criado: boolean, pedido: object | null }>}
 */
export async function garantirPedidoParaOrcamentoAprovado(orcamentoId) {
  const id = Number(orcamentoId);
  const o = await db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
  if (!o || o.status !== "APROVADO") {
    return { criado: false, pedido: null };
  }
  const existente = await db.prepare('SELECT * FROM pedidos WHERE "orcamentoId" = ?').get(id);
  if (existente) {
    return { criado: false, pedido: mapPedidoRow(existente) };
  }

  const numero = await nextNumber("PED", "pedido");
  const now = new Date().toISOString();
  const valorTotal = o.valorTotal;
  const valorSinal = o.valorSinal;
  const custo = 0;
  const lucro = calcPedidoLucro(valorTotal, custo);

  const stmt = db.prepare(`
    INSERT INTO pedidos (
      numero, "orcamentoId", "nomeCliente", telefone, produto, quantidade, modelo, cores,
      personalizacao, configuracao, prazo, "valorTotal", "valorSinal", "valorPago", custo, lucro,
      status, "tipoPagamento", "chavePix", "nomeRecebedor", "tipoEntrega", "observacoesEntrega",
      observacoes, "registroPagamento", "dataCriacao", "dataAtualizacao"
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  const info = await stmt.run(
    numero,
    id,
    o.nomeCliente,
    o.telefone,
    o.produto,
    o.quantidade,
    o.modelo,
    o.cores,
    o.personalizacao,
    o.configuracao,
    o.prazo,
    valorTotal,
    valorSinal,
    0,
    custo,
    lucro,
    "PENDENTE",
    String(o.tipoPagamento ?? "").trim(),
    String(o.chavePix ?? "").trim(),
    String(o.nomeRecebedor ?? "").trim(),
    String(o.tipoEntrega ?? "").trim(),
    String(o.observacoesEntrega ?? "").trim(),
    o.observacoes,
    "A_COBRAR",
    now,
    now
  );
  const row = await db.prepare("SELECT * FROM pedidos WHERE id = ?").get(info.lastInsertRowid);
  return { criado: true, pedido: mapPedidoRow(row) };
}
