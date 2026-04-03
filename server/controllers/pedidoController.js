import { db, calcPedidoLucro } from "../db.js";
import { mapPedidoRow } from "../models/pedidoModel.js";

const ALLOWED_STATUS = ["PENDENTE", "SINAL_PAGO", "PAGO", "FINALIZADO", "CANCELADO"];

export function listPedidos(req, res) {
  try {
    const { status, search } = req.query;
    let sql = "SELECT * FROM pedidos WHERE 1=1";
    const params = [];
    if (status && ALLOWED_STATUS.includes(status)) {
      sql += " AND status = ?";
      params.push(status);
    }
    if (search && String(search).trim()) {
      sql += " AND (nomeCliente LIKE ? OR telefone LIKE ? OR produto LIKE ? OR numero LIKE ?)";
      const q = `%${String(search).trim()}%`;
      params.push(q, q, q, q);
    }
    sql += " ORDER BY id DESC";
    const rows = db.prepare(sql).all(...params);
    res.json(rows.map(mapPedidoRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export function getPedido(req, res) {
  try {
    const row = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(req.params.id);
    const p = mapPedidoRow(row);
    if (!p) return res.status(404).json({ error: "Pedido não encontrado" });
    res.json(p);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export function updatePedido(req, res) {
  try {
    const id = req.params.id;
    const existing = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Pedido não encontrado" });
    if (existing.status === "CANCELADO") {
      return res.status(400).json({ error: "Pedido cancelado não pode ser editado" });
    }

    const body = req.body || {};
    if (body.status != null && !ALLOWED_STATUS.includes(body.status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    const merged = {
      nomeCliente: body.nomeCliente !== undefined ? body.nomeCliente : existing.nomeCliente,
      telefone: body.telefone !== undefined ? body.telefone : existing.telefone,
      produto: body.produto !== undefined ? body.produto : existing.produto,
      quantidade: body.quantidade !== undefined ? body.quantidade : existing.quantidade,
      modelo: body.modelo !== undefined ? body.modelo : existing.modelo,
      cores: body.cores !== undefined ? body.cores : existing.cores,
      personalizacao: body.personalizacao !== undefined ? body.personalizacao : existing.personalizacao,
      configuracao: body.configuracao !== undefined ? body.configuracao : existing.configuracao,
      prazo: body.prazo !== undefined ? body.prazo : existing.prazo,
      valorTotal: body.valorTotal !== undefined ? body.valorTotal : existing.valorTotal,
      valorPago: body.valorPago !== undefined ? body.valorPago : existing.valorPago,
      custo: body.custo !== undefined ? body.custo : existing.custo,
      status: body.status !== undefined ? body.status : existing.status,
      tipoPagamento: body.tipoPagamento !== undefined ? body.tipoPagamento : existing.tipoPagamento,
      chavePix: body.chavePix !== undefined ? body.chavePix : existing.chavePix,
      nomeRecebedor: body.nomeRecebedor !== undefined ? body.nomeRecebedor : existing.nomeRecebedor,
      tipoEntrega: body.tipoEntrega !== undefined ? body.tipoEntrega : existing.tipoEntrega,
      observacoesEntrega: body.observacoesEntrega !== undefined ? body.observacoesEntrega : existing.observacoesEntrega,
      observacoes: body.observacoes !== undefined ? body.observacoes : existing.observacoes,
    };

    const q = Number(merged.quantidade);
    if (q <= 0) return res.status(400).json({ error: "quantidade deve ser maior que 0" });
    const vt = Number(merged.valorTotal);
    if (vt <= 0) return res.status(400).json({ error: "valorTotal deve ser maior que 0" });

    const valorSinal = Math.round(vt * 0.5 * 100) / 100;
    const lucro = calcPedidoLucro(vt, merged.custo);
    const now = new Date().toISOString();

    db.prepare(`
      UPDATE pedidos SET
        nomeCliente = ?, telefone = ?, produto = ?, quantidade = ?, modelo = ?, cores = ?,
        personalizacao = ?, configuracao = ?, prazo = ?, valorTotal = ?, valorSinal = ?,
        valorPago = ?, custo = ?, lucro = ?, status = ?, tipoPagamento = ?, chavePix = ?,
        nomeRecebedor = ?, tipoEntrega = ?, observacoesEntrega = ?, observacoes = ?,
        dataAtualizacao = ?
      WHERE id = ?
    `).run(
      String(merged.nomeCliente || "").trim(),
      String(merged.telefone || "").trim(),
      String(merged.produto || "").trim(),
      Number(merged.quantidade),
      String(merged.modelo || "").trim(),
      String(merged.cores || "").trim(),
      String(merged.personalizacao || "").trim(),
      String(merged.configuracao || "").trim(),
      String(merged.prazo || "").trim(),
      Number(merged.valorTotal),
      valorSinal,
      Number(merged.valorPago) || 0,
      Number(merged.custo) || 0,
      lucro,
      merged.status,
      String(merged.tipoPagamento || "").trim(),
      String(merged.chavePix || "").trim(),
      String(merged.nomeRecebedor || "").trim(),
      String(merged.tipoEntrega || "").trim(),
      String(merged.observacoesEntrega || "").trim(),
      String(merged.observacoes || "").trim(),
      now,
      id
    );
    const row = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
    res.json(mapPedidoRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export function patchPedidoStatus(req, res) {
  try {
    const id = req.params.id;
    const existing = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Pedido não encontrado" });
    if (existing.status === "CANCELADO") {
      return res.status(400).json({ error: "Pedido cancelado não pode ser alterado" });
    }
    const { status } = req.body || {};
    if (!status || !ALLOWED_STATUS.includes(status)) {
      return res.status(400).json({ error: "status inválido" });
    }
    const now = new Date().toISOString();
    db.prepare("UPDATE pedidos SET status = ?, dataAtualizacao = ? WHERE id = ?").run(status, now, id);
    const row = db.prepare("SELECT * FROM pedidos WHERE id = ?").get(id);
    res.json(mapPedidoRow(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export function deletePedido(req, res) {
  try {
    const id = req.params.id;
    const r = db.prepare("DELETE FROM pedidos WHERE id = ?").run(id);
    if (r.changes === 0) return res.status(404).json({ error: "Pedido não encontrado" });
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
