'use client'
import { useState, useEffect } from 'react'
import { db, auth, storage } from '@/lib/firebase'
import { collection, getDocs, updateDoc, doc, addDoc, serverTimestamp, query, orderBy, deleteDoc } from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { LogOut, Package, ShoppingBag, Settings as SettingsIcon, Plus, Trash2, Upload, Film, Image as ImageIcon, Music, CheckCircle2, X, Sparkles } from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
  images?: string[]
  audioUrl?: string
  features?: string[]
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
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const router = useRouter()
  
  // Form state
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    nom: '',
    description: '',
    prixVente: 4500,
    videoUrl: '',
    images: [],
    audioUrl: '',
    features: [],
    actif: true
  })
  
  const [featureInput, setFeatureInput] = useState('')

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

  const uploadFile = (file: File, type: 'video' | 'image' | 'audio'): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (!storage) return reject("Storage not initialized")
      
      const fileName = `${Date.now()}_${file.name}`
      const storageRef = ref(storage, `products/${type}s/${fileName}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on('state_changed', 
        (snapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          setUploadProgress(prev => ({ ...prev, [file.name]: progress }))
        }, 
        (error) => reject(error), 
        () => {
          getDownloadURL(uploadTask.snapshot.ref).then((downloadURL) => {
            resolve(downloadURL)
          })
        }
      )
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'audio') => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      if (type === 'image') {
        const uploadPromises = Array.from(files).map(file => uploadFile(file, 'image'))
        const urls = await Promise.all(uploadPromises)
        setNewProduct(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }))
      } else if (type === 'video') {
        const url = await uploadFile(files[0], 'video')
        setNewProduct(prev => ({ ...prev, videoUrl: url }))
      } else if (type === 'audio') {
        const url = await uploadFile(files[0], 'audio')
        setNewProduct(prev => ({ ...prev, audioUrl: url }))
      }
    } catch (err) {
      alert("Erreur lors de l'upload: " + (err instanceof Error ? err.message : String(err)))
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
        const refSetting = doc(db, 'settings', snap.docs[0].id)
        await updateDoc(refSetting, settings as unknown as Record<string, unknown>)
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

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Supprimer ce produit ?")) return
    if (!db) return
    try {
      await deleteDoc(doc(db, 'produits', id))
      fetchData()
    } catch (err) {
      alert(err instanceof Error ? err.message : String(err))
    }
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setNewProduct(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }))
      setFeatureInput('')
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
      setNewProduct({ nom: '', description: '', prixVente: 4500, videoUrl: '', images: [], audioUrl: '', features: [], actif: true })
      setUploadProgress({})
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
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <header className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 glass-soft p-8 rounded-[40px] border border-white/60 shadow-soft">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase">SWIPE<span className="text-indigo-600 dark:text-indigo-400">SHOP</span></h1>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Dashboard Admin</p>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-slate-100 dark:bg-slate-800/50 rounded-2xl p-1.5 shadow-inner">
              {[
                { id: 'produits', label: 'Produits', icon: <ShoppingBag size={14} /> },
                { id: 'commandes', label: 'Commandes', icon: <Package size={14} /> },
                { id: 'settings', label: 'Paramètres', icon: <SettingsIcon size={14} /> },
              ].map((tab) => (
                <button 
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as 'produits' | 'commandes' | 'settings')}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-md' : 'text-slate-500 hover:text-indigo-500'}`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            
            <ThemeToggle />
            
            <button 
              onClick={handleLogout}
              className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {activeTab === 'produits' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center space-x-3">
                <span>Catalogue</span>
                <span className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/50">{produits.length}</span>
              </h2>
              <button 
                onClick={() => setShowAddForm(!showAddForm)}
                className="bg-indigo-600 dark:bg-indigo-500 text-white px-6 py-3.5 rounded-2xl font-bold text-xs flex items-center space-x-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 dark:shadow-none active:scale-95"
              >
                {showAddForm ? <X size={18} /> : <Plus size={18} />}
                <span>{showAddForm ? 'Annuler' : 'Ajouter un produit'}</span>
              </button>
            </div>

            {showAddForm && (
              <div className="glass-soft rounded-[48px] shadow-2xl p-10 border border-white/80 dark:border-white/5 animate-in zoom-in-95 duration-500">
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 mb-8">Nouveau Produit Immersif</h3>
                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nom commercial</label>
                    <input 
                      type="text" required
                      value={newProduct.nom}
                      onChange={e => setNewProduct({...newProduct, nom: e.target.value})}
                      className="w-full p-4 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[20px] outline-none transition-all dark:text-slate-200 font-bold"
                      placeholder="ex: Fer à lisser 2-en-1"
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Prix de vente (FCFA)</label>
                    <input 
                      type="number" required
                      value={newProduct.prixVente}
                      onChange={e => setNewProduct({...newProduct, prixVente: parseInt(e.target.value) || 0})}
                      className="w-full p-4 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[20px] outline-none transition-all dark:text-slate-200 font-bold"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Description accrocheuse</label>
                    <textarea 
                      required
                      value={newProduct.description}
                      onChange={e => setNewProduct({...newProduct, description: e.target.value})}
                      className="w-full p-4 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[20px] outline-none transition-all dark:text-slate-200 font-medium"
                      rows={3}
                      placeholder="Pourquoi vos clientes vont-elles l'adorer ?"
                    />
                  </div>
                  
                  {/* Media Uploads */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Vidéo Principale (Verticale)</label>
                    <div className="relative group">
                      <input type="file" accept="video/*" onChange={e => handleFileUpload(e, 'video')} className="hidden" id="video-upload" />
                      <label htmlFor="video-upload" className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[20px] hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-all bg-white/30 dark:bg-slate-800/30 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10">
                        {newProduct.videoUrl ? <CheckCircle2 className="text-emerald-500" /> : <Film className="text-slate-400" />}
                        <span className="text-xs font-bold text-slate-500">{newProduct.videoUrl ? 'Vidéo prête' : 'Choisir une vidéo'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Images Galerie (Plusieurs possible)</label>
                    <div className="relative group">
                      <input type="file" accept="image/*" multiple onChange={e => handleFileUpload(e, 'image')} className="hidden" id="image-upload" />
                      <label htmlFor="image-upload" className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[20px] hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-all bg-white/30 dark:bg-slate-800/30 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10">
                        <ImageIcon className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-500">{newProduct.images?.length ? `${newProduct.images.length} images ajoutées` : 'Ajouter des photos'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Son / Musique d&apos;ambiance</label>
                    <div className="relative group">
                      <input type="file" accept="audio/*" onChange={e => handleFileUpload(e, 'audio')} className="hidden" id="audio-upload" />
                      <label htmlFor="audio-upload" className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[20px] hover:border-indigo-500 dark:hover:border-indigo-400 cursor-pointer transition-all bg-white/30 dark:bg-slate-800/30 group-hover:bg-indigo-50/30 dark:group-hover:bg-indigo-900/10">
                        {newProduct.audioUrl ? <CheckCircle2 className="text-emerald-500" /> : <Music className="text-slate-400" />}
                        <span className="text-xs font-bold text-slate-500">{newProduct.audioUrl ? 'Son prêt' : 'Ajouter un son'}</span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Points Forts (Features)</label>
                    <div className="flex space-x-2">
                        <input 
                            type="text" 
                            value={featureInput}
                            onChange={e => setFeatureInput(e.target.value)}
                            onKeyPress={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                            className="flex-grow p-4 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[20px] outline-none transition-all dark:text-slate-200 text-xs"
                            placeholder="Ajouter une caractéristique..."
                        />
                        <button type="button" onClick={addFeature} className="p-4 bg-slate-200 dark:bg-slate-800 rounded-[20px] text-slate-600 dark:text-slate-300"><Plus size={20}/></button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {newProduct.features?.map((f, i) => (
                            <span key={i} className="text-[10px] font-bold bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full flex items-center space-x-2">
                                <span>{f}</span>
                                <button type="button" onClick={() => setNewProduct(prev => ({ ...prev, features: prev.features?.filter((_, idx) => idx !== i) }))}><X size={10}/></button>
                            </span>
                        ))}
                    </div>
                  </div>

                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="md:col-span-2 space-y-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut des uploads</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {Object.entries(uploadProgress).map(([name, progress]) => (
                                <div key={name} className="bg-slate-100 dark:bg-slate-800 p-3 rounded-xl flex flex-col space-y-1">
                                    <div className="flex justify-between items-center">
                                        <span className="text-[9px] font-bold text-slate-500 truncate max-w-[150px]">{name}</span>
                                        <span className="text-[9px] font-black text-indigo-500">{Math.round(progress)}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                  )}

                  <div className="md:col-span-2 pt-4">
                    <button type="submit" className="w-full bg-indigo-600 dark:bg-indigo-500 text-white p-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-200 dark:shadow-none hover:bg-indigo-700 transition-all transform active:scale-[0.98]">
                      Enregistrer et mettre en ligne
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading ? (
                Array(3).fill(0).map((_, i) => (
                  <div key={i} className="bg-white/40 dark:bg-slate-800/40 p-4 rounded-[32px] border border-white/20 animate-pulse h-[500px]" />
                ))
              ) : produits.map(p => (
                <div key={p.id} className="glass-soft rounded-[40px] shadow-soft border border-white/60 dark:border-white/5 overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col">
                  <div className="aspect-[9/16] bg-slate-200 dark:bg-slate-900 relative overflow-hidden">
                    <video src={p.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" muted loop playsInline onMouseOver={e => e.currentTarget.play()} onMouseOut={e => e.currentTarget.pause()} />
                    
                    {/* Badge Status */}
                    <div className="absolute top-5 left-5">
                      <button 
                        onClick={() => toggleActif(p)}
                        className={`text-[9px] font-black uppercase px-4 py-2 rounded-full shadow-lg backdrop-blur-xl transition-all border ${p.actif ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-slate-500/80 text-white border-slate-400'}`}
                      >
                        {p.actif ? 'Actif' : 'Masqué'}
                      </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="absolute bottom-5 right-5 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                        <button 
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-3 bg-white/90 dark:bg-slate-800/90 text-rose-500 rounded-2xl shadow-xl hover:bg-rose-500 hover:text-white transition-all"
                        >
                            <Trash2 size={18} />
                        </button>
                        <button className="p-3 bg-white/90 dark:bg-slate-800/90 text-indigo-500 rounded-2xl shadow-xl hover:bg-indigo-500 hover:text-white transition-all">
                            <Upload size={18} />
                        </button>
                    </div>
                  </div>

                  <div className="p-8 flex-grow flex flex-col">
                    <div className="flex justify-between items-start mb-3">
                        <h3 className="font-black text-xl text-slate-800 dark:text-slate-100 truncate flex-grow mr-2">{p.nom}</h3>
                        <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 whitespace-nowrap">{p.prixVente.toLocaleString()} F</span>
                    </div>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-6 line-clamp-3 leading-relaxed font-medium">{p.description}</p>
                    
                    <div className="mt-auto pt-6 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center">
                      <div className="flex -space-x-2">
                        {p.images?.slice(0, 3).map((img, idx) => (
                            <div key={idx} className="w-7 h-7 rounded-full border-2 border-white dark:border-slate-800 overflow-hidden bg-slate-100">
                                <img src={img} alt={`Produit media ${idx}`} className="w-full h-full object-cover" />
                            </div>
                        ))}
                        {(p.images?.length || 0) > 3 && (
                            <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 border-2 border-white dark:border-slate-800 flex items-center justify-center text-[8px] font-black text-slate-400">
                                +{p.images!.length - 3}
                            </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-3">
                        {p.audioUrl && <Music size={14} className="text-indigo-400" />}
                        <button className="text-[10px] font-black text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 uppercase tracking-widest transition-colors">Modifier</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'commandes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center space-x-3">
              <span>Commandes</span>
              <span className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-[10px] px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">{orders.length}</span>
            </h2>
            <div className="glass-soft rounded-[40px] shadow-soft border border-white/60 dark:border-white/5 overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                    <th className="p-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Client / Contact</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Article Commandé</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">État actuel</th>
                    <th className="p-8 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center"><div className="w-10 h-10 border-4 border-slate-100 border-t-indigo-600 rounded-full animate-spin mx-auto" /></td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={4} className="p-20 text-center text-slate-400 font-bold italic">Le silence est d&apos;or... mais pas pour le business !</td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} className="hover:bg-indigo-50/20 dark:hover:bg-indigo-900/5 transition-colors">
                      <td className="p-8">
                        <div className="font-black text-slate-800 dark:text-slate-200 text-lg">{o.client.prenom}</div>
                        <div className="text-sm text-indigo-500 dark:text-indigo-400 font-bold mt-1">{o.client.telephone}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">{o.client.quartier}</div>
                      </td>
                      <td className="p-8">
                        <div className="font-bold text-slate-700 dark:text-slate-300">{o.produitNom}</div>
                        <div className="text-sm font-black text-slate-400 mt-1">{o.prixVente.toLocaleString()} FCFA</div>
                      </td>
                      <td className="p-8">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block ${
                          o.statut === 'livrée' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50' : 
                          o.statut === 'en_livraison' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50' : 
                          o.statut === 'annulée' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50' :
                          'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                        }`}>
                          {o.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <select 
                          value={o.statut}
                          onChange={(e) => updateOrderStatus(o.id, e.target.value)}
                          className="text-[10px] font-black border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-3 bg-white dark:bg-slate-900 dark:text-slate-300 outline-none focus:border-indigo-500 transition-all cursor-pointer shadow-sm"
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
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 mb-8">Paramètres Boutique</h2>
            <div className="glass-soft rounded-[48px] shadow-2xl p-10 border border-white/80 dark:border-white/5">
              <form onSubmit={saveSettings} className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Nom Public de la Boutique</label>
                  <input 
                    type="text" required
                    value={settings.shopName}
                    onChange={e => setSettings({...settings, shopName: e.target.value})}
                    className="w-full p-5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[24px] outline-none transition-all dark:text-slate-200 font-black text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Numéro WhatsApp Réception</label>
                  <input 
                    type="text" required
                    value={settings.whatsappNumber}
                    onChange={e => setSettings({...settings, whatsappNumber: e.target.value})}
                    className="w-full p-5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[24px] outline-none transition-all dark:text-slate-200 font-bold"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic ml-1">Indispensable pour recevoir les commandes (ex: +22961000000)</p>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Message de Bienvenue WhatsApp</label>
                  <textarea 
                    required
                    value={settings.welcomeMessage}
                    onChange={e => setSettings({...settings, welcomeMessage: e.target.value})}
                    className="w-full p-5 bg-slate-50/50 dark:bg-slate-900/50 border-2 border-transparent focus:border-indigo-500 rounded-[24px] outline-none transition-all dark:text-slate-200 font-medium"
                    rows={4}
                  />
                </div>
                <button type="submit" className="w-full bg-black dark:bg-indigo-600 text-white p-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 transition-all transform active:scale-[0.98]">
                  Enregistrer tout
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
