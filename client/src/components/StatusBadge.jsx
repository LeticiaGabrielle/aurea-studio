const ORCAMENTO_STYLES = {
  RASCUNHO: "bg-slate-200 text-slate-800",
  ENVIADO: "bg-blue-100 text-blue-800",
  APROVADO: "bg-green-100 text-green-800",
  RECUSADO: "bg-red-100 text-red-800",
};

const PEDIDO_STYLES = {
  PENDENTE: "bg-amber-100 text-amber-900",
  SINAL_PAGO: "bg-sky-100 text-sky-800",
  PAGO: "bg-emerald-800 text-white",
  FINALIZADO: "bg-slate-700 text-white",
  CANCELADO: "bg-red-100 text-red-800",
};

const LABELS = {
  RASCUNHO: "Rascunho",
  ENVIADO: "Enviado",
  APROVADO: "Aprovado",
  RECUSADO: "Recusado",
  PENDENTE: "Pendente",
  SINAL_PAGO: "Sinal pago",
  PAGO: "Pago",
  FINALIZADO: "Finalizado",
  CANCELADO: "Cancelado",
};

export default function StatusBadge({ status, type = "orcamento" }) {
  const map = type === "pedido" ? PEDIDO_STYLES : ORCAMENTO_STYLES;
  const cls = map[status] || "bg-slate-100 text-slate-700";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {LABELS[status] || status}
    </span>
  );
}
