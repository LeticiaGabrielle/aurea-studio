import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { init } from "./db.js";
import {
  listOrcamentos,
  getOrcamento,
  createOrcamento,
  updateOrcamento,
  deleteOrcamento,
  converterEmPedido,
} from "./controllers/orcamentoController.js";
import {
  listPedidos,
  getPedido,
  updatePedido,
  patchPedidoStatus,
  patchPedidoRegistroPagamento,
  deletePedido,
} from "./controllers/pedidoController.js";
import { getDashboard } from "./controllers/dashboardController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await init();

/** Express 4 não trata rejeições de handlers async. */
function asyncHandler(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((e) => {
      res.status(500).json({ error: e.message });
    });
  };
}

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(
  cors({
    origin: corsOrigin || true,
    credentials: true,
  })
);
app.use(express.json());

app.get("/api/health", (req, res) =>
  res.json({
    ok: true,
    db: process.env.DATABASE_URL?.trim() ? "postgresql" : "sqlite",
  })
);

app.get("/api/orcamentos", asyncHandler(listOrcamentos));
app.get("/api/orcamentos/:id", asyncHandler(getOrcamento));
app.post("/api/orcamentos", asyncHandler(createOrcamento));
app.put("/api/orcamentos/:id", asyncHandler(updateOrcamento));
app.delete("/api/orcamentos/:id", asyncHandler(deleteOrcamento));
app.post("/api/orcamentos/:id/converter-pedido", asyncHandler(converterEmPedido));

app.get("/api/pedidos", asyncHandler(listPedidos));
app.get("/api/pedidos/:id", asyncHandler(getPedido));
app.put("/api/pedidos/:id", asyncHandler(updatePedido));
app.patch("/api/pedidos/:id/status", asyncHandler(patchPedidoStatus));
app.patch("/api/pedidos/:id/registro-pagamento", asyncHandler(patchPedidoRegistroPagamento));
app.delete("/api/pedidos/:id", asyncHandler(deletePedido));

app.get("/api/dashboard", asyncHandler(getDashboard));

const clientDist = path.join(__dirname, "..", "client", "dist");
const isProd = process.env.NODE_ENV === "production";

if (isProd) {
  app.use(express.static(clientDist));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`API em http://localhost:${PORT}`);
});
