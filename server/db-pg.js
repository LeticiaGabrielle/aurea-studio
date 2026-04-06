import pg from "pg";

let pool;

/** node-pg pode devolver chaves em minúsculas; os modelos esperam camelCase como no SQLite. */
const PG_KEY_FIX = {
  nomecliente: "nomeCliente",
  valorunitario: "valorUnitario",
  valortotal: "valorTotal",
  valorsinal: "valorSinal",
  datacriacao: "dataCriacao",
  tipopagamento: "tipoPagamento",
  chavepix: "chavePix",
  nomerecebedor: "nomeRecebedor",
  tipoentrega: "tipoEntrega",
  observacoesentrega: "observacoesEntrega",
  orcamentoid: "orcamentoId",
  valorpago: "valorPago",
  dataatualizacao: "dataAtualizacao",
  registropagamento: "registroPagamento",
  possuipedido: "possuiPedido",
};

function normalizePgRow(row) {
  if (!row || typeof row !== "object") return row;
  const out = { ...row };
  for (const [lower, camel] of Object.entries(PG_KEY_FIX)) {
    if (Object.prototype.hasOwnProperty.call(row, lower) && !Object.prototype.hasOwnProperty.call(row, camel)) {
      out[camel] = row[lower];
    }
    if (Object.prototype.hasOwnProperty.call(out, lower)) delete out[lower];
  }
  return out;
}

function toPgSql(sql) {
  let n = 0;
  return sql.replace(/\?/g, () => `$${++n}`);
}

/** INSERT com id SERIAL devolve lastInsertRowid; seq_counter não. */
function augmentInsertReturning(sql) {
  const t = sql.trim();
  if (!/^\s*INSERT/i.test(t)) return toPgSql(sql);
  if (/RETURNING/i.test(t)) return toPgSql(sql);
  if (/INSERT\s+INTO\s+seq_counter/i.test(t)) return toPgSql(sql);
  return `${toPgSql(sql)} RETURNING id`;
}

export function preparePg(sql) {
  return {
    run(...params) {
      const text = augmentInsertReturning(sql);
      const plain = toPgSql(sql);
      const useReturning = text !== plain;
      return pool.query(useReturning ? text : plain, params).then((r) => {
        const id = r.rows?.[0]?.id;
        return {
          lastInsertRowid: id != null ? Number(id) : null,
          changes: r.rowCount ?? 0,
        };
      });
    },
    get(...params) {
      return pool
        .query(toPgSql(sql), params)
        .then((r) => normalizePgRow(r.rows[0]));
    },
    all(...params) {
      return pool
        .query(toPgSql(sql), params)
        .then((r) => r.rows.map(normalizePgRow));
    },
  };
}

export async function nextNumberPg(prefix, key) {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const sel = await c.query(
      "SELECT next_val FROM seq_counter WHERE key = $1 FOR UPDATE",
      [key]
    );
    if (sel.rowCount === 0) {
      await c.query("INSERT INTO seq_counter (key, next_val) VALUES ($1, 2)", [key]);
      await c.query("COMMIT");
      return `${prefix}-0001`;
    }
    const n = sel.rows[0].next_val;
    await c.query("UPDATE seq_counter SET next_val = next_val + 1 WHERE key = $1", [key]);
    await c.query("COMMIT");
    return `${prefix}-${String(n).padStart(4, "0")}`;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

const DDL = `
CREATE TABLE IF NOT EXISTS seq_counter (
  key TEXT PRIMARY KEY,
  next_val INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orcamentos (
  id SERIAL PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  "nomeCliente" TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  produto TEXT NOT NULL DEFAULT '',
  quantidade DOUBLE PRECISION NOT NULL DEFAULT 1,
  modelo TEXT NOT NULL DEFAULT '',
  cores TEXT NOT NULL DEFAULT '',
  personalizacao TEXT NOT NULL DEFAULT '',
  configuracao TEXT NOT NULL DEFAULT '',
  prazo TEXT NOT NULL DEFAULT '',
  "valorUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorSinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  observacoes TEXT NOT NULL DEFAULT '',
  "dataCriacao" TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RASCUNHO',
  "tipoPagamento" TEXT NOT NULL DEFAULT '',
  "chavePix" TEXT NOT NULL DEFAULT '',
  "nomeRecebedor" TEXT NOT NULL DEFAULT '',
  "tipoEntrega" TEXT NOT NULL DEFAULT '',
  "observacoesEntrega" TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS pedidos (
  id SERIAL PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  "orcamentoId" INTEGER NOT NULL UNIQUE,
  "nomeCliente" TEXT NOT NULL DEFAULT '',
  telefone TEXT NOT NULL DEFAULT '',
  produto TEXT NOT NULL DEFAULT '',
  quantidade DOUBLE PRECISION NOT NULL DEFAULT 1,
  modelo TEXT NOT NULL DEFAULT '',
  cores TEXT NOT NULL DEFAULT '',
  personalizacao TEXT NOT NULL DEFAULT '',
  configuracao TEXT NOT NULL DEFAULT '',
  prazo TEXT NOT NULL DEFAULT '',
  "valorTotal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorSinal" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "valorPago" DOUBLE PRECISION NOT NULL DEFAULT 0,
  custo DOUBLE PRECISION NOT NULL DEFAULT 0,
  lucro DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDENTE',
  "tipoPagamento" TEXT NOT NULL DEFAULT '',
  "chavePix" TEXT NOT NULL DEFAULT '',
  "nomeRecebedor" TEXT NOT NULL DEFAULT '',
  "tipoEntrega" TEXT NOT NULL DEFAULT '',
  "observacoesEntrega" TEXT NOT NULL DEFAULT '',
  observacoes TEXT NOT NULL DEFAULT '',
  "registroPagamento" TEXT NOT NULL DEFAULT 'A_COBRAR',
  "dataCriacao" TEXT NOT NULL,
  "dataAtualizacao" TEXT NOT NULL
);
`;

async function ensurePedidosRegistroPagamento() {
  try {
    await pool.query(
      `ALTER TABLE pedidos ADD COLUMN "registroPagamento" TEXT NOT NULL DEFAULT 'A_COBRAR'`
    );
  } catch (e) {
    if (e.code !== "42701") throw e;
  }
}

async function ensureOrcamentosPdfExtras() {
  const cols = ["tipoPagamento", "chavePix", "nomeRecebedor", "tipoEntrega", "observacoesEntrega"];
  for (const col of cols) {
    try {
      await pool.query(
        `ALTER TABLE orcamentos ADD COLUMN "${col}" TEXT NOT NULL DEFAULT ''`
      );
    } catch (e) {
      if (e.code !== "42701") throw e;
    }
  }
}

export async function initPg() {
  const conn = process.env.DATABASE_URL;
  if (!conn) throw new Error("DATABASE_URL em falta");

  const local = /localhost|127\.0\.0\.1/i.test(conn);
  const useSsl =
    !local && process.env.DATABASE_SSL !== "false";

  pool = new pg.Pool({
    connectionString: conn,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
  });

  await pool.query(DDL);
  await ensurePedidosRegistroPagamento();
  await ensureOrcamentosPdfExtras();

  console.log("[db] PostgreSQL (DATABASE_URL) — dados persistem entre deploys.");
}

export function getPool() {
  return pool;
}
