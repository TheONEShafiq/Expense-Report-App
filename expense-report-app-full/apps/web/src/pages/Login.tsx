import { useState } from 'react'
import { api } from '../lib/api'
import { useToast } from '../components/toast/ToastProvider'

export default function Login(){
  const { push } = useToast()
  const [email,setEmail] = useState('admin@example.com')
  const [password,setPassword] = useState('admin123')
  async function onSubmit(e:any){
    e.preventDefault()
    try{
      await api.post('/auth/login', { email, password })
      push({ title:'Logged in', variant:'success' })
      window.location.href = '/'
    }catch(e:any){
      push({ title:'Login failed', description:String(e), variant:'error' })
    }
  }
  return (
    <div className="max-w-sm mx-auto card mt-10">
      <h1 className="text-xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="mt-4 space-y-3">
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="email" />
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password" />
        <button>Login</button>
      </form>
    </div>
  )
}
