import React from "react";
import { useToast } from "./ToastProvider";

export const Toaster: React.FC = () => {
  const { toasts, remove } = useToast();
  return (
    <div className="fixed z-50 bottom-4 right-4 flex flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "w-80 p-4 rounded-2xl shadow-xl border " +
            "bg-[#151A1F]/95 border-[#2B323A] backdrop-blur " +
            (t.variant === "success"
              ? " ring-1 ring-green-500/20"
              : t.variant === "error"
              ? " ring-1 ring-red-500/20"
              : " ring-1 ring-[#5A6B7A]/20")
          }
        >
          <div className="flex items-start gap-3">
            <div
              className="mt-1 h-2.5 w-2.5 rounded-full "
              style={{ background: t.variant === "success" ? "#10B981" : t.variant === "error" ? "#EF4444" : "#5A6B7A" }}
            />
            <div className="flex-1">
              {t.title && <div className="text-[#E6E8EB] font-semibold text-sm">{t.title}</div>}
              {t.description && <div className="text-[#A7B0B8] text-sm mt-0.5">{t.description}</div>}
            </div>
            <button
              aria-label="Dismiss"
              className="text-[#A7B0B8] hover:text-[#E6E8EB]"
              onClick={() => remove(t.id)}
            >
              ×
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
