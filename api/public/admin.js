async function fetchJSON(url){ const r=await fetch(url); if(!r.ok) throw new Error(await r.text()); return r.json(); }
function ytdFromMonthly(rows, groupKeys){ const key=(r)=>groupKeys.map(k=>r[k]).join('|'); const groups={}; rows.forEach(r=>{const k=key(r);(groups[k] ||= []).push(r)}); const out=[]; Object.values(groups).forEach(list=>{list.sort((a,b)=> new Date(a.month)-new Date(b.month)); let cum=0; list.forEach(r=>{ cum+=r.total_month; out.push({...r, ytd_through_month:cum});});}); return out;}
async function run(){
  const year = new Date().getFullYear();
  const e1 = await fetchJSON(`/admin/dashboard/employee-totals?year=${year}`);
  const data1 = ytdFromMonthly(e1.data.map(r => ({ company_id:r.company_id, user_id:r.user_id, month:r.month, total_month:Number(r.total_month) })), ['company_id','user_id']);
  document.getElementById('table1').textContent = JSON.stringify(data1, null, 2);
  const msum = {}; data1.forEach(r => { const m=r.month.slice(0,7); msum[m]=(msum[m]||0)+r.total_month; });
  const labels1 = Object.keys(msum).sort(); const vals1 = labels1.map(k => msum[k]);
  new Chart(document.getElementById('chart1').getContext('2d'), { type: 'line', data: { labels: labels1, datasets: [{ label: 'Total by month', data: vals1 }] } });
  const e2 = await fetchJSON(`/admin/dashboard/company-category?year=${year}`);
  const data2 = e2.data.map(r => ({...r, total_month:Number(r.total_month)}));
  document.getElementById('table2').textContent = JSON.stringify(data2, null, 2);
  const msum2 = {}; data2.forEach(r => { const m=r.month.slice(0,7); msum2[m]=(msum2[m]||0)+r.total_month; });
  const labels2 = Object.keys(msum2).sort(); const vals2 = labels2.map(k => msum2[k]);
  new Chart(document.getElementById('chart2').getContext('2d'), { type: 'bar', data: { labels: labels2, datasets: [{ label: 'Total by month', data: vals2 }] } });
  const e3 = await fetchJSON(`/admin/dashboard/per-diem?year=${year}`);
  const data3 = e3.data.map(r => ({ ...r, total_claimed_usd:Number(r.total_claimed_usd), allowed_cap_usd:Number(r.allowed_cap_usd), variance_usd:Number(r.variance_usd) }));
  document.getElementById('table3').textContent = JSON.stringify(data3, null, 2);
}
run().catch(err => { console.error(err); alert(err.message); });
