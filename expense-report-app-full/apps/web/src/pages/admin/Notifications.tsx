import React, { useEffect, useState } from "react";
import { api } from "../../lib/api";
import { useToast } from "../../components/toast/ToastProvider";

type EmailConfig = { provider:"smtp"; host:string; port:number; username:string; fromAddress:string };
export default function NotificationsAdminPage() {
  const { push } = useToast();
  const [host, setHost] = useState(""); const [port, setPort] = useState(587);
  const [username, setUsername] = useState(""); const [password, setPassword] = useState("");
  const [fromAddress, setFromAddress] = useState(""); const [testTo, setTestTo] = useState("");
  useEffect(()=>{ api.get("/admin/notifications/email-config").then((cfg:any)=>{ setHost(cfg.host||""); setPort(cfg.port||587); setUsername(cfg.username||""); setFromAddress(cfg.fromAddress||""); }).catch(()=>{}); },[]);
  async function save(){ try{ await api.put("/admin/notifications/email-config", { provider:"smtp", host, port, username, password, fromAddress }); setPassword(""); push({ title:"Saved", description:"Email settings updated.", variant:"success" }); } catch(e:any){ push({ title:"Save failed", description:String(e), variant:"error" }) } }
  async function sendTest(){ try{ await api.post("/admin/notifications/email/test", { to:testTo, subject:"Test email from Expense App", text:"This is a test email." }); push({ title:"Test sent", description:`Sent to ${testTo}`, variant:"success" }); } catch(e:any){ push({ title:"Test failed", description:String(e), variant:"error" }) } }
  return (
    <div className="p-6 max-w-3xl">
      <h1 className="text-2xl font-semibold text-[#E6E8EB]">Notifications (Email)</h1>
      <p className="text-[#A7B0B8] mt-1">One‑way email alerts via SMTP. Replies are not processed.</p>
      <div className="mt-6 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <label className="block"><span className="text-sm text-[#A7B0B8]">SMTP Host</span><input value={host} onChange={e=>setHost(e.target.value)} placeholder="smtp.sendprovider.com" /></label>
          <label className="block"><span className="text-sm text-[#A7B0B8]">SMTP Port</span><input type="number" value={port} onChange={e=>setPort(Number(e.target.value))} placeholder="587" /></label>
          <label className="block"><span className="text-sm text-[#A7B0B8]">Username</span><input value={username} onChange={e=>setUsername(e.target.value)} /></label>
          <label className="block"><span className="text-sm text-[#A7B0B8]">Password (write‑only)</span><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••••••••••" /></label>
          <label className="block"><span className="text-sm text-[#A7B0B8]">From Address</span><input value={fromAddress} onChange={e=>setFromAddress(e.target.value)} placeholder="no-reply@yourdomain.com" /></label>
        </div>
        <div className="flex gap-3"><button onClick={save}>Save Settings</button></div>
        <div className="pt-4 border-t border-[#2B323A]">
          <div className="text-sm text-[#A7B0B8] mb-2">Send Test Email</div>
          <div className="flex gap-2">
            <input className="flex-1" value={testTo} onChange={e=>setTestTo(e.target.value)} placeholder="approver@example.com" />
            <button onClick={sendTest} disabled={!testTo}>Send Test</button>
          </div>
        </div>
      </div>
    </div>
  );
}
