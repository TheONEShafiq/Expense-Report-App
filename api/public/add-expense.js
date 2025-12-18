async function fetchJSON(url, actor){ const r=await fetch(url, { headers: actor ? { 'X-Actor-Email': actor } : {} }); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function postJSON(url, body, actor){ const r=await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json', ...(actor?{'X-Actor-Email':actor}:{}) }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function del(url, actor){ const r=await fetch(url,{ method:'DELETE', headers: actor ? { 'X-Actor-Email': actor } : {} }); if(!r.ok) throw new Error(await r.text()); return r.json(); }

const els = { actor: document.getElementById('actorEmail'), company: document.getElementById('companySel'), file: document.getElementById('file'), preview: document.getElementById('preview'), merchant: document.getElementById('merchant'), date: document.getElementById('txnDate'), category: document.getElementById('categorySel'), attendees: document.getElementById('attendees'), attWrap: document.getElementById('attWrap'), ocrAmount: document.getElementById('ocrAmount'), validate: document.getElementById('validate'), runOcr: document.getElementById('runOcr'), amount: document.getElementById('amount'), valResult: document.getElementById('valResult'), save: document.getElementById('save'), submitDraft: document.getElementById('submitDraft'), saveMsg: document.getElementById('saveMsg'), draftInfo: document.getElementById('draftInfo'), draftTblBody: document.querySelector('#draftTbl tbody'), attList: null, addAttBtn: null };
let currentReportId = null;
let attendeeNames = [];

function setToday(){ els.date.value = new Date().toISOString().slice(0,10); }
function showPreview(file){ if(!file){ els.preview.style.display='none'; els.preview.src=''; return; } const url = URL.createObjectURL(file); els.preview.src = url; els.preview.style.display = 'block'; }

async function loadCompanies(){ const j = await fetchJSON('/admin/companies'); els.company.innerHTML = j.data.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); const storedCompany=localStorage.getItem('companyId'); if(storedCompany){ els.company.value = storedCompany; } }
async function loadCategories(){ const companyId = els.company.value; const look = await fetchJSON(`/admin/lookups?company_id=${companyId}`); const cats = look.data.categories; els.category.innerHTML = cats.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); onCategoryChangeExtended(); }

function renderAttendees(){
  const wrap = document.getElementById('attListWrap');
  const list = document.getElementById('attList');
  els.attList = list; els.addAttBtn = document.getElementById('addAttendee');
  const isEnt = /entertainment/i.test(els.category.options[els.category.selectedIndex]?.text || '');
  wrap.style.display = isEnt ? '' : 'none';
  els.attWrap.style.display = isEnt ? '' : 'none';
  if (!isEnt) { attendeeNames = []; list.innerHTML = ''; return; }
  els.attendees.value = String(Math.max(1, attendeeNames.length || Number(els.attendees.value || 1)));
  list.innerHTML = attendeeNames.length ? attendeeNames.map((n, i) => `<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px"><input data-idx="${i}" value="${n}" placeholder="Full name"><button data-del="${i}" type="button">Remove</button></div>`).join('') : '<small>No attendees yet. Add names.</small>';
  list.querySelectorAll('input[data-idx]').forEach(inp => { inp.addEventListener('input', () => { attendeeNames[Number(inp.dataset.idx)] = inp.value; }); });
  list.querySelectorAll('button[data-del]').forEach(btn => { btn.addEventListener('click', () => { const i = Number(btn.dataset.del); attendeeNames.splice(i,1); renderAttendees(); }); });
  if (els.addAttBtn && !els.addAttBtn._wired) { els.addAttBtn._wired = true; els.addAttBtn.addEventListener('click', () => { attendeeNames.push(''); renderAttendees(); }); }
}
function onCategoryChange(){ const name = els.category.options[els.category.selectedIndex]?.text || ''; const isEnt = /entertainment/i.test(name); els.attWrap.style.display = isEnt ? '' : 'none'; }
function onCategoryChangeExtended(){ onCategoryChange(); renderAttendees(); }

