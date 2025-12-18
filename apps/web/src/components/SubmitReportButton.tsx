import React, { useState } from "react";
import { api } from "../lib/api";
import { useToast } from "./toast/ToastProvider";

type SubmitResp = { ok: boolean; emailNotified?: boolean };

export const SubmitReportButton: React.FC<{ reportId: number; className?: string }> = ({ reportId, className }) => {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    try {
      setLoading(true);
      const resp = (await api.post(`/reports/${reportId}/submit`)) as SubmitResp;
      if (resp?.emailNotified) {
        push({ title: "Submitted", description: "We emailed your approver to review.", variant: "success" });
      } else {
        push({ title: "Submitted", description: "We emailed your approver to review.", variant: "success" });
      }
    } catch (e) {
      push({ title: "Submit failed", description: String(e), variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={onSubmit}
      disabled={loading}
      className={
        `inline-flex items-center justify-center px-4 h-10 rounded-2xl border ` +
        `bg-[#1E242B] border-[#2B323A] text-[#E6E8EB] hover:bg-[#222831] ` +
        `disabled:opacity-60 ${className ?? ""}`
      }
    >
      {loading ? "Submitting…" : "Submit Report"}
    </button>
  );
};
