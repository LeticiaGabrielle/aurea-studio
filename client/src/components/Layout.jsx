import { NavLink, Outlet } from "react-router-dom";
import BrandLogo, { BRAND_NAME } from "./BrandLogo";

const linkClass = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium transition ${
    isActive
      ? "bg-aurea-navy text-white"
      : "text-aurea-navy/80 hover:bg-slate-100 hover:text-aurea-navy"
  }`;

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:py-4">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <BrandLogo imgClassName="h-11 w-auto max-h-[52px] sm:h-14 sm:max-h-14" />
            <div className="min-w-0 border-l border-slate-200 pl-3">
              <p className="truncate text-sm font-bold tracking-tight text-aurea-navy sm:text-base">
                {BRAND_NAME}
              </p>
              <p className="truncate text-xs text-slate-500">Orçamentos e pedidos</p>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1">
            <NavLink to="/" end className={linkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/orcamentos" className={linkClass}>
              Orçamentos
            </NavLink>
            <NavLink to="/pedidos" className={linkClass}>
              Pedidos
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        <Outlet />
      </main>
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        <span className="font-semibold text-aurea-navy">{BRAND_NAME}</span>
        <span className="text-slate-400"> · </span>
        Produtos personalizados · impressão 3D, NFC e mais
      </footer>
    </div>
  );
}
