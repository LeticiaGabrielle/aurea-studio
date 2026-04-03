/** Caminho público da logo (também referenciada no PDF). */
export const BRAND_LOGO_SRC = "/logo-aurea-studio-3d.png";

export const BRAND_NAME = "AUREA STUDIO 3D";

export default function BrandLogo({ className = "", imgClassName = "h-12 w-auto max-h-14" }) {
  return (
    <img
      src={BRAND_LOGO_SRC}
      alt={BRAND_NAME}
      className={`object-contain object-left ${imgClassName} ${className}`}
    />
  );
}
