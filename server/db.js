import { initSqlJs, sqlJsDb, nextNumberSqlJs } from "./db-sqljs.js";
import { initPg, preparePg, nextNumberPg } from "./db-pg.js";

let mode = "sqljs";

export async function init() {
  if (process.env.DATABASE_URL?.trim()) {
    mode = "pg";
    await initPg();
  } else {
    mode = "sqljs";
    await initSqlJs();
  }
}

/**
 * API unificada assíncrona: prepare().run/get/all devolvem Promise.
 */
export const db = {
  prepare(sql) {
    if (mode === "pg") {
      return preparePg(sql);
    }
    const stmt = sqlJsDb.prepare(sql);
    return {
      run: (...params) => Promise.resolve(stmt.run(...params)),
      get: (...params) => Promise.resolve(stmt.get(...params)),
      all: (...params) => Promise.resolve(stmt.all(...params)),
    };
  },
};

export async function nextNumber(prefix, key) {
  if (mode === "pg") return nextNumberPg(prefix, key);
  return nextNumberSqlJs(prefix, key);
}

export function calcOrcamentoRow(body) {
  const q = Number(body.quantidade) || 0;
  const vu = Number(body.valorUnitario) || 0;
  const valorTotal = Math.round(q * vu * 100) / 100;
  const valorSinal = Math.round(valorTotal * 0.5 * 100) / 100;
  return { valorTotal, valorSinal };
}

export function calcPedidoLucro(valorTotal, custo) {
  const vt = Number(valorTotal) || 0;
  const c = Number(custo) || 0;
  return Math.round((vt - c) * 100) / 100;
}
