'use client'
import { useState } from 'react'
import { auth } from '@/lib/firebase'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    
    try {
      if (!auth) throw new Error("Firebase Auth not initialized")
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/admin')
    } catch (err) {
      setError("Identifiants incorrects ou erreur de connexion.")
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-black italic">SWIPE SHOP</h1>
          <p className="text-gray-500 text-sm mt-2 font-medium uppercase tracking-widest">Espace Administration</p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-r-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase">Adresse Email</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-black outline-none transition-all"
              placeholder="admin@swipeshop.bj"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase">Mot de passe</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border-2 border-gray-100 rounded-xl focus:border-black outline-none transition-all"
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#fe2c55] hover:bg-[#e0244a] text-white p-4 rounded-xl font-bold uppercase tracking-widest transition-all transform active:scale-95 shadow-lg flex justify-center items-center"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : "Se connecter"}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-8">
          &copy; 2026 SwipeShop Bénin. Tous droits réservés.
        </p>
      </div>
    </div>
  )
}
