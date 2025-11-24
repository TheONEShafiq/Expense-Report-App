async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
async function postJSON(url, body){ const r=await fetch(url,{ method:'POST', headers:{ 'Content-Type':'application/json', 'X-Actor-Email': localStorage.getItem('actorEmail') || '' }, body: JSON.stringify(body)}); if(!r.ok) throw new Error(await r.text()); return r.json(); }
const els = { name: document.getElementById('name'), currency: document.getElementById('currency'), create: document.getElementById('create'), coBody: document.querySelector('#coTbl tbody') };
async function loadCompanies(){ const j = await fetchJSON('/admin/companies'); els.coBody.innerHTML = j.data.map(c => `<tr><td>${c.name}</td><td>${c.baseCurrency}</td></tr>`).join(''); }
els.create.addEventListener('click', async () => { const name = els.name.value.trim(); if(!name){ alert('Enter company name'); return; } const baseCurrency = els.currency.value; await postJSON('/admin/companies/create', { name, baseCurrency }); alert('Company created'); els.name.value=''; await loadCompanies(); });
loadCompanies().catch(e => alert(e.message));
