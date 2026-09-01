import { db } from "../db.js";
import { mapOrcamentoItemRow } from "../models/orcamentoItemModel.js";

export function calcItemTotals(quantidade, valorUnitario) {
  const q = Number(quantidade) || 0;
  const vu = Number(valorUnitario) || 0;
  const valorTotal = Math.round(q * vu * 100) / 100;
  return { quantidade: q, valorUnitario: vu, valorTotal };
}

export function calcOrcamentoTotalsFromItens(itens) {
  const valorTotal = Math.round(
    itens.reduce((sum, item) => sum + (Number(item.valorTotal) || 0), 0) * 100
  ) / 100;
  const valorSinal = Math.round(valorTotal * 0.5 * 100) / 100;
  return { valorTotal, valorSinal };
}

export function normalizeOrcamentoItem(raw, ordem = 0) {
  const { quantidade, valorUnitario, valorTotal } = calcItemTotals(
    raw.quantidade,
    raw.valorUnitario
  );
  return {
    ordem,
    produto: String(raw.produto ?? "").trim(),
    quantidade,
    modelo: String(raw.modelo ?? "").trim(),
    cores: String(raw.cores ?? "").trim(),
    personalizacao: String(raw.personalizacao ?? "").trim(),
    configuracao: String(raw.configuracao ?? "").trim(),
    prazo: String(raw.prazo ?? "").trim(),
    valorUnitario,
    valorTotal,
  };
}

/** Campos legados em `orcamentos` (lista, busca, pedido). */
export function legacyFieldsFromItens(itens) {
  const normalized = itens.map((item, i) => normalizeOrcamentoItem(item, i));
  const { valorTotal, valorSinal } = calcOrcamentoTotalsFromItens(normalized);
  const first = normalized[0];
  const produto =
    normalized.length === 1
      ? first.produto
      : `${first.produto || "Produtos"} (+${normalized.length - 1} ${
          normalized.length === 2 ? "item" : "itens"
        })`;
  const quantidade = normalized.reduce((s, i) => s + i.quantidade, 0);
  return {
    produto,
    quantidade,
    modelo: first.modelo,
    cores: first.cores,
    personalizacao: first.personalizacao,
    configuracao: first.configuracao,
    prazo: first.prazo,
    valorUnitario: first.valorUnitario,
    valorTotal,
    valorSinal,
  };
}

export function validateOrcamentoItens(itens) {
  const errors = [];
  if (!Array.isArray(itens) || itens.length === 0) {
    errors.push("Adicione pelo menos um produto ao orçamento");
    return errors;
  }
  itens.forEach((item, idx) => {
    const n = idx + 1;
    if (!String(item.produto ?? "").trim()) {
      errors.push(`Produto ${n}: informe o nome do produto`);
    }
    const q = Number(item.quantidade);
    if (!q || q <= 0) errors.push(`Produto ${n}: quantidade deve ser maior que 0`);
    const vu = Number(item.valorUnitario);
    if (!vu || vu <= 0) errors.push(`Produto ${n}: valor unitário deve ser maior que 0`);
  });
  return errors;
}

export async function loadItensByOrcamentoId(orcamentoId) {
  const rows = await db
    .prepare(
      `SELECT * FROM orcamento_itens WHERE "orcamentoId" = ? ORDER BY ordem ASC, id ASC`
    )
    .all(orcamentoId);
  return rows.map(mapOrcamentoItemRow);
}

export async function loadItensByOrcamentoIds(ids) {
  if (!ids.length) return new Map();
  const placeholders = ids.map(() => "?").join(",");
  const rows = await db
    .prepare(
      `SELECT * FROM orcamento_itens WHERE "orcamentoId" IN (${placeholders}) ORDER BY "orcamentoId", ordem ASC, id ASC`
    )
    .all(...ids);
  const map = new Map();
  for (const row of rows) {
    const item = mapOrcamentoItemRow(row);
    const list = map.get(item.orcamentoId) ?? [];
    list.push(item);
    map.set(item.orcamentoId, list);
  }
  return map;
}

export function itemFromLegacyOrcamentoRow(row) {
  return normalizeOrcamentoItem(
    {
      produto: row.produto,
      quantidade: row.quantidade,
      modelo: row.modelo,
      cores: row.cores,
      personalizacao: row.personalizacao,
      configuracao: row.configuracao,
      prazo: row.prazo,
      valorUnitario: row.valorUnitario,
    },
    0
  );
}

/** Itens para resposta da API sem gravar na base (lista). */
export function itensForOrcamentoRow(row, itensMap) {
  const fromDb = itensMap?.get(row.id);
  if (fromDb?.length) return fromDb;
  if (row.produto) {
    const legacy = itemFromLegacyOrcamentoRow(row);
    return [{ ...legacy, id: null, orcamentoId: row.id }];
  }
  return [];
}

export async function ensureItensForOrcamento(row) {
  let itens = await loadItensByOrcamentoId(row.id);
  if (itens.length === 0 && row.produto) {
    const legacy = itemFromLegacyOrcamentoRow(row);
    await insertItens(row.id, [legacy]);
    itens = await loadItensByOrcamentoId(row.id);
  }
  return itens;
}

export async function insertItens(orcamentoId, itens) {
  const stmt = db.prepare(`
    INSERT INTO orcamento_itens (
      "orcamentoId", ordem, produto, quantidade, modelo, cores,
      personalizacao, configuracao, prazo, "valorUnitario", "valorTotal"
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)
  `);
  for (let i = 0; i < itens.length; i++) {
    const item = normalizeOrcamentoItem(itens[i], i);
    await stmt.run(
      orcamentoId,
      item.ordem,
      item.produto,
      item.quantidade,
      item.modelo,
      item.cores,
      item.personalizacao,
      item.configuracao,
      item.prazo,
      item.valorUnitario,
      item.valorTotal
    );
  }
}

export async function replaceItens(orcamentoId, itens) {
  await db.prepare('DELETE FROM orcamento_itens WHERE "orcamentoId" = ?').run(orcamentoId);
  await insertItens(orcamentoId, itens);
}

export function formatItensResumoPedido(itens) {
  if (!itens.length) return "";
  if (itens.length === 1) return itens[0].produto;
  return itens.map((item, i) => `${i + 1}. ${item.produto}`).join("; ");
}

export function formatItensDetalhePedido(itens) {
  return itens
    .map((item, i) => {
      const lines = [
        `Item ${i + 1}: ${item.produto}`,
        `Qtd: ${item.quantidade} · Total: R$ ${Number(item.valorTotal).toFixed(2)}`,
      ];
      if (item.modelo) lines.push(`Modelo: ${item.modelo}`);
      if (item.cores) lines.push(`Cores: ${item.cores}`);
      if (item.personalizacao) lines.push(`Personalização: ${item.personalizacao}`);
      if (item.configuracao) lines.push(`Configuração: ${item.configuracao}`);
      if (item.prazo) lines.push(`Prazo: ${item.prazo}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
