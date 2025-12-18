import { useEffect, useState } from 'react'
import { api } from '../../lib/api'
import { Link } from 'react-router-dom'

export default function ApproverHome(){
  const [items,setItems] = useState<any[]>([])
  useEffect(()=>{ api.get('/approvals/queue').then(setItems).catch(()=>{}) },[])
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-4">Approver Queue</h1>
      <div className="space-y-3">
        {items.map(r => (
          <div key={r.id} className="card flex justify-between items-center">
            <div>Report #{r.id} – Week {new Date(r.week_start_date).toISOString().slice(0,10)} – {r.status}</div>
            <Link className="underline" to={`/reports/${r.id}`}>Open</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
