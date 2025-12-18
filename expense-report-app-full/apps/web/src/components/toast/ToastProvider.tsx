import React, { createContext, useContext, useState, useCallback } from "react";
type Toast = { id: string; title?: string; description?: string; variant?: "success"|"error"|"info"; timeoutMs?: number };
type ToastCtx = { push:(t:Omit<Toast,"id">)=>void; remove:(id:string)=>void; toasts:Toast[] };
const Ctx = createContext<ToastCtx | null>(null);
export function useToast(){ const ctx = useContext(Ctx); if(!ctx) throw new Error("useToast must be inside <ToastProvider>"); return ctx; }
export const ToastProvider: React.FC<{children:React.ReactNode}> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const remove = useCallback((id:string)=> setToasts(arr => arr.filter(t=>t.id!==id)), []);
  const push = useCallback((t:Omit<Toast,"id">)=>{ const id = Math.random().toString(36).slice(2); const toast:Toast = { timeoutMs:4200, variant:"info", ...t, id }; setToasts(arr=>[...arr, toast]); if(toast.timeoutMs) setTimeout(()=>remove(id), toast.timeoutMs); }, [remove]);
  return <Ctx.Provider value={{ push, remove, toasts }}>{children}</Ctx.Provider>;
};
