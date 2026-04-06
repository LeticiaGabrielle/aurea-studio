import initSqlJs from "sql.js";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Resolvidos em init(); podem mudar se DATA_DIR/SQLITE_PATH não forem graváveis (ex.: /data sem disco no Render). */
let dataDir = process.env.DATA_DIR || __dirname;
let dbPath = process.env.SQLITE_PATH || path.join(dataDir, "app.db");

let innerDb;

function persist() {
  const data = innerDb.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

/**
 * API semelhante ao better-sqlite3 para manter controllers simples.
 * Persiste o ficheiro SQLite após cada escrita.
 */
export const db = {
  prepare(sql) {
    return {
      run(...params) {
        innerDb.run(sql, params);
        const lidStmt = innerDb.prepare("SELECT last_insert_rowid() AS id");
        lidStmt.step();
        const lid = lidStmt.getAsObject().id;
        lidStmt.free();
        const chStmt = innerDb.prepare("SELECT changes() AS c");
        chStmt.step();
        const changes = chStmt.getAsObject().c;
        chStmt.free();
        persist();
        return { lastInsertRowid: lid, changes };
      },
      get(...params) {
        const stmt = innerDb.prepare(sql);
        stmt.bind(params);
        if (!stmt.step()) {
          stmt.free();
          return undefined;
        }
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      },
      all(...params) {
        const stmt = innerDb.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) rows.push(stmt.getAsObject());
        stmt.free();
        return rows;
      },
    };
  },
};

function ensureDbDirectory() {
  const dir = path.dirname(dbPath);
  if (fs.existsSync(dir)) return;
  try {
    fs.mkdirSync(dir, { recursive: true });
  } catch (e) {
    const noAccess = e && (e.code === "EACCES" || e.code === "EPERM");
    const triedCustom =
      (process.env.DATA_DIR && dir.startsWith(path.resolve(process.env.DATA_DIR))) ||
      (process.env.SQLITE_PATH && path.isAbsolute(process.env.SQLITE_PATH));
    if (noAccess && triedCustom) {
      console.warn(
        `[db] Sem permissão para criar "${dir}". ` +
          "No Render, monte um Persistent Disk neste caminho ou remova DATA_DIR / SQLITE_PATH. " +
          `A usar ${path.join(__dirname, "app.db")} (gravável; sem disco, dados perdem-se no redeploy).`
      );
      dataDir = __dirname;
      dbPath = path.join(__dirname, "app.db");
      return;
    }
    throw e;
  }
}

export async function init() {
  ensureDbDirectory();

  const wasmDir = path.join(__dirname, "node_modules", "sql.js", "dist");
  const SQL = await initSqlJs({
    locateFile: (file) => path.join(wasmDir, file),
  });

  if (fs.existsSync(dbPath)) {
    innerDb = new SQL.Database(new Uint8Array(fs.readFileSync(dbPath)));
  } else {
    innerDb = new SQL.Database();
  }

  innerDb.run("PRAGMA foreign_keys = ON;");
  innerDb.exec(`
    CREATE TABLE IF NOT EXISTS sequence (
      key TEXT PRIMARY KEY,
      next_val INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS orcamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      nomeCliente TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      produto TEXT NOT NULL DEFAULT '',
      quantidade REAL NOT NULL DEFAULT 1,
      modelo TEXT NOT NULL DEFAULT '',
      cores TEXT NOT NULL DEFAULT '',
      personalizacao TEXT NOT NULL DEFAULT '',
      configuracao TEXT NOT NULL DEFAULT '',
      prazo TEXT NOT NULL DEFAULT '',
      valorUnitario REAL NOT NULL DEFAULT 0,
      valorTotal REAL NOT NULL DEFAULT 0,
      valorSinal REAL NOT NULL DEFAULT 0,
      observacoes TEXT NOT NULL DEFAULT '',
      dataCriacao TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'RASCUNHO',
      tipoPagamento TEXT NOT NULL DEFAULT '',
      chavePix TEXT NOT NULL DEFAULT '',
      nomeRecebedor TEXT NOT NULL DEFAULT '',
      tipoEntrega TEXT NOT NULL DEFAULT '',
      observacoesEntrega TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS pedidos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      numero TEXT NOT NULL UNIQUE,
      orcamentoId INTEGER NOT NULL UNIQUE,
      nomeCliente TEXT NOT NULL DEFAULT '',
      telefone TEXT NOT NULL DEFAULT '',
      produto TEXT NOT NULL DEFAULT '',
      quantidade REAL NOT NULL DEFAULT 1,
      modelo TEXT NOT NULL DEFAULT '',
      cores TEXT NOT NULL DEFAULT '',
      personalizacao TEXT NOT NULL DEFAULT '',
      configuracao TEXT NOT NULL DEFAULT '',
      prazo TEXT NOT NULL DEFAULT '',
      valorTotal REAL NOT NULL DEFAULT 0,
      valorSinal REAL NOT NULL DEFAULT 0,
      valorPago REAL NOT NULL DEFAULT 0,
      custo REAL NOT NULL DEFAULT 0,
      lucro REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'PENDENTE',
      tipoPagamento TEXT NOT NULL DEFAULT '',
      chavePix TEXT NOT NULL DEFAULT '',
      nomeRecebedor TEXT NOT NULL DEFAULT '',
      tipoEntrega TEXT NOT NULL DEFAULT '',
      observacoesEntrega TEXT NOT NULL DEFAULT '',
      observacoes TEXT NOT NULL DEFAULT '',
      registroPagamento TEXT NOT NULL DEFAULT 'A_COBRAR',
      dataCriacao TEXT NOT NULL,
      dataAtualizacao TEXT NOT NULL
    );
  `);
  migratePedidosRegistroPagamento();
  migrateOrcamentosPdfExtras();
  persist();
}

/** Bases antigas sem campos de pagamento/entrega no PDF do orçamento. */
function migrateOrcamentosPdfExtras() {
  const cols = db.prepare("PRAGMA table_info(orcamentos)").all();
  const names = new Set(cols.map((c) => c.name));
  const add = (name, ddl) => {
    if (!names.has(name)) {
      db.prepare(`ALTER TABLE orcamentos ADD COLUMN ${name} ${ddl}`).run();
      names.add(name);
    }
  };
  add("tipoPagamento", "TEXT NOT NULL DEFAULT ''");
  add("chavePix", "TEXT NOT NULL DEFAULT ''");
  add("nomeRecebedor", "TEXT NOT NULL DEFAULT ''");
  add("tipoEntrega", "TEXT NOT NULL DEFAULT ''");
  add("observacoesEntrega", "TEXT NOT NULL DEFAULT ''");
}

/** Bases antigas sem a coluna de controlo interno de cobrança. */
function migratePedidosRegistroPagamento() {
  const cols = db.prepare("PRAGMA table_info(pedidos)").all();
  const has = cols.some((c) => c.name === "registroPagamento");
  if (!has) {
    db.prepare(
      "ALTER TABLE pedidos ADD COLUMN registroPagamento TEXT NOT NULL DEFAULT 'A_COBRAR'"
    ).run();
  }
}

export function nextNumber(prefix, key) {
  const row = db.prepare("SELECT next_val FROM sequence WHERE key = ?").get(key);
  if (!row) {
    db.prepare("INSERT INTO sequence (key, next_val) VALUES (?, 2)").run(key);
    return `${prefix}-0001`;
  }
  const n = row.next_val;
  db.prepare("UPDATE sequence SET next_val = next_val + 1 WHERE key = ?").run(key);
  return `${prefix}-${String(n).padStart(4, "0")}`;
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
