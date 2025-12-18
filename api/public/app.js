(function(){const b=document.querySelector('.menu-btn');const d=document.querySelector('.drawer');if(!b||!d)return;function outside(e){if(!d.contains(e.target)&&e.target!==b){d.classList.remove('open');b.setAttribute('aria-expanded','false');document.removeEventListener('click',outside);}}b.addEventListener('click',function(){const o=d.classList.toggle('open');b.setAttribute('aria-expanded',o?'true':'false');requestAnimationFrame(()=>document.addEventListener('click',outside));});})();

async function getRoles(actorEmail, companyId){
  if(!actorEmail || !companyId) return null;
  try { const r = await fetch(`/me/roles?company_id=${companyId}`, { headers: { 'X-Actor-Email': actorEmail } });
    if(!r.ok) return null; const j = await r.json(); return j.data;
  } catch { return null; }
}
async function applyRoleNav(actorEmail, companyId){
  const roles = await getRoles(actorEmail, companyId);
  const links = document.querySelectorAll('nav.drawer a.nav-link');
  links.forEach(a => {
    const need = a.getAttribute('data-roles'); if(!need) return;
    const rolesList = need.split(',').map(s=>s.trim());
    const ok = roles && ((roles.admin && rolesList.includes('admin')) ||
                         (roles.approver && rolesList.includes('approver')) ||
                         rolesList.includes('employee'));
    if(!ok){ a.classList.add('disabled'); a.setAttribute('aria-disabled','true'); a.tabIndex = -1; }
  });
}
(function initRoleState(){
  const storedEmail = localStorage.getItem('actorEmail') || '';
  const storedCompany = localStorage.getItem('companyId') || '';
  applyRoleNav(storedEmail, storedCompany);
  const emailInps = document.querySelectorAll('input[type=email]#actorEmail');
  emailInps.forEach(inp => { if(storedEmail && !inp.value) inp.value = storedEmail; });
  const sel = document.getElementById('companySel');
  if (sel && storedCompany) {
    const iv = setInterval(() => {
      if (sel.options.length) { sel.value = storedCompany; clearInterval(iv); sel.dispatchEvent(new Event('change')); }
    }, 200);
    setTimeout(()=>clearInterval(iv), 4000);
  }
})();