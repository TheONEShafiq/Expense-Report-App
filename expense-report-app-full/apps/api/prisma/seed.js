import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();
async function main(){
  const roles = ["admin","approver","employee"];
  for (const r of roles) await prisma.roles.upsert({ where:{key:r}, update:{}, create:{key:r} });
  const adminPwd = await bcrypt.hash("admin123",10);
  const approverPwd = await bcrypt.hash("approver123",10);
  const employeePwd = await bcrypt.hash("employee123",10);
  const admin = await prisma.users.upsert({ where:{email:"admin@example.com"}, update:{}, create:{name:"Admin", email:"admin@example.com", passwordHash:adminPwd, status:"active"} });
  const approver = await prisma.users.upsert({ where:{email:"approver@example.com"}, update:{}, create:{name:"Approver", email:"approver@example.com", passwordHash:approverPwd, status:"active"} });
  const employee = await prisma.users.upsert({ where:{email:"employee@example.com"}, update:{}, create:{name:"Employee", email:"employee@example.com", passwordHash:employeePwd, status:"active"} });
  const roleMap = {};
  for (const r of roles) roleMap[r] = await prisma.roles.findUnique({ where:{key:r} });
  await prisma.user_roles.createMany({ data:[
    { user_id:admin.id, role_id:roleMap["admin"].id },
    { user_id:approver.id, role_id:roleMap["approver"].id },
    { user_id:employee.id, role_id:roleMap["employee"].id },
  ], skipDuplicates:true });
  const company = await prisma.companies.upsert({ where:{code:"ACME"}, update:{}, create:{name:"ACME Corp", code:"ACME", base_currency:"USD"} });
  await prisma.user_companies.createMany({ data:[
    {user_id:admin.id, company_id:company.id},
    {user_id:approver.id, company_id:company.id},
    {user_id:employee.id, company_id:company.id},
  ], skipDuplicates:true });
  await prisma.gl_accounts.createMany({ data:[
    { company_id: company.id, code:"6001", name:"Meals" },
    { company_id: company.id, code:"6002", name:"Travel" },
  ], skipDuplicates:true });
  await prisma.per_diem_policies.create({ data:{ company_id: company.id, name:"Global", currency:"USD", daily_total:75, active:true } });
  await prisma.preapproval_limits.createMany({ data:[
    { company_id: company.id, category:"Meals", limit_amount:50, currency:"USD" },
    { company_id: company.id, category:"Travel", limit_amount:500, currency:"USD" },
  ], skipDuplicates:true });
  await prisma.fx_rates.create({ data:{ as_of_date: new Date(), usd_to_mxn_rate: 17.5, source:"seed" } });
  console.log("Seed complete");
}
main().finally(()=>prisma.$disconnect());
