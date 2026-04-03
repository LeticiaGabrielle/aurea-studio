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
  deletePedido,
} from "./controllers/pedidoController.js";
import { getDashboard } from "./controllers/dashboardController.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

await init();

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

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/orcamentos", listOrcamentos);
app.get("/api/orcamentos/:id", getOrcamento);
app.post("/api/orcamentos", createOrcamento);
app.put("/api/orcamentos/:id", updateOrcamento);
app.delete("/api/orcamentos/:id", deleteOrcamento);
app.post("/api/orcamentos/:id/converter-pedido", converterEmPedido);

app.get("/api/pedidos", listPedidos);
app.get("/api/pedidos/:id", getPedido);
app.put("/api/pedidos/:id", updatePedido);
app.patch("/api/pedidos/:id/status", patchPedidoStatus);
app.delete("/api/pedidos/:id", deletePedido);

app.get("/api/dashboard", getDashboard);

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
