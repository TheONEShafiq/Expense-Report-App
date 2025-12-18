import { useParams } from 'react-router-dom'
import { SubmitReportButton } from '../../components/SubmitReportButton'

export default function WeeklyReport(){
  const { id } = useParams()
  const reportId = Number(id)
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Weekly Report #{reportId}</h1>
      <div className="card">
        <p>Lines, receipts, totals would be shown here.</p>
        <div className="mt-4 flex justify-end">
          <SubmitReportButton reportId={reportId} />
        </div>
      </div>
    </div>
  )
}
