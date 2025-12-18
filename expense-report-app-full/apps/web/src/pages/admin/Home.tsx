export default function AdminHome(){
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Admin Home</h1>
      <div className="grid md:grid-cols-2 gap-4">
        <div className="card">Users, Companies, GL Codes</div>
        <div className="card">Per Diem & Pre-Approval Limits</div>
      </div>
    </div>
  )
}
