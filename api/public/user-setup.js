async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function postJSON(url, body){ const r=await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json', 'X-Actor-Email': localStorage.getItem('actorEmail') || '' }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function putJSON(url, body){ const r=await fetch(url,{ method:'PUT', headers:{ 'Content-Type':'application/json', 'X-Actor-Email': localStorage.getItem('actorEmail') || '' }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function patchJSON(url, body){ const r=await fetch(url,{ method:'PATCH', headers:{ 'Content-Type':'application/json', 'X-Actor-Email': localStorage.getItem('actorEmail') || '' }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

const els = { f: { first: document.getElementById('firstName'), last: document.getElementById('lastName'), email: document.getElementById('email'), phone: document.getElementById('phone'), isAdmin: document.getElementById('isAdmin') }, assignBody: document.querySelector('#assignTbl tbody'), save: document.getElementById('saveUser'), clear: document.getElementById('clearForm'), usersBody: document.querySelector('#usersTbl tbody'), filterCompany: document.getElementById('filterCompany') };
let companies=[]; let users=[];

async function loadCompanies(){ const j = await fetchJSON('/admin/companies'); companies = j.data; const opts = companies.map(c => `<option value="${c.id}">${c.name}</option>`).join(''); els.filterCompany.innerHTML = `<option value="">All</option>` + opts; els.assignBody.innerHTML = companies.map(c => `<tr data-cid="${c.id}">
  <td>${c.name}</td><td style="text-align:center"><input type="checkbox" class="a-enable"></td><td><input class="a-email" placeholder="user@${c.name.replace(/\s+/g,'').toLowerCase()}.com"></td><td style="text-align:center"><input type="checkbox" class="a-primary"></td><td style="text-align:center"><input type="checkbox" class="a-approver"></td></tr>`).join(''); }

async function loadUsers(){ const cid = els.filterCompany.value; const url = cid ? `/admin/users?company_id=${cid}` : `/admin/users`; const j = await fetchJSON(url); users = j.data; renderUsers(); }
function renderUsers(){ els.usersBody.innerHTML = users.map(u => `<tr data-id="${u.id}"><td>${u.name}</td><td>${u.email}</td><td>${u.phone||'—'}</td><td>${u.role}</td><td><button data-admin="${u.role==='admin'?'drop':'make'}">${u.role==='admin'?'Remove Admin':'Make Admin'}</button></td></tr>`).join(''); els.usersBody.querySelectorAll('button[data-admin]').forEach(btn => { btn.addEventListener('click', async () => { const id = btn.closest('tr').dataset.id; const make = btn.getAttribute('data-admin')==='make'; const reason = prompt('Reason (optional):',''); await patchJSON(`/admin/users/${id}/admin`, { isAdmin: make, reason }); await loadUsers(); }); }); }

els.save.addEventListener('click', async () => {
  const firstName = els.f.first.value.trim(); const lastName = els.f.last.value.trim(); const email = els.f.email.value.trim(); const phone = els.f.phone.value.trim(); const isAdmin = els.f.isAdmin.checked;
  if(!firstName||!lastName||!email||!phone){ alert('First, Last, Email, Phone are required.'); return; }
  const assignments = Array.from(els.assignBody.querySelectorAll('tr')).map(tr => {
    const enable = tr.querySelector('.a-enable').checked; if(!enable) return null;
    return { companyId: tr.dataset.cid, companyEmail: tr.querySelector('.a-email').value.trim() || null, isPrimary: tr.querySelector('.a-primary').checked, isApprover: tr.querySelector('.a-approver').checked };
  }).filter(Boolean);
  if(assignments.length===0){ alert('Select at least one company assignment.'); return; }
  await postJSON('/admin/users', { firstName, lastName, email, phone, isAdmin, assignments });
  alert('Saved'); els.clear.click(); await loadUsers();
});
els.clear.addEventListener('click', () => { els.f.first.value=''; els.f.last.value=''; els.f.email.value=''; els.f.phone.value=''; els.f.isAdmin.checked=false; els.assignBody.querySelectorAll('tr').forEach(tr => { tr.querySelector('.a-enable').checked=false; tr.querySelector('.a-email').value=''; tr.querySelector('.a-primary').checked=false; tr.querySelector('.a-approver').checked=false; }); });
els.filterCompany.addEventListener('change', loadUsers);
loadCompanies().then(loadUsers).catch(e => alert(e.message));
