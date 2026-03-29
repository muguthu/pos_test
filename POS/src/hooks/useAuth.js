import { useState, useEffect } from 'react'

const defaultUsers = [
  {id:'u1', username:'admin', name:'Admin', role:'manager', password:'admin'},
  {id:'u2', username:'bob', name:'Bob Staff', role:'staff', password:'pass'},
  {id:'u3', username:'sue', name:'Sue Staff', role:'staff', password:'pass'}
  ]

export default function useAuth(){
  const [users, setUsers] = useState(()=>{
    try{
      const raw = localStorage.getItem('pos_users')
      const parsed = raw ? JSON.parse(raw) : defaultUsers
      // ensure there is an admin user with username/password 'admin'
      let usersList = parsed
      if(!usersList.find(u=> u.username === 'admin')){
        const manager = usersList.find(u=> u.role === 'manager')
        if(manager){
          usersList = usersList.map(u => u.id === manager.id ? {...u, username:'admin', password:'admin', name: 'Admin'} : u)
        }else{
          usersList = [{id:'u_admin', username:'admin', name:'Admin', role:'manager', password:'admin'}, ...usersList]
        }
      }
      return usersList
    }catch(e){ return defaultUsers }
  })
  const [user, setUser] = useState(()=>{
    try{ const raw = localStorage.getItem('pos_user'); return raw ? JSON.parse(raw) : null }catch(e){ return null }
  })

  useEffect(()=>{ try{ localStorage.setItem('pos_users', JSON.stringify(users)) }catch(e){} }, [users])
  useEffect(()=>{ try{ localStorage.setItem('pos_user', JSON.stringify(user)) }catch(e){} }, [user])

  const login = (username, password) => {
    const u = users.find(x=> x.username === username && x.password === password)
    if(u){ setUser(u); return true }
    return false
  }

  const logout = ()=> setUser(null)

  const addUser = (u) => { setUsers(prev => [u, ...prev]) }
  const updateUser = (id, changes) => setUsers(prev => prev.map(x=> x.id === id ? {...x, ...changes} : x))
  const removeUser = (id) => setUsers(prev => prev.filter(x=> x.id !== id))

  const isManager = () => user && user.role === 'manager'

  return { users, user, login, logout, addUser, updateUser, removeUser, isManager }
}
