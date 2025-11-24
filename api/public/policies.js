async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function postJSON(url, body){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-Actor-Email':'dpena@1588ventures.com'},body:JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

const selCompany = document.getElementById('company');
const limitsBody = document.querySelector('#limitsTbl tbody');
const approversBody = document.querySelector('#approversTbl tbody');

let categories=[], users=[], userCompanies=[], thresholds=[], airline={}, perDiemOv=[], mileageOv=[], entCatId=null;

async function loadCompanies(){ const { data } = await fetchJSON('/admin/companies'); selCompany.innerHTML = data.map(c=>`<option value="${c.id}">${c.name}</option>`).join(''); }
async function loadAll(){
  const companyId = selCompany.value;
  const look = await fetchJSON(`/admin/lookups?company_id=${companyId}`);
  categories = look.data.categories; users = look.data.users; userCompanies = look.data.userCompanies;
  const pol = await fetchJSON(`/admin/policies?company_id=${companyId}`);
  thresholds = pol.data.thresholds; airline = pol.data.airline || { allowFirstClass: false };
  perDiemOv = pol.data.perDiemOv; mileageOv = pol.data.mileageOv;
  const byCat = Object.fromEntries(thresholds.map(t => [t.categoryId, t]));
  const ent = categories.find(c => /entertainment/i.test(c.name)); entCatId = ent ? ent.id : null;
  limitsBody.innerHTML = categories.map(cat => { const t = byCat[cat.id] || {}; const isEnt = /entertainment/i.test(cat.name);
    return `<tr data-cat="${cat.id}">
      <td>${cat.name}</td>
      <td><input type="number" step="0.01" value="${t.perTxnCapUsd ?? ''}"></td>
      <td style="text-align:center"><input type="checkbox" ${t.evaluatePerPerson ? 'checked':''} ${isEnt?'':'disabled'}></td>
      <td><input type="number" step="0.01" value="${t.perPersonCapUsd ?? ''}" ${isEnt?'':'disabled'}></td>
    </tr>`; }).join('');
  document.getElementById('allowFirst').checked = !!airline.allowFirstClass;
  const assigned = userCompanies.map(uc => ({...uc, user: users.find(u=>u.id===uc.userId)})).filter(x=>!!x.user);
  approversBody.innerHTML = assigned.map(uc => `<tr data-uid="${uc.userId}"><td>${uc.user.name}</td><td>${uc.user.email}</td><td><input type="checkbox" ${uc.isApprover?'checked':''}></td></tr>`).join('');
  const t = byCat[entCatId] || {}; const entEval = document.getElementById('entEval'); const entCap = document.getElementById('entCap');
  if(entEval) entEval.checked = !!t.evaluatePerPerson; if(entCap) entCap.value = (t.perPersonCapUsd ?? '');
  const today = new Date().toISOString().slice(0,10); ['hotelFrom','foodFrom','mileFrom'].forEach(id => { const el = document.getElementById(id); if(el && !el.value) el.value = today; });
}
document.getElementById('saveHotel').onclick = async () => { const payload = { companyId: selCompany.value, type: 'hotel', dailyCapUsd: Number(document.getElementById('hotelCap').value||0), effectiveFrom: document.getElementById('hotelFrom').value, effectiveTo: document.getElementById('hotelTo').value||null }; await postJSON('/admin/per-diem', payload); alert('Hotel per diem saved'); };
document.getElementById('saveFood').onclick = async () => { const payload = { companyId: selCompany.value, type: 'food', dailyCapUsd: Number(document.getElementById('foodCap').value||0), effectiveFrom: document.getElementById('foodFrom').value, effectiveTo: document.getElementById('foodTo').value||null }; await postJSON('/admin/per-diem', payload); alert('M&IE per diem saved'); };
document.getElementById('saveMile').onclick = async () => { const payload = { companyId: selCompany.value, rateUsdPerMile: Number(document.getElementById('mileRate').value||0), effectiveFrom: document.getElementById('mileFrom').value, effectiveTo: document.getElementById('mileTo').value||null }; await postJSON('/admin/mileage', payload); alert('Mileage override saved'); };
document.getElementById('saveAir').onclick = async () => { const payload = { companyId: selCompany.value, allowFirstClass: document.getElementById('allowFirst').checked }; await postJSON('/admin/airline', payload); alert('Airline rule saved'); };
document.getElementById('saveLimits').onclick = async () => { const items = Array.from(limitsBody.querySelectorAll('tr')).map(tr => { const [capEl, chkEl, perEl] = tr.querySelectorAll('input'); return { categoryId: tr.dataset.cat, perTxnCapUsd: Number(capEl.value||0), evaluatePerPerson: chkEl && !chkEl.disabled ? chkEl.checked : false, perPersonCapUsd: perEl && !perEl.disabled ? Number(perEl.value||0) : null }; }); await postJSON('/admin/thresholds', { companyId: selCompany.value, items }); alert('Category limits saved'); };
document.getElementById('saveApprovers').onclick = async () => { const items = Array.from(approversBody.querySelectorAll('tr')).map(tr => ({ userId: tr.dataset.uid, isApprover: tr.querySelector('input[type=checkbox]').checked })); await postJSON('/admin/approvers', { companyId: selCompany.value, items }); alert('Approvers saved'); };
document.getElementById('saveEnt').onclick = async () => { if(!entCatId){ alert('Entertainment Meals category not found.'); return; } const payload = { companyId: selCompany.value, items: [{ categoryId: entCatId, perTxnCapUsd: 500, evaluatePerPerson: document.getElementById('entEval').checked, perPersonCapUsd: Number(document.getElementById('entCap').value || 0) }] }; await postJSON('/admin/thresholds', payload); alert('Entertainment Meals policy saved'); };
document.getElementById('refresh').onclick = loadAll;
loadCompanies().then(loadAll).catch(e => alert(e.message));
