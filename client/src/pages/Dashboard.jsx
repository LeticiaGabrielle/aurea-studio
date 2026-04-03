import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { formatMoney } from "../utils/format";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    api
      .get("/api/dashboard")
      .then(setStats)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
        {err}
      </div>
    );
  }

  if (!stats) {
    return <p className="text-slate-500">Carregando…</p>;
  }

  const cards = [
    { label: "Faturamento (pago / finalizado)", value: formatMoney(stats.faturamentoTotal), tone: "slate" },
    { label: "Total recebido (valor pago)", value: formatMoney(stats.totalRecebido), tone: "sky" },
    { label: "Lucro total", value: formatMoney(stats.lucroTotal), tone: "emerald" },
    { label: "Pedidos pendentes", value: String(stats.pedidosPendentes), tone: "amber" },
    { label: "Pedidos cancelados", value: String(stats.pedidosCancelados), tone: "red" },
  ];

  const toneRing = {
    slate: "ring-slate-200",
    sky: "ring-sky-200",
    emerald: "ring-emerald-200",
    amber: "ring-amber-200",
    red: "ring-red-200",
  };

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-600">Resumo financeiro e operacional</p>
        </div>
        <Link
          to="/orcamentos/novo"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          Novo orçamento
        </Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div
            key={c.label}
            className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ring-1 ${toneRing[c.tone]}`}
          >
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{c.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
