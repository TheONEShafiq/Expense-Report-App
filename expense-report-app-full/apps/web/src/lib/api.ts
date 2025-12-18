export const API_BASE = (import.meta as any).env?.VITE_API_URL || "http://localhost:3000";
async function request(method: string, path: string, body?: unknown) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    method,
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${url} failed: ${res.status}`);
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : (await res.text());
}
export const api = { get:(p:string)=>request("GET",p), post:(p:string,b?:unknown)=>request("POST",p,b), patch:(p:string,b?:unknown)=>request("PATCH",p,b) };
