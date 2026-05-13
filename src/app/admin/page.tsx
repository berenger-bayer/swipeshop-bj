'use client'
import { useState, useEffect } from 'react'
import { db, isConfigValid, auth } from '@/lib/firebase'
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { LogOut, Package, ShoppingBag, Settings as SettingsIcon, Plus } from 'lucide-react'

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
  actif: boolean
}

interface Order {
  id: string
  produitNom: string
  prixVente: number
  client: {
    prenom: string
    telephone: string
    quartier: string
  }
  statut: string
  dateCommande: { seconds: number; nanoseconds: number } | null
}

interface Settings {
  whatsappNumber: string
  shopName: string
  welcomeMessage: string
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'produits' | 'commandes' | 'settings'>('produits')
  const [produits, setProduits] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings>({
    whatsappNumber: '+2290155063713',
    shopName: 'SwipeShop Bénin',
    welcomeMessage: 'Bonjour, je suis intéressé(e) par vos produits !'
  })
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const router = useRouter()
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState({
    nom: '',
    description: '',
    prixVente: 4500,
    videoUrl: '',
    actif: true
  })

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthenticated(true)
        fetchData()
        fetchSettings()
      } else {
        router.push('/login')
      }
    })

    return () => unsubscribe()
  }, [router])

  const handleLogout = async () => {
    if (!auth) return
    try {
      await signOut(auth)
      router.push('/login')
    } catch (err) {
      console.error("Logout error:", err)
    }
  }

  const fetchData = async () => {
    if (!db) return
    setLoading(true)
    try {
      const pSnap = await getDocs(collection(db, 'produits'))
      const pData = pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]
      setProduits(pData)

      const oSnap = await getDocs(query(collection(db, 'commandes'), orderBy('dateCommande', 'desc')))
      const oData = oSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[]
      setOrders(oData)
    } catch (err) {
      console.error("Error fetching data:", err)
      alert("Erreur lors de la récupération des données")
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (!snap.empty) {
        setSettings(snap.docs[0].data() as Settings)
      }
    } catch (err) {
      console.error("Error fetching settings:", err)
    }
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (snap.empty) {
        await addDoc(collection(db, 'settings'), settings as unknown as Record<string, unknown>)
      } else {
        const ref = doc(db, 'settings', snap.docs[0].id)
        await updateDoc(ref, settings as unknown as Record<string, unknown>)
      }
      alert("Paramètres enregistrés !")
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const toggleActif = async (produit: Product) => {
    if (!db) return
    try {
      const ref = doc(db, 'produits', produit.id)
      await updateDoc(ref, { actif: !produit.actif })
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    try {
      await addDoc(collection(db, 'produits'), {
        ...newProduct,
        dateCreation: serverTimestamp()
      })
      setShowAddForm(false)
      setNewProduct({ nom: '', description: '', prixVente: 4500, videoUrl: '', actif: true })
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!db) return
    try {
      const ref = doc(db, 'commandes', orderId)
      await updateDoc(ref, { statut: newStatus, dateModif: serverTimestamp() })
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  if (!authenticated && !loading) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-900">
      <div className="max-w-6xl mx-auto">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
              <Package className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black italic">SWIPE SHOP</h1>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Administration</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 w-full md:w-auto">
            <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner flex-grow md:flex-grow-0">
              <button 
                onClick={() => setActiveTab('produits')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'produits' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <ShoppingBag size={14} />
                <span>Produits</span>
              </button>
              <button 
                onClick={() => setActiveTab('commandes')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'commandes' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <Package size={14} />
                <span>Commandes</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === 'settings' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-black'}`}
              >
                <SettingsIcon size={14} />
                <span>Paramètres</span>
              </button>
            </div>
            
            <button 
              onClick={handleLogout}
              className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>
        
        {!isConfigValid && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-r-xl shadow-sm">
            <p className="font-bold">Configuration manquante</p>
            <p className="text-sm">Veuillez configurer vos variables d&apos;environnement Firebase.</p>
          </div>
        )}

        {activeTab === 'produits' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold flex items-center space-x-2">
                <span>Gestion des Produits</span>
                <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">{produits.length}</span>
              </h2>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-black text-white px-4 py-2.5 rounded-xl font-bold text-xs flex items-center space-x-2 hover:bg-gray-800 transition-all shadow-lg active:scale-95"
              >
                <Plus size={16} />
                <span>{showAddForm ? 'Annuler' : 'Nouveau'}</span>
              </button>
            </div>

            {showAddForm && (
              <div className="bg-white rounded-2xl shadow-xl p-8 mb-8 border border-gray-100 animate-in zoom-in-95 duration-300">
                <h3 className="text-lg font-bold mb-6">Ajouter un nouveau produit</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom du produit</label>
                    <input 
                      type="text" required
                      value={newProduct.nom}
                      onChange={e => setNewProduct({...newProduct, nom: e.target.value})}
                      className="w-full p-3 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="ex: Fer à lisser 2-en-1"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Prix (FCFA)</label>
                    <input 
                      type="number" required
                      value={newProduct.prixVente}
                      onChange={e => setNewProduct({...newProduct, prixVente: parseInt(e.target.value)})}
                      className="w-full p-3 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description courte</label>
                    <textarea 
                      required
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full p-3 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white"
                      rows={2}
                      placeholder="Décrivez les bénéfices du produit..."
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">URL de la vidéo (TikTok, Firebase, Cloudinary...)</label>
                    <input 
                      type="url" required
                      value={newProduct.videoUrl}
                      onChange={e => setNewProduct({...newProduct, videoUrl: e.target.value})}
                      className="w-full p-3 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white"
                      placeholder="https://..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <button type="submit" className="w-full bg-[#fe2c55] text-white p-4 rounded-xl font-black uppercase tracking-widest shadow-lg hover:bg-[#e0244a] transition-all active:scale-[0.98]">
                      Enregistrer dans le feed
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 animate-pulse h-80" />
                ))
              ) : produits.map(p => (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden group hover:shadow-xl transition-all duration-300">
                  <div className="aspect-[9/16] bg-black relative overflow-hidden">
                    <video src={p.videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted loop playsInline />
                    <div className="absolute top-4 right-4">
                      <button 
                        onClick={() => toggleActif(p)}
                        className={`text-[10px] font-black uppercase px-3 py-1.5 rounded-full shadow-lg backdrop-blur-md transition-all ${p.actif ? 'bg-green-500/90 text-white' : 'bg-red-500/90 text-white'}`}
                      >
                        {p.actif ? 'En ligne' : 'Masqué'}
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <h3 className="font-bold text-lg mb-1 truncate">{p.nom}</h3>
                    <p className="text-xs text-gray-400 mb-4 line-clamp-2 leading-relaxed">{p.description}</p>
                    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
                      <span className="font-black text-black">{p.prixVente.toLocaleString()} FCFA</span>
                      <button className="text-[10px] font-bold text-gray-400 hover:text-black uppercase tracking-widest">Modifier</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commandes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6 flex items-center space-x-2">
              <span>Gestion des Commandes</span>
              <span className="bg-black text-white text-[10px] px-2 py-0.5 rounded-full">{orders.length}</span>
            </h2>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Client</th>
                    <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produit</th>
                    <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">Statut</th>
                    <th className="p-5 text-[10px] font-bold text-gray-400 uppercase tracking-widest text-right">Mise à jour</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr><td colSpan={4} className="p-10 text-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin mx-auto" /></td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={4} className="p-10 text-center text-gray-400 font-medium italic">Aucune commande enregistrée pour le moment</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                      <td className="p-5">
                        <div className="font-bold text-black">{o.client.prenom}</div>
                        <div className="text-xs text-gray-500 font-medium">{o.client.telephone}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{o.client.quartier}</div>
                      </td>
                      <td className="p-5 text-xs">
                        <div className="font-bold text-gray-700">{o.produitNom}</div>
                        <div className="text-gray-400 font-medium">{o.prixVente.toLocaleString()} FCFA</div>
                      </td>
                      <td className="p-5">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          o.statut === 'livrée' ? 'bg-green-100 text-green-700' : 
                          o.statut === 'en_livraison' ? 'bg-blue-100 text-blue-700' : 
                          o.statut === 'annulée' ? 'bg-red-100 text-red-700' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {o.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-5 text-right">
                        <select 
                          value={o.statut}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="text-[10px] font-bold border-2 border-gray-100 rounded-lg p-2 bg-white outline-none focus:border-black transition-all cursor-pointer"
                        >
                          <option value="en_attente">En attente</option>
                          <option value="en_livraison">En livraison</option>
                          <option value="livrée">Livrée</option>
                          <option value="annulée">Annulée</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold mb-6">Paramètres Généraux</h2>
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <form onSubmit={saveSettings} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Nom de votre boutique</label>
                  <input 
                    type="text" required
                    value={settings.shopName}
                    onChange={e => setSettings({...settings, shopName: e.target.value})}
                    className="w-full p-4 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Numéro WhatsApp Réception</label>
                  <input 
                    type="text" required
                    value={settings.whatsappNumber}
                    onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                    className="w-full p-4 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white font-bold"
                  />
                  <p className="text-[10px] text-gray-400 italic">Format : +229XXXXXXXX</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message pré-rempli client</label>
                  <textarea 
                    required
                    value={settings.welcomeMessage}
                    onChange={e => setSettings({...settings, welcomeMessage: e.target.value})}
                    className="w-full p-4 border-2 border-gray-50 rounded-xl focus:border-black outline-none transition-all bg-gray-50 focus:bg-white font-medium"
                    rows={4}
                  />
                </div>
                <button type="submit" className="w-full bg-black text-white p-5 rounded-xl font-black uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all transform active:scale-[0.98]">
                  Enregistrer les modifications
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