function runMockOCR(){ const f = els.file.files?.[0]; if(!f){ els.ocrAmount.value = ''; alert('Add a photo first.'); return; } const cents = (f.size % 100) / 100; const dollars = Math.max(10, Math.min(500, Math.round(f.size/1024))); const guess = (dollars + cents).toFixed(2); els.ocrAmount.value = guess; }
function validateAmount(){ const amt = Number(els.amount.value || 0); const ocr = Number(els.ocrAmount.value || 0); if(!amt || !ocr){ els.valResult.textContent = 'Enter amount and run OCR first.'; return; } const tol = Math.max(ocr * 0.01, 0.50); const diff = Math.abs(amt - ocr); const pass = diff <= tol; els.valResult.textContent = JSON.stringify({ amount: amt, ocr, diff: Number(diff.toFixed(2)), tolerance: Number(tol.toFixed(2)), pass }, null, 2); }

async function saveExpense(){ const actor = els.actor.value.trim() || localStorage.getItem('actorEmail'); if(!actor){ alert('Enter your primary email first.'); return; } const payload = { companyId: els.company.value, merchant: els.merchant.value || 'Unknown Merchant', txnDate: els.date.value, categoryId: els.category.value, amountUsd: Number(els.amount.value || 0), attendeesCount: Number(els.attendees.value || 1), attendees: attendeeNames.filter(n => String(n||'').trim()) }; if(!payload.amountUsd){ alert('Enter amount'); return; } const res = await postJSON('/expenses', payload, actor); els.saveMsg.textContent = JSON.stringify(res, null, 2); await loadDraft(); }

async function loadDraft(){ const actor = els.actor.value.trim() || localStorage.getItem('actorEmail'); if(!actor){ return; } const companyId = els.company.value; localStorage.setItem('companyId', companyId); localStorage.setItem('actorEmail', actor); const j = await fetchJSON(`/me/draft-report?company_id=${companyId}`, actor); currentReportId = j.data?.report?.id ?? null; els.draftInfo.textContent = JSON.stringify({ reportId: currentReportId, total: j.data?.total ?? 0 }, null, 2); const rows = j.data?.expenses ?? []; els.draftTblBody.innerHTML = rows.map(x => `<tr data-id="${x.id}"><td>${String(x.txnDate).slice(0,10)}</td><td>${x.merchant}</td><td>${x.categoryName}</td><td>$${Number(x.amountUsd).toFixed(2)}</td><td>${x.attendeesCount ?? 1}</td><td><button data-del="${x.id}">Remove</button></td></tr>`).join(''); els.draftTblBody.querySelectorAll('button[data-del]').forEach(btn => { btn.addEventListener('click', async () => { const id = btn.getAttribute('data-del'); await del(`/expenses/${id}`, actor); await loadDraft(); }); }); }

els.file.addEventListener('change', e => showPreview(e.target.files?.[0])); els.category.addEventListener('change', onCategoryChangeExtended); els.runOcr.addEventListener('click', runMockOCR); els.validate.addEventListener('click', validateAmount); els.save.addEventListener('click', saveExpense); els.company.addEventListener('change', () => { loadCategories().then(loadDraft); }); els.submitDraft.addEventListener('click', async () => { const actor = els.actor.value.trim() || localStorage.getItem('actorEmail'); if(!actor) { alert('Enter your primary email first.'); return; } if(!currentReportId){ alert('No draft report found for this company.'); return; } await postJSON(`/reports/${currentReportId}/submit`, {}, actor); alert('Submitted. Auto-approvals applied; approvers notified via SMS if configured.'); await loadDraft(); });
function setToday(){ els.date.value = new Date().toISOString().slice(0,10); } setToday(); loadCompanies().then(loadCategories).then(loadDraft).catch(err => alert(err.message));
