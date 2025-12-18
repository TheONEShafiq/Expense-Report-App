import { Routes, Route, Link } from 'react-router-dom'
import Login from './pages/Login'
import AdminNotifications from './pages/admin/Notifications'
import AdminHome from './pages/admin/Home'
import ApproverHome from './pages/approver/Home'
import EmployeeHome from './pages/employee/Home'
import WeeklyReport from './pages/employee/WeeklyReport'

export default function App(){
  return (
    <div className="min-h-screen">
      <nav className="p-3 flex gap-4 border-b border-[#2B323A]">
        <Link to="/">Home</Link>
        <Link to="/admin">Admin</Link>
        <Link to="/approver">Approver</Link>
        <Link to="/employee">Employee</Link>
        <Link to="/admin/notifications">Notifications</Link>
        <Link to="/login">Login</Link>
      </nav>
      <div className="p-4">
        <Routes>
          <Route path="/" element={<EmployeeHome />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminHome />} />
          <Route path="/admin/notifications" element={<AdminNotifications />} />
          <Route path="/approver" element={<ApproverHome />} />
          <Route path="/employee" element={<EmployeeHome />} />
          <Route path="/reports/:id" element={<WeeklyReport />} />
        </Routes>
      </div>
    </div>
  )
}
