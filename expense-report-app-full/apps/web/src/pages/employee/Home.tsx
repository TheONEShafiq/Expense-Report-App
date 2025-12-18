import { Link } from 'react-router-dom'

export default function EmployeeHome(){
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Employee Home</h1>
      <div className="card">
        <p>Create expenses, attach receipts, and submit weekly reports.</p>
        <div className="mt-3 flex gap-2">
          <Link className="underline" to="/reports/1">Open Sample Report</Link>
        </div>
      </div>
    </div>
  )
}
