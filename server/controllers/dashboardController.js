import { db } from "../db.js";

export function getDashboard(req, res) {
  try {
    const faturamentoRow = db.prepare(`
      SELECT COALESCE(SUM(valorTotal), 0) AS v
      FROM pedidos
      WHERE status IN ('PAGO', 'FINALIZADO')
    `).get();

    const totalRecebidoRow = db.prepare(`
      SELECT COALESCE(SUM(valorPago), 0) AS v
      FROM pedidos
      WHERE status != 'CANCELADO'
    `).get();

    const lucroRow = db.prepare(`
      SELECT COALESCE(SUM(lucro), 0) AS v
      FROM pedidos
      WHERE status IN ('PAGO', 'FINALIZADO')
    `).get();

    const pendentesRow = db.prepare(`
      SELECT COUNT(*) AS c FROM pedidos WHERE status = 'PENDENTE'
    `).get();

    const canceladosRow = db.prepare(`
      SELECT COUNT(*) AS c FROM pedidos WHERE status = 'CANCELADO'
    `).get();

    res.json({
      faturamentoTotal: faturamentoRow.v,
      totalRecebido: totalRecebidoRow.v,
      lucroTotal: lucroRow.v,
      pedidosPendentes: pendentesRow.c,
      pedidosCancelados: canceladosRow.c,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
