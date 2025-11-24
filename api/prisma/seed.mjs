import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const now = new Date();
async function upsertCompany(name){ return prisma.company.upsert({ where:{name}, update:{}, create:{ name } }); }
async function upsertUser({ email, name, role, firstName, lastName, phone }){
  return prisma.user.upsert({ where:{ email }, update:{ name, role, firstName, lastName, phone }, create:{ email, name, role, firstName, lastName, phone } });
}
async function ensureUC(userId, companyId, isPrimary=false, isApprover=false, companyEmail=null){
  return prisma.userCompany.upsert({ where:{ userId_companyId:{ userId, companyId } }, update:{ isPrimary, isApprover, companyEmail }, create:{ userId, companyId, isPrimary, isApprover, companyEmail } });
}
async function seed(){
  const c1588 = await upsertCompany('1588 Ventures');
  const cZeus = await upsertCompany('Zeus Power');
  const cInnov = await upsertCompany('Innovative Gloves');
  const cSunb = await upsertCompany('Sunbae Swim');
  const cats = ['Travel','Meals Per Diem','Entertainment Meals','Mileage','Marketing/Promotional'];
  const categories = [];
  for (const name of cats){ categories.push(await prisma.category.upsert({ where:{ name }, update:{}, create:{ name } })); }
  const hotelCap = Number(process.env.GLOBAL_PER_DIEM_HOTEL_USD || 150);
  const foodCap  = Number(process.env.GLOBAL_PER_DIEM_FOOD_USD  || 75);
  const mileage  = Number(process.env.GLOBAL_MILEAGE_RATE_USD   || 0.655);
  await prisma.perDiemGlobal.create({ data: { type:'hotel', dailyCapUsd: hotelCap, effectiveFrom: now } }).catch(()=>{});
  await prisma.perDiemGlobal.create({ data: { type:'food',  dailyCapUsd: foodCap,  effectiveFrom: now } }).catch(()=>{});
  await prisma.mileageGlobal.create({ data: { rateUsdPerMile: mileage, effectiveFrom: now } }).catch(()=>{});
  for (const c of [c1588,cZeus,cInnov,cSunb]) { await prisma.airlineRule.upsert({ where:{ id:`${c.id}-airline` }, update:{ allowFirstClass:false }, create:{ id:`${c.id}-airline`, companyId:c.id, allowFirstClass:false } }); }
  const adminDalia = await upsertUser({ name:'Dalia Pena', firstName:'Dalia', lastName:'Pena', email:'dpena@1588ventures.com', role:'admin', phone:'+12145550111' });
  const approverRick1588 = await upsertUser({ name:'Rick Perez', firstName:'Rick', lastName:'Perez', email:'rperez@1588ventures.com', role:'approver' });
  const approverShafiqZeus = await upsertUser({ name:'Shafiq Jadallah', firstName:'Shafiq', lastName:'Jadallah', email:'shafiq@zeustx.com', role:'approver' });
  const approverShafiqSunb = await upsertUser({ name:'Shafiq Jadallah', firstName:'Shafiq', lastName:'Jadallah', email:'sjadallah@1588ventures.com', role:'approver' });
  const approverWalkerInnov = await upsertUser({ name:'Walker Chan', firstName:'Walker', lastName:'Chan', email:'wchan@1588ventures.com', role:'approver' });
  const uJavier = await upsertUser({ name:'Javier Pena', email:'jpena@1588ventures.com', role:'employee' });
  const uJulia = await upsertUser({ name:'Julia Salazar', email:'jsalazar@1588ventures.com', role:'employee' });
  const uElsye = await upsertUser({ name:'Elsye Lee', email:'elee@1588ventures.com', role:'employee' });
  const uMonica = await upsertUser({ name:'Monica Sherman', email:'msherman@1588ventures.com', role:'employee' });
  const uJeff = await upsertUser({ name:'Jeff Williams', email:'JWilliams@mainspringpartners.com', role:'employee' });
  const uShafiq1588emp = await upsertUser({ name:'Shafiq Jadallah', email:'sjadallah@1588ventures.com', role:'approver' });
  const uHunter1588 = await upsertUser({ name:'Hunter Chan', email:'hchan@1588ventures.com', role:'employee' });
  const uWalker = approverWalkerInnov;
  const uNadia = await upsertUser({ name:'Nadia Michel', email:'nadia@sunbaeswim.com', role:'employee' });
  const uAli = await upsertUser({ name:'Ali Conrad', email:'ali@sunbaeswim.com', role:'employee' });
  const uShannon = await upsertUser({ name:'Shannon Xie', email:'sxie@1588ventures.com', role:'employee' });
  const uElsyeInnov = uElsye;
  const uChris = await upsertUser({ name:'Chris Gannon', email:'chris@zeustx.com', role:'employee' });
  const uPatrick = await upsertUser({ name:'Patrick Sailor', email:'patrick@zeustx.com', role:'employee' });
  const uPeter = await upsertUser({ name:'Peter Atkinson', email:'peter@zeustx.com', role:'employee' });
  const uLiliana = await upsertUser({ name:'Liliana Zaray', email:'liliana@zeustx.com', role:'employee' });
  const uHunterZeus = await upsertUser({ name:'Hunter Chan', email:'hunter@zeustx.com', role:'employee' });

  for (const u of [adminDalia,uJavier,uJulia,uElsye,uMonica,uJeff,uShafiq1588emp,uHunter1588,uWalker]) await ensureUC(u.id,c1588.id,u.id===adminDalia.id,false,u.email.includes('@1588ventures.com')?u.email:null);
  await ensureUC(approverRick1588.id, c1588.id, false, true, 'rperez@1588ventures.com');
  for (const u of [uNadia,uAli]) await ensureUC(u.id,cSunb.id,false,false,u.email);
  await ensureUC(approverShafiqSunb.id, cSunb.id, true, true, 'sjadallah@1588ventures.com');
  for (const u of [uShannon,uElsyeInnov]) await ensureUC(u.id,cInnov.id,false,false,u.email);
  await ensureUC(approverWalkerInnov.id, cInnov.id, true, true, 'wchan@1588ventures.com');
  for (const u of [uChris,uPatrick,uPeter,uLiliana,uHunterZeus]) await ensureUC(u.id,cZeus.id,false,false,u.email);
  await ensureUC(approverShafiqZeus.id, cZeus.id, true, true, 'shafiq@zeustx.com');

  const caps = { 'Travel':1000, 'Meals Per Diem':75, 'Entertainment Meals':500, 'Mileage':200, 'Marketing/Promotional':500 };
  const companies = [c1588, cZeus, cInnov, cSunb];
  for (const company of companies) {
    for (const cat of categories) {
      await prisma.policyThreshold.upsert({
        where:{ companyId_categoryId:{ companyId: company.id, categoryId: cat.id } },
        update:{ perTxnCapUsd: caps[cat.name] ?? 0 },
        create:{ companyId: company.id, categoryId: cat.id, perTxnCapUsd: caps[cat.name] ?? 0 }
      });
    }
  }
  const entCat = categories.find(c => c.name === 'Entertainment Meals');
  if (entCat) {
    for (const company of companies) {
      await prisma.policyThreshold.upsert({
        where:{ companyId_categoryId:{ companyId: company.id, categoryId: entCat.id } },
        update:{ evaluatePerPerson:true, perPersonCapUsd:50 },
        create:{ companyId: company.id, categoryId: entCat.id, perTxnCapUsd:500, evaluatePerPerson:true, perPersonCapUsd:50 }
      });
    }
  }
  async function createGLAndMap(company, categories){
    const gls=[
      { name:'2000 · Employee Reimbursements Payable', number:'2000' },
      { name:'6000 · Travel Expense', number:'6000' },
      { name:'6100 · Meals & Entertainment', number:'6100' },
      { name:'6200 · Mileage Reimbursement', number:'6200' },
      { name:'6300 · Marketing & Promotion', number:'6300' },
    ];
    const recs={};
    for (const g of gls){
      const id=`${company.id}-${g.number}`;
      const rec=await prisma.gLAccount.upsert({ where:{ id }, update:{ name:g.name, number:g.number }, create:{ id, companyId: company.id, name:g.name, number:g.number } });
      recs[g.number]=rec;
    }
    const map = { 'Travel':'6000','Meals Per Diem':'6100','Entertainment Meals':'6100','Mileage':'6200','Marketing/Promotional':'6300' };
    for (const [catName, glNum] of Object.entries(map)){
      const cat = categories.find(c=>c.name===catName); if(!cat) continue;
      const gl = recs[glNum];
      await prisma.categoryGLMapping.upsert({
        where:{ companyId_categoryId:{ companyId: company.id, categoryId: cat.id } },
        update:{ glAccountId: gl.id },
        create:{ companyId: company.id, categoryId: cat.id, glAccountId: gl.id }
      });
    }
  }
  for (const c of companies) await createGLAndMap(c, categories);
  console.log('Seed complete.');
}
seed().catch(e => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
