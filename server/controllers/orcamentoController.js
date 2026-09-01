import { db, nextNumber } from "../db.js";
import { mapOrcamentoRow } from "../models/orcamentoModel.js";
import { garantirPedidoParaOrcamentoAprovado } from "../services/pedidoFromOrcamento.js";
import {
  ensureItensForOrcamento,
  insertItens,
  itensForOrcamentoRow,
  legacyFieldsFromItens,
  loadItensByOrcamentoIds,
  normalizeOrcamentoItem,
  replaceItens,
  validateOrcamentoItens,
} from "../services/orcamentoItens.js";

const ALLOWED_STATUS = ["RASCUNHO", "ENVIADO", "APROVADO", "RECUSADO"];

const ORC_SELECT = `
  SELECT o.*, CASE WHEN EXISTS (SELECT 1 FROM pedidos p WHERE p."orcamentoId" = o.id) THEN 1 ELSE 0 END AS "possuiPedido"
  FROM orcamentos o
`;

function resolveItensFromBody(body) {
  if (Array.isArray(body.itens) && body.itens.length > 0) {
    return body.itens.map((item, i) => normalizeOrcamentoItem(item, i));
  }
  return [normalizeOrcamentoItem(body, 0)];
}

function mapOrcamentoWithItens(row, itensMap) {
  const base = mapOrcamentoRow(row);
  const itens = itensMap
    ? itensForOrcamentoRow(row, itensMap)
    : [];
  return { ...base, itens };
}

async function mapOrcamentoWithItensFull(row) {
  const base = mapOrcamentoRow(row);
  const itens = await ensureItensForOrcamento(row);
  return { ...base, itens };
}

