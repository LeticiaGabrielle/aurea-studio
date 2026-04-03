import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import OrcamentosList from "./pages/OrcamentosList";
import OrcamentoForm from "./pages/OrcamentoForm";
import PedidosList from "./pages/PedidosList";
import PedidoForm from "./pages/PedidoForm";

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/orcamentos" element={<OrcamentosList />} />
        <Route path="/orcamentos/novo" element={<OrcamentoForm />} />
        <Route path="/orcamentos/:id/editar" element={<OrcamentoForm />} />
        <Route path="/pedidos" element={<PedidosList />} />
        <Route path="/pedidos/:id" element={<PedidoForm />} />
      </Route>
    </Routes>
  );
}
