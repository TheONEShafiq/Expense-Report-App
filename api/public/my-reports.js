async function fetchJSON(url, actor){ const r=await fetch(url,{ headers: actor?{'X-Actor-Email':actor}:{}}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function postJSON(url, body, actor){ const r=await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json', ...(actor?{'X-Actor-Email':actor}:{}) }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

const els = { actor: document.getElementById('actorEmail'), company: document.getElementById('companySel'), repBody: document.querySelector('#repTbl tbody'), linesBody: document.querySelector('#linesTbl tbody'), reportMeta: document.getElementById('reportMeta'), };

async function loadCompanies(){ const j = await fetch('/admin/companies').then(r=>r.json()); els.company.innerHTML = j.data.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); }

async function loadReports(){
  const actor = els.actor.value.trim(); if(!actor) return;
  const j = await fetchJSON(`/me/reports?company_id=${els.company.value}`, actor);
  const rows = j.data;
  els.repBody.innerHTML = rows.map(r => {
    const b = (s)=>`<span class="badge b-${s}">${s}</span>`;
    const act = r.status==='draft' ? '<button data-submit>Submit</button>' :
               r.status==='rejected' ? '<button data-reopen>Fix & Reopen</button>' :
               '<button data-view>View</button>';
    return `<tr data-id="${r.id}">
      <td>${r.id.slice(0,8)}</td>
      <td>${b(r.status)}</td>
      <td>${r.submittedAt ? String(r.submittedAt).slice(0,10) : '—'}</td>
      <td>${r.approvedAt ? String(r.approvedAt).slice(0,10) : '—'}</td>
      <td>$${Number(r.totalUsd).toFixed(2)}</td>
      <td>${act}</td>
    </tr>`;
  }).join('');
  els.repBody.querySelectorAll('tr').forEach(tr => {
    const id = tr.dataset.id;
    const submitBtn = tr.querySelector('button[data-submit]');
    const viewBtn = tr.querySelector('button[data-view]');
    const reopenBtn = tr.querySelector('button[data-reopen]');
    if (submitBtn) submitBtn.addEventListener('click', async () => { const actor = els.actor.value.trim(); await postJSON(`/reports/${id}/submit`, {}, actor); alert('Submitted. Auto-approvals applied.'); await loadReports(); });
    if (reopenBtn) reopenBtn.addEventListener('click', async () => { const actor = els.actor.value.trim(); await postJSON(`/reports/${id}/reopen`, {}, actor); alert('Reopened to Draft.'); await loadReports(); });
    if (viewBtn) viewBtn.addEventListener('click', async () => { await loadLines(id); });
    tr.addEventListener('click', async (e) => { if (e.target.tagName.toLowerCase() === 'button') return; await loadLines(id); });
  });
}

async function loadLines(reportId){
  const actor = els.actor.value.trim(); if(!actor) return;
  const j = await fetchJSON(`/reports/${reportId}/lines`, actor);
  const rep = j.data.report; els.reportMeta.textContent = JSON.stringify(rep, null, 2);
  const lines = j.data.lines;
  els.linesBody.innerHTML = lines.map(l => {
    const bp = (s)=>`<span class="badge b-${s}">${s}</span>`;
    return `<tr>
      <td>${String(l.date).slice(0,10)}</td>
      <td>${l.merchant}</td>
      <td>${l.category}</td>
      <td>$${Number(l.amountUsd).toFixed(2)}</td>
      <td>${l.attendeesCount ?? 1}</td>
      <td>${bp(l.policyStatus)}</td>
      <td>${bp(l.lineStatus)}</td>
    </tr>`;
  }).join('');
}

els.company.addEventListener('change', () => { loadReports(); });
els.actor.addEventListener('change', () => { loadReports(); });
loadCompanies().then(loadReports).catch(e => alert(e.message));