function validateOrcamentoBody(body, partial) {
  const errors = [];
  if (!partial) {
    if (!body.nomeCliente || !String(body.nomeCliente).trim()) {
      errors.push("nomeCliente obrigatório");
    }
  }
  if (!partial || body.itens != null) {
    errors.push(...validateOrcamentoItens(resolveItensFromBody(body)));
  }
  if (body.status != null && !ALLOWED_STATUS.includes(body.status)) {
    errors.push("status inválido");
  }
  return errors;
}

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
      sql += ` AND (
        o."nomeCliente" LIKE ? OR o.telefone LIKE ? OR o.produto LIKE ? OR o.numero LIKE ?
        OR EXISTS (
          SELECT 1 FROM orcamento_itens i
          WHERE i."orcamentoId" = o.id
            AND (i.produto LIKE ? OR i.modelo LIKE ?)
        )
      )`;
      const q = `%${String(search).trim()}%`;
      params.push(q, q, q, q, q, q);
    }
    sql += " ORDER BY o.id DESC";
    const rows = await db.prepare(sql).all(...params);
    const itensMap = await loadItensByOrcamentoIds(rows.map((r) => r.id));
    const out = rows.map((r) => mapOrcamentoWithItens(r, itensMap));
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getOrcamento(req, res) {
  try {
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: "Orçamento não encontrado" });
    res.json(await mapOrcamentoWithItensFull(row));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function createOrcamento(req, res) {
  try {
    const body = req.body || {};
    const errs = validateOrcamentoBody(body, false);
    if (errs.length) return res.status(400).json({ errors: errs });

    const itens = resolveItensFromBody(body);
    const legacy = legacyFieldsFromItens(itens);
    const numero = await nextNumber("ORC", "orcamento");
    const now = new Date().toISOString();
    const status = body.status && ALLOWED_STATUS.includes(body.status) ? body.status : "RASCUNHO";

    const stmt = db.prepare(`
      INSERT INTO orcamentos (
        numero, "nomeCliente", telefone, produto, quantidade, modelo, cores,
        personalizacao, configuracao, prazo, "valorUnitario", "valorTotal", "valorSinal",
        observacoes, "dataCriacao", "dataAtualizacao", status,
        "tipoPagamento", "chavePix", "nomeRecebedor", "tipoEntrega", "observacoesEntrega"
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `);
    const info = await stmt.run(
      numero,
      String(body.nomeCliente || "").trim(),
      String(body.telefone || "").trim(),
      legacy.produto,
      legacy.quantidade,
      legacy.modelo,
      legacy.cores,
      legacy.personalizacao,
      legacy.configuracao,
      legacy.prazo,
      legacy.valorUnitario,
      legacy.valorTotal,
      legacy.valorSinal,
      String(body.observacoes || "").trim(),
      now,
      now,
      status,
      String(body.tipoPagamento || "").trim(),
      String(body.chavePix || "").trim(),
      String(body.nomeRecebedor || "").trim(),
      String(body.tipoEntrega || "").trim(),
      String(body.observacoesEntrega || "").trim()
    );
    const newId = info.lastInsertRowid;
    await insertItens(newId, itens);

    const { criado, pedido } = await garantirPedidoParaOrcamentoAprovado(newId);
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(newId);
    const out = await mapOrcamentoWithItensFull(row);
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
    const mergedBody = {
      ...body,
      nomeCliente: body.nomeCliente ?? existing.nomeCliente,
      itens:
        body.itens ??
        (await ensureItensForOrcamento(existing)).map((item) => ({
          produto: item.produto,
          quantidade: item.quantidade,
          modelo: item.modelo,
          cores: item.cores,
          personalizacao: item.personalizacao,
          configuracao: item.configuracao,
          prazo: item.prazo,
          valorUnitario: item.valorUnitario,
        })),
      status: body.status ?? existing.status,
    };
    const errs = validateOrcamentoBody(mergedBody, true);
    if (errs.length) return res.status(400).json({ errors: errs });

    const itens = resolveItensFromBody(mergedBody);
    const legacy = legacyFieldsFromItens(itens);
    const now = new Date().toISOString();

    await db
      .prepare(`
      UPDATE orcamentos SET
        "nomeCliente" = ?, telefone = ?, produto = ?, quantidade = ?, modelo = ?, cores = ?,
        personalizacao = ?, configuracao = ?, prazo = ?, "valorUnitario" = ?, "valorTotal" = ?, "valorSinal" = ?,
        observacoes = ?, status = ?, "dataAtualizacao" = ?,
        "tipoPagamento" = ?, "chavePix" = ?, "nomeRecebedor" = ?, "tipoEntrega" = ?, "observacoesEntrega" = ?
      WHERE id = ?
    `)
      .run(
        String(mergedBody.nomeCliente || "").trim(),
        String(body.telefone !== undefined ? body.telefone : existing.telefone ?? "").trim(),
        legacy.produto,
        legacy.quantidade,
        legacy.modelo,
        legacy.cores,
        legacy.personalizacao,
        legacy.configuracao,
        legacy.prazo,
        legacy.valorUnitario,
        legacy.valorTotal,
        legacy.valorSinal,
        String(body.observacoes !== undefined ? body.observacoes : existing.observacoes ?? "").trim(),
        mergedBody.status,
        now,
        String(body.tipoPagamento !== undefined ? body.tipoPagamento : existing.tipoPagamento ?? "").trim(),
        String(body.chavePix !== undefined ? body.chavePix : existing.chavePix ?? "").trim(),
        String(body.nomeRecebedor !== undefined ? body.nomeRecebedor : existing.nomeRecebedor ?? "").trim(),
        String(body.tipoEntrega !== undefined ? body.tipoEntrega : existing.tipoEntrega ?? "").trim(),
        String(
          body.observacoesEntrega !== undefined
            ? body.observacoesEntrega
            : existing.observacoesEntrega ?? ""
        ).trim(),
        id
      );

    await replaceItens(id, itens);

    const { criado, pedido } = await garantirPedidoParaOrcamentoAprovado(id);
    const row = await db.prepare(`${ORC_SELECT} WHERE o.id = ?`).get(id);
    const out = await mapOrcamentoWithItensFull(row);
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
    await db.prepare('DELETE FROM orcamento_itens WHERE "orcamentoId" = ?').run(id);
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
