import { db } from "../db.js";

export async function getDashboard(req, res) {
  try {
    const faturamentoRow = await db
      .prepare(`
      SELECT COALESCE(SUM("valorTotal"), 0) AS v
      FROM pedidos
      WHERE status IN ('PAGO', 'FINALIZADO')
    `)
      .get();

    const totalRecebidoRow = await db
      .prepare(`
      SELECT COALESCE(SUM("valorPago"), 0) AS v
      FROM pedidos
      WHERE status != 'CANCELADO'
    `)
      .get();

    const lucroRow = await db
      .prepare(`
      SELECT COALESCE(SUM(lucro), 0) AS v
      FROM pedidos
      WHERE status IN ('PAGO', 'FINALIZADO')
    `)
      .get();

    const pendentesRow = await db
      .prepare(`
      SELECT COUNT(*) AS c FROM pedidos WHERE status = 'PENDENTE'
    `)
      .get();

    const canceladosRow = await db
      .prepare(`
      SELECT COUNT(*) AS c FROM pedidos WHERE status = 'CANCELADO'
    `)
      .get();

    res.json({
      faturamentoTotal: Number(faturamentoRow.v),
      totalRecebido: Number(totalRecebidoRow.v),
      lucroTotal: Number(lucroRow.v),
      pedidosPendentes: Number(pendentesRow.c),
      pedidosCancelados: Number(canceladosRow.c),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
