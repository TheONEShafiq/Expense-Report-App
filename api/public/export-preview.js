async function fetchJSON(url, actor){ const r=await fetch(url,{ headers: actor?{'X-Actor-Email':actor}:{}}); if(!r.ok) throw new Error(await r.text()); return r.json(); }

const els = { actor: document.getElementById('actorEmail'), reportId: document.getElementById('reportId'), meta: document.getElementById('meta'), linesBody: document.querySelector('#linesTbl tbody'), load: document.getElementById('loadPrev'), dlCsv: document.getElementById('dlCsv'), dlIif: document.getElementById('dlIif'), sumToggle: document.getElementById('sumToggle'), cache: null };

async function load(){ const actor = els.actor.value.trim(); const id = els.reportId.value.trim(); if(!actor || !id){ alert('Enter actor email and report ID'); return; } const j = await fetchJSON(`/exports/${id}/preview`, actor); els.cache = j.data; els.meta.textContent = JSON.stringify(j.data.report, null, 2); renderLines(); }
function renderLines(){ const j = els.cache; if(!j) return; const sum = els.sumToggle.checked; if(!sum){ els.linesBody.innerHTML = j.lines.map(l => `<tr>
    <td>${String(l.date).slice(0,10)}</td><td>${l.merchant}</td><td>${l.category}</td><td>${l.debitGL}</td><td>${l.creditGL}</td><td>$${Number(l.amountUsd).toFixed(2)}</td><td>${l.memo}</td>
  </tr>`).join(''); return; }
  const groups = {}; for(const l of j.lines){ const key = l.debitGL || 'UNMAPPED'; (groups[key] ||= { debitGL:l.debitGL, amount:0, memos:[] }); groups[key].amount += Number(l.amountUsd||0); groups[key].memos.push(l.memo); }
  const rows = Object.values(groups).map(g => { let memo = g.memos.join(' | '); if(memo.length>200) memo = memo.slice(0,197)+'...'; return `<tr><td>—</td><td>—</td><td>—</td><td>${g.debitGL}</td><td>2000 · Employee Reimbursements Payable</td><td>$${g.amount.toFixed(2)}</td><td>${memo}</td></tr>`; }).join('');
  els.linesBody.innerHTML = rows || '<tr><td colspan="7">No lines</td></tr>';
}
els.sumToggle.addEventListener('change', renderLines);
els.load.addEventListener('click', load);
els.dlCsv.addEventListener('click', () => { const j = els.cache; if(!j) return; const headers = ['Date','Merchant','Category','DebitGL','CreditGL','AmountUSD','Memo']; const rows = j.lines.map(l => [String(l.date).slice(0,10), l.merchant, l.category, l.debitGL, l.creditGL, Number(l.amountUsd).toFixed(2), l.memo]); const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(','))].join('\n'); const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `export_${j.report.id.slice(0,8)}.csv`; a.click(); });
els.dlIif.addEventListener('click', async () => { const actor = els.actor.value.trim(); const id = els.reportId.value.trim(); if(!actor || !id){ alert('Enter actor email and report ID'); return; } const r = await fetch(`/exports/${id}/qbd.iif`, { headers: { 'X-Actor-Email': actor } }); if(!r.ok){ alert(await r.text()); return; } const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `qbd_${id.slice(0,8)}.iif`; a.click(); });
if (location.hash && location.hash.length > 1) { els.reportId.value = location.hash.substring(1); }
