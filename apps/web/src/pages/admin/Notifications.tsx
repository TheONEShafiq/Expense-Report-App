import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/toast/ToastProvider";

type EmailConfig = {
  provider: "smtp";
  host: string;
  port: number;
  username: string;
  fromAddress: string;
  // password is write-only from UI; server should not return it
};

export default function NotificationsAdminPage() {
  const { push } = useToast();
  const [config, setConfig] = useState<EmailConfig | null>(null);
  const [host, setHost] = useState("");
  const [port, setPort] = useState(587);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [testTo, setTestTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cfg = (await api.get("/admin/notifications/email-config")) as EmailConfig;
        setConfig(cfg);
        setHost(cfg.host || "");
        setPort(cfg.port || 587);
        setUsername(cfg.username || "");
        setFromAddress(cfg.fromAddress || "");
      } catch {
        // ignore if not ready
      }
    })();
  }, []);

  async function save() {
    try {
      setSaving(true);
      await api.put("/admin/notifications/email-config", {
        provider: "smtp",
        host,
        port,
        username,
        password, // write-only
        fromAddress,
      });
      push({ title: "Saved", description: "Email settings updated.", variant: "success" });
      setPassword("");
    } catch (e) {
      push({ title: "Save failed", description: String(e), variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function sendTest() {
    try {
      setTesting(true);
      await api.post("/admin/notifications/email/test", {
        to: testTo,
        subject: "Test email from Expense App",
        text: "This is a test email.",
      });
      push({ title: "Test sent", description: `Sent to ${testTo}`, variant: "success" });
    } catch (e) {
      push({ title: "Test failed", description: String(e), variant: "error" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-[#E6E8EB]">Notifications (Email)</h1>
      <p className="text-[#A7B0B8] mt-1">One‑way email alerts via SMTP. Replies are not processed.</p>

      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <label className="block">
            <span className="text-sm text-[#A7B0B8]">SMTP Host</span>
            <input
              className="mt-1 w-full h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              placeholder="smtp.sendprovider.com"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#A7B0B8]">SMTP Port</span>
            <input
              type="number"
              className="mt-1 w-full h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={port}
              onChange={(e) => setPort(Number(e.target.value))}
              placeholder="587"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#A7B0B8]">Username</span>
            <input
              className="mt-1 w-full h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#A7B0B8]">Password (write‑only)</span>
            <input
              type="password"
              className="mt-1 w-full h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••••••"
            />
          </label>

          <label className="block">
            <span className="text-sm text-[#A7B0B8]">From Address</span>
            <input
              className="mt-1 w-full h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={fromAddress}
              onChange={(e) => setFromAddress(e.target.value)}
              placeholder="no-reply@yourdomain.com"
            />
          </label>
        </div>

        <div className="flex gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="px-4 h-11 rounded-2xl bg-[#1E242B] border border-[#2B323A] text-[#E6E8EB] hover:bg-[#222831] disabled:opacity-60"
          >{saving ? "Saving…" : "Save Settings"}</button>
        </div>

        <div className="pt-4 border-t border-[#2B323A]">
          <div className="text-sm text-[#A7B0B8] mb-2">Send Test Email</div>
          <div className="flex gap-2">
            <input
              className="flex-1 h-11 px-3 rounded-2xl bg-[#151A1F] border border-[#2B323A] text-[#E6E8EB]"
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder="approver@example.com"
            />
            <button
              onClick={sendTest}
              disabled={testing || !testTo}
              className="px-4 h-11 rounded-2xl bg-[#1E242B] border border-[#2B323A] text-[#E6E8EB] hover:bg-[#222831] disabled:opacity-60"
            >{testing ? "Sending…" : "Send Test"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
