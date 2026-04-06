import { db, nextNumber, calcOrcamentoRow } from "../db.js";
import { mapOrcamentoRow } from "../models/orcamentoModel.js";
import { garantirPedidoParaOrcamentoAprovado } from "../services/pedidoFromOrcamento.js";

const ALLOWED_STATUS = ["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO"];

const ORC_SELECT = `
  SELECT o.*, CASE WHEN EXISTS (SELECT 1 FROM pedidos p WHERE p."orcamentoId" = o.id) THEN 1 ELSE 0 END AS "possuiPedido"
  FROM orcamentos o
`;

export async function listOrcamentos(req, res) {
  try {
    const { status, search } = req.query;
    let sql = `${ORC_SELECT} WHERE 1=1`;
    const params = [];
    if (status && ALLOWED_STATUS.includes(status)) {
      sql += " AND o.status = ?";
      params.push(status);
    }
    if (search && String(search).trim()) {
      sql +=
        " AND (o.\"nomeCliente\" LIKE ? OR o.telefone LIKE ? OR o.produto LIKE ? OR o.numero LIKE ?)";
      const q = `%${String(search).trim()}%`;
      params.push(q, q, q, q);
    }
    sql += " ORDER BY o.id DESC";
    const rows = await db.prepare(sql).all(...params);
    res.json(rows.map(mapOrcamentoRow));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getOrcamento(req, res) {
  try {
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(req.params.id);
    const o = mapOrcamentoRow(row);
    if (!o) return res.status(404).json({ error: "Orçamento não encontrado" });
    res.json(o);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

function validateOrcamentoBody(body, partial) {
  const errors = [];
  if (!partial) {
    if (!body.nomeCliente || !String(body.nomeCliente).trim()) errors.push("nomeCliente obrigatório");
  }
  const q = body.quantidade != null ? Number(body.quantidade) : null;
  const vu = body.valorUnitario != null ? Number(body.valorUnitario) : null;
  if (!partial || q != null) {
    if (q == null || q <= 0) errors.push("quantidade deve ser maior que 0");
  }
  if (!partial || vu != null) {
    if (vu == null || vu <= 0) errors.push("valorUnitario deve ser maior que 0");
  }
  if (body.status != null && !ALLOWED_STATUS.includes(body.status)) {
    errors.push("status inválido");
  }
  return errors;
}

export async function createOrcamento(req, res) {
  try {
    const body = req.body || {};
    const errs = validateOrcamentoBody(body, false);
    if (errs.length) return res.status(400).json({ errors: errs });

    const { valorTotal, valorSinal } = calcOrcamentoRow(body);
    const numero = await nextNumber("ORC", "orcamento");
    const now = new Date().toISOString();
    const status = body.status && ALLOWED_STATUS.includes(body.status) ? body.status : "RASCUNHO";

    const stmt = db.prepare(`
      INSERT INTO orcamentos (
        numero, "nomeCliente", telefone, produto, quantidade, modelo, cores,
        personalizacao, configuracao, prazo, "valorUnitario", "valorTotal", "valorSinal",
        observacoes, "dataCriacao", status,
        "tipoPagamento", "chavePix", "nomeRecebedor", "tipoEntrega", "observacoesEntrega"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const info = await stmt.run(
      numero,
      String(body.nomeCliente || "").trim(),
      String(body.telefone || "").trim(),
      String(body.produto || "").trim(),
      Number(body.quantidade),
      String(body.modelo || "").trim(),
      String(body.cores || "").trim(),
      String(body.personalizacao || "").trim(),
      String(body.configuracao || "").trim(),
      String(body.prazo || "").trim(),
      Number(body.valorUnitario),
      valorTotal,
      valorSinal,
      String(body.observacoes || "").trim(),
      now,
      status,
      String(body.tipoPagamento || "").trim(),
      String(body.chavePix || "").trim(),
      String(body.nomeRecebedor || "").trim(),
      String(body.tipoEntrega || "").trim(),
      String(body.observacoesEntrega || "").trim()
    );
    const newId = info.lastInsertRowid;
    const { criado, pedido } = await garantirPedidoParaOrcamentoAprovado(newId);
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(newId);
    const out = mapOrcamentoRow(row);
    if (criado && pedido) {
      out.pedidoCriadoAutomaticamente = pedido;
    }
    res.status(201).json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateOrcamento(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Orçamento não encontrado" });
    if (existing.status === "APROVADO") {
      return res.status(400).json({ error: "Orçamento aprovado não pode ser editado" });
    }

    const body = req.body || {};
    const errs = validateOrcamentoBody(
      {
        nomeCliente: body.nomeCliente ?? existing.nomeCliente,
        quantidade: body.quantidade ?? existing.quantidade,
        valorUnitario: body.valorUnitario ?? existing.valorUnitario,
        status: body.status ?? existing.status,
      },
      true
    );
    if (errs.length) return res.status(400).json({ errors: errs });

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
      valorUnitario: body.valorUnitario !== undefined ? body.valorUnitario : existing.valorUnitario,
      observacoes: body.observacoes !== undefined ? body.observacoes : existing.observacoes,
      status: body.status !== undefined ? body.status : existing.status,
      tipoPagamento:
        body.tipoPagamento !== undefined ? body.tipoPagamento : existing.tipoPagamento ?? "",
      chavePix: body.chavePix !== undefined ? body.chavePix : existing.chavePix ?? "",
      nomeRecebedor:
        body.nomeRecebedor !== undefined ? body.nomeRecebedor : existing.nomeRecebedor ?? "",
      tipoEntrega: body.tipoEntrega !== undefined ? body.tipoEntrega : existing.tipoEntrega ?? "",
      observacoesEntrega:
        body.observacoesEntrega !== undefined
          ? body.observacoesEntrega
          : existing.observacoesEntrega ?? "",
    };
    if (merged.status && !ALLOWED_STATUS.includes(merged.status)) {
      return res.status(400).json({ error: "status inválido" });
    }

    const { valorTotal, valorSinal } = calcOrcamentoRow({
      quantidade: merged.quantidade,
      valorUnitario: merged.valorUnitario,
    });

    await db
      .prepare(`
      UPDATE orcamentos SET
        "nomeCliente" = ?, telefone = ?, produto = ?, quantidade = ?, modelo = ?, cores = ?,
        personalizacao = ?, configuracao = ?, prazo = ?, "valorUnitario" = ?, "valorTotal" = ?, "valorSinal" = ?,
        observacoes = ?, status = ?,
        "tipoPagamento" = ?, "chavePix" = ?, "nomeRecebedor" = ?, "tipoEntrega" = ?, "observacoesEntrega" = ?
      WHERE id = ?
    `)
      .run(
        String(merged.nomeCliente || "").trim(),
        String(merged.telefone || "").trim(),
        String(merged.produto || "").trim(),
        Number(merged.quantidade),
        String(merged.modelo || "").trim(),
        String(merged.cores || "").trim(),
        String(merged.personalizacao || "").trim(),
        String(merged.configuracao || "").trim(),
        String(merged.prazo || "").trim(),
        Number(merged.valorUnitario),
        valorTotal,
        valorSinal,
        String(merged.observacoes || "").trim(),
        merged.status,
        String(merged.tipoPagamento || "").trim(),
        String(merged.chavePix || "").trim(),
        String(merged.nomeRecebedor || "").trim(),
        String(merged.tipoEntrega || "").trim(),
        String(merged.observacoesEntrega || "").trim(),
        id
      );

    const { criado, pedido } = await garantirPedidoParaOrcamentoAprovado(id);
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(id);
    const out = mapOrcamentoRow(row);
    if (criado && pedido) {
      out.pedidoCriadoAutomaticamente = pedido;
    }
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteOrcamento(req, res) {
  try {
    const id = req.params.id;
    const existing = await db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Orçamento não encontrado" });
    const pedido = await db.prepare('SELECT id FROM pedidos WHERE "orcamentoId" = ?').get(id);
    if (pedido) {
      return res.status(400).json({ error: "Não é possível excluir: já existe pedido vinculado" });
    }
    await db.prepare("DELETE FROM orcamentos WHERE id = ?").run(id);
    res.status(204).send();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function converterEmPedido(req, res) {
  try {
    const id = Number(req.params.id);
    const o = await db.prepare("SELECT * FROM orcamentos WHERE id = ?").get(id);
    if (!o) return res.status(404).json({ error: "Orçamento não encontrado" });
    if (o.status !== "APROVADO") {
      return res.status(400).json({ error: "Apenas orçamentos aprovados podem virar pedido" });
    }
    const { criado, pedido } = await garantirPedidoParaOrcamentoAprovado(id);
    if (!pedido) {
      return res.status(500).json({ error: "Não foi possível criar o pedido" });
    }
    res.status(criado ? 201 : 200).json(pedido);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
