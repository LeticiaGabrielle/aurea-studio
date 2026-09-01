const base = import.meta.env.VITE_API_URL ?? "";

export function apiUrl(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

async function handle(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error(
        res.status === 500 && text.includes("Internal Server Error")
          ? "Servidor indisponível. Reinicie a API (npm run dev --prefix server) e tente de novo."
          : text.slice(0, 200) || res.statusText
      );
    }
  }
  if (!res.ok) {
    const msg = data?.error || data?.errors?.join?.(", ") || res.statusText;
    throw new Error(msg);
  }
  return data;
}

export const api = {
  get: (path) => fetch(apiUrl(path)).then(handle),
  post: (path, body) =>
    fetch(apiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle),
  put: (path, body) =>
    fetch(apiUrl(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle),
  patch: (path, body) =>
    fetch(apiUrl(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handle),
  delete: (path) =>
    fetch(apiUrl(path), { method: "DELETE" }).then(handle),
};
