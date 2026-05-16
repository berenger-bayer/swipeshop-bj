'use client'
import { useState, useEffect } from 'react'
import { db, auth } from '@/lib/firebase'
import {
  collection, getDocs, updateDoc, doc, addDoc,
  serverTimestamp, query, orderBy, deleteDoc
} from 'firebase/firestore'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import {
  LogOut, Package, ShoppingBag, Settings as SettingsIcon,
  Plus, Trash2, Upload, Film, Image as ImageIcon, Music,
  CheckCircle2, X, Sparkles, AlertCircle, Loader2
} from 'lucide-react'
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

// ─── Composant toast léger ───────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000)
    return () => clearTimeout(t)
  }, [onClose])

  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold animate-in slide-in-from-bottom-4 duration-300 ${
      type === 'success'
        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    }`}>
      {type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100"><X size={14} /></button>
    </div>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'produits' | 'commandes' | 'settings'>('produits')
  const [produits, setProduits] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings>({
    whatsappNumber: '+2290155063713',
    shopName: 'SwipeShop Bénin',
    welcomeMessage: 'Bonjour, je suis intéressé(e) par vos produits !',
  })
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})

  // ── États pour feedback ──
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const router = useRouter()

  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    nom: '', description: '', prixVente: 4500,
    videoUrl: '', images: [], audioUrl: '', features: [], actif: true,
  })
  const [featureInput, setFeatureInput] = useState('')

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type })
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────
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
      console.error('Logout error:', err)
    }
  }

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchData = async () => {
    if (!db) {
      console.error('❌ Firestore db est null — vérifie .env.local')
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const pSnap = await getDocs(collection(db, 'produits'))
      setProduits(pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])

      const oSnap = await getDocs(
        query(collection(db, 'commandes'), orderBy('dateCommande', 'desc'))
      )
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[])
    } catch (err) {
      console.error('fetchData error:', err)
      showToast('Erreur de chargement des données', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchSettings = async () => {
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (!snap.empty) setSettings(snap.docs[0].data() as Settings)
    } catch (err) {
      console.error('fetchSettings error:', err)
    }
  }

  // ─── Upload Cloudinary ─────────────────────────────────────────────────────
  const uploadFile = async (file: File, type: 'video' | 'image' | 'audio'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', `products/${type}s`)

    setUploadProgress(prev => ({ ...prev, [file.name]: 10 }))

    const response = await fetch('/api/upload', { method: 'POST', body: formData })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Upload échoué')
    }

    const data = await response.json()
    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
    return data.secure_url as string
  }

  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'video' | 'image' | 'audio'
  ) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      if (type === 'image') {
        const urls = await Promise.all(Array.from(files).map(f => uploadFile(f, 'image')))
        setNewProduct(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }))
      } else if (type === 'video') {
        const url = await uploadFile(files[0], 'video')
        setNewProduct(prev => ({ ...prev, videoUrl: url }))
        showToast('Vidéo uploadée avec succès', 'success')
      } else if (type === 'audio') {
        const url = await uploadFile(files[0], 'audio')
        setNewProduct(prev => ({ ...prev, audioUrl: url }))
        showToast('Audio uploadé avec succès', 'success')
      }
    } catch (err) {
      console.error('Upload error:', err)
      showToast(err instanceof Error ? err.message : 'Erreur upload', 'error')
    }
  }

  // ─── Ajouter un produit ────────────────────────────────────────────────────
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    // FIX 1 : vérification db explicite avec message clair
    if (!db) {
      showToast('❌ Firestore non initialisé — vérifie tes variables NEXT_PUBLIC_ dans .env.local', 'error')
      console.error('db is null. Vérifie .env.local et relance npm run dev')
      return
    }

    if (!newProduct.nom.trim()) {
      showToast('Le nom du produit est requis', 'error')
      return
    }
    if (!newProduct.videoUrl) {
      showToast('Une vidéo est requise', 'error')
      return
    }

    setSubmitting(true)
    try {
      console.log('📝 Écriture Firestore...', newProduct)

      const docRef = await addDoc(collection(db, 'produits'), {
        nom: newProduct.nom.trim(),
        description: newProduct.description.trim(),
        prixVente: newProduct.prixVente,
        videoUrl: newProduct.videoUrl,
        images: newProduct.images || [],
        audioUrl: newProduct.audioUrl || '',
        features: newProduct.features || [],
        actif: newProduct.actif,
        dateCreation: serverTimestamp(),
      })

      console.log('✅ Produit créé, ID:', docRef.id)
      showToast('Produit ajouté avec succès !', 'success')

      // Reset
      setShowAddForm(false)
      setNewProduct({
        nom: '', description: '', prixVente: 4500,
        videoUrl: '', images: [], audioUrl: '', features: [], actif: true,
      })
      setUploadProgress({})
      fetchData()

    } catch (err: unknown) {
      console.error('❌ Firestore addDoc error:', err)
      const msg = err instanceof Error ? err.message : String(err)

      // FIX 2 : messages d'erreur lisibles selon le code Firebase
      if (msg.includes('permission-denied')) {
        showToast('❌ Permission refusée — va dans Firebase Console → Firestore → Règles et autorise les écritures', 'error')
      } else if (msg.includes('unauthenticated')) {
        showToast('❌ Non authentifié — reconnecte-toi', 'error')
      } else {
        showToast('Erreur Firestore : ' + msg, 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ─── Autres actions ────────────────────────────────────────────────────────
  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (snap.empty) {
        await addDoc(collection(db, 'settings'), settings as unknown as Record<string, unknown>)
      } else {
        await updateDoc(doc(db, 'settings', snap.docs[0].id), settings as unknown as Record<string, unknown>)
      }
      showToast('Paramètres enregistrés !', 'success')
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  const toggleActif = async (produit: Product) => {
    if (!db) return
    try {
      await updateDoc(doc(db, 'produits', produit.id), { actif: !produit.actif })
      fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?')) return
    if (!db) return
    try {
      await deleteDoc(doc(db, 'produits', id))
      showToast('Produit supprimé', 'success')
      fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setNewProduct(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }))
      setFeatureInput('')
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!db) return
    try {
      await updateDoc(doc(db, 'commandes', orderId), {
        statut: newStatus,
        dateModif: serverTimestamp(),
      })
      fetchData()
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erreur', 'error')
    }
  }

  // FIX 3 : le bouton submit ne doit PAS être bloqué par uploadProgress une fois à 100%
  const isUploading = Object.values(uploadProgress).some(p => p > 0 && p < 100)

  if (!authenticated && !loading) return null

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300 font-sans overflow-y-auto">
      {/* Toast global */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-4 py-8 pb-32">
        {/* Header */}
        <header className="sticky top-4 z-50 flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10 gap-6 glass-soft p-6 md:p-8 rounded-[40px] border border-glass-border shadow-soft backdrop-blur-xl">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-accent-indigo rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40">
              <Sparkles className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase">
                SWIPE<span className="text-accent-indigo">SHOP</span>
              </h1>
              <p className="text-[10px] text-card-text-muted font-black uppercase tracking-[0.2em]">Dashboard Admin</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
            <div className="flex bg-surface rounded-2xl p-1.5 shadow-inner border border-glass-border">
              {([
                { id: 'produits', label: 'Produits', icon: <ShoppingBag size={14} /> },
                { id: 'commandes', label: 'Commandes', icon: <Package size={14} /> },
                { id: 'settings', label: 'Paramètres', icon: <SettingsIcon size={14} /> },
              ] as const).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-6 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-background text-accent-indigo shadow-md'
                      : 'text-card-text-muted hover:text-accent-indigo'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="p-3 text-card-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-2xl transition-all border border-transparent hover:border-rose-100 dark:hover:border-rose-900/50"
              title="Déconnexion"
            >
              <LogOut size={20} />
            </button>
          </div>
        </header>

        {/* ── PRODUITS ── */}
        {activeTab === 'produits' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col sm:flex-row justify-between items-center bg-surface p-6 rounded-[32px] border border-glass-border gap-4">
              <div>
                <h2 className="text-2xl font-black text-foreground flex items-center space-x-3">
                  <span>Catalogue Produits</span>
                  <span className="bg-accent-indigo/10 text-accent-indigo text-[10px] px-3 py-1 rounded-full border border-accent-indigo/20">
                    {produits.length}
                  </span>
                </h2>
                <p className="text-xs text-card-text-muted mt-1 font-medium">Gérez vos articles et leur visibilité</p>
              </div>
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`px-8 py-4 rounded-2xl font-black text-sm flex items-center space-x-3 transition-all transform active:scale-95 shadow-xl ${
                  showAddForm
                    ? 'bg-surface text-rose-500 border-2 border-rose-100 hover:bg-rose-50'
                    : 'bg-accent-indigo text-white hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
                }`}
              >
                {showAddForm ? <X size={20} /> : <Plus size={20} />}
                <span>{showAddForm ? 'Fermer le formulaire' : 'Nouveau Produit'}</span>
              </button>
            </div>

            {/* Formulaire ajout */}
            {showAddForm && (
              <div className="glass-soft rounded-[48px] shadow-2xl p-6 md:p-10 border-2 border-accent-indigo/20 animate-in zoom-in-95 duration-500">
                <div className="flex items-center space-x-4 mb-10">
                  <div className="w-12 h-12 bg-accent-indigo/10 rounded-2xl flex items-center justify-center">
                    <Package className="text-accent-indigo" size={24} />
                  </div>
                  <h3 className="text-2xl font-black text-foreground">Créer un nouveau produit</h3>
                </div>

                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Nom */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Nom commercial</label>
                    <input
                      type="text" required
                      value={newProduct.nom}
                      onChange={e => setNewProduct({ ...newProduct, nom: e.target.value })}
                      className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[20px] outline-none transition-all text-foreground font-bold"
                      placeholder="ex: Fer à lisser 2-en-1"
                    />
                  </div>

                  {/* Prix */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Prix de vente (FCFA)</label>
                    <input
                      type="number" required min={0}
                      value={newProduct.prixVente}
                      onChange={e => setNewProduct({ ...newProduct, prixVente: parseInt(e.target.value) || 0 })}
                      className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[20px] outline-none transition-all text-foreground font-bold"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Description accrocheuse</label>
                    <textarea
                      required
                      value={newProduct.description}
                      onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[20px] outline-none transition-all text-foreground font-medium"
                      rows={3}
                      placeholder="Pourquoi vos clientes vont-elles l'adorer ?"
                    />
                  </div>

                  {/* Vidéo */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Vidéo Principale (Verticale)</label>
                    <div className="relative group">
                      <input type="file" accept="video/*" onChange={e => handleFileUpload(e, 'video')} className="hidden" id="video-upload" />
                      <label
                        htmlFor="video-upload"
                        className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-border-subtle rounded-[20px] hover:border-accent-indigo cursor-pointer transition-all bg-surface/50 group-hover:bg-accent-indigo/5"
                      >
                        {newProduct.videoUrl ? <CheckCircle2 className="text-emerald-500" /> : <Film className="text-card-text-muted" />}
                        <span className="text-xs font-bold text-card-text-muted">
                          {newProduct.videoUrl ? '✅ Vidéo prête' : 'Choisir une vidéo'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Images */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Images Galerie</label>
                    <div className="relative group">
                      <input type="file" accept="image/*" multiple onChange={e => handleFileUpload(e, 'image')} className="hidden" id="image-upload" />
                      <label
                        htmlFor="image-upload"
                        className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-border-subtle rounded-[20px] hover:border-accent-indigo cursor-pointer transition-all bg-surface/50 group-hover:bg-accent-indigo/5"
                      >
                        <ImageIcon className="text-card-text-muted" />
                        <span className="text-xs font-bold text-card-text-muted">
                          {newProduct.images?.length ? `✅ ${newProduct.images.length} image(s)` : 'Ajouter des photos'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Audio */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Son / Musique d&apos;ambiance</label>
                    <div className="relative group">
                      <input type="file" accept="audio/*" onChange={e => handleFileUpload(e, 'audio')} className="hidden" id="audio-upload" />
                      <label
                        htmlFor="audio-upload"
                        className="flex items-center justify-center space-x-3 p-6 border-2 border-dashed border-border-subtle rounded-[20px] hover:border-accent-indigo cursor-pointer transition-all bg-surface/50 group-hover:bg-accent-indigo/5"
                      >
                        {newProduct.audioUrl ? <CheckCircle2 className="text-emerald-500" /> : <Music className="text-card-text-muted" />}
                        <span className="text-xs font-bold text-card-text-muted">
                          {newProduct.audioUrl ? '✅ Son prêt' : 'Ajouter un son (optionnel)'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Features */}
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Points Forts</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={featureInput}
                        onChange={e => setFeatureInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                        className="flex-grow p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[20px] outline-none transition-all text-foreground text-xs"
                        placeholder="Ajouter une caractéristique..."
                      />
                      <button type="button" onClick={addFeature} className="p-4 bg-surface rounded-[20px] text-card-text-muted hover:text-accent-indigo transition-colors">
                        <Plus size={20} />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newProduct.features?.map((f, i) => (
                        <span key={i} className="text-[10px] font-bold bg-accent-indigo/10 text-accent-indigo px-3 py-1.5 rounded-full flex items-center space-x-2">
                          <span>{f}</span>
                          <button
                            type="button"
                            onClick={() => setNewProduct(prev => ({ ...prev, features: prev.features?.filter((_, idx) => idx !== i) }))}
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Progression uploads */}
                  {Object.keys(uploadProgress).length > 0 && (
                    <div className="md:col-span-2 space-y-2">
                      <p className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Uploads</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {Object.entries(uploadProgress).map(([name, progress]) => (
                          <div key={name} className="bg-surface p-3 rounded-xl flex flex-col space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-card-text-muted truncate max-w-[150px]">{name}</span>
                              <span className="text-[9px] font-black text-accent-indigo">{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-1 bg-border-subtle rounded-full overflow-hidden">
                              <div className="h-full bg-accent-indigo transition-all duration-300" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Submit — FIX : désactivé seulement pendant upload ou submit, pas après */}
                  <div className="md:col-span-2 pt-4">
                    <button
                      type="submit"
                      disabled={isUploading || submitting}
                      className="w-full bg-accent-indigo text-white p-5 rounded-[24px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 dark:shadow-none hover:bg-indigo-700 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
                    >
                      {submitting
                        ? <><Loader2 size={18} className="animate-spin" /> Enregistrement...</>
                        : isUploading
                        ? <><Loader2 size={18} className="animate-spin" /> Upload en cours...</>
                        : 'Enregistrer et mettre en ligne'
                      }
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Grille produits */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {loading
                ? Array(3).fill(0).map((_, i) => (
                    <div key={i} className="bg-surface/40 p-4 rounded-[32px] border border-glass-border animate-pulse h-[500px]" />
                  ))
                : produits.map(p => (
                    <div key={p.id} className="glass-soft rounded-[40px] shadow-soft border border-glass-border overflow-hidden group hover:shadow-2xl transition-all duration-500 flex flex-col">
                      <div className="aspect-[9/16] bg-black relative overflow-hidden">
                        <video
                          src={p.videoUrl}
                          className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                          muted loop playsInline
                          onMouseOver={e => e.currentTarget.play()}
                          onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }}
                        />
                        <div className="absolute top-5 left-5">
                          <button
                            onClick={() => toggleActif(p)}
                            className={`text-[9px] font-black uppercase px-4 py-2 rounded-full shadow-lg backdrop-blur-xl transition-all border ${
                              p.actif
                                ? 'bg-emerald-500/80 text-white border-emerald-400'
                                : 'bg-slate-500/80 text-white border-slate-400'
                            }`}
                          >
                            {p.actif ? 'Actif' : 'Masqué'}
                          </button>
                        </div>
                        <div className="absolute bottom-5 right-5 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-all translate-y-4 group-hover:translate-y-0">
                          <button
                            onClick={() => handleDeleteProduct(p.id)}
                            className="p-3 bg-surface/90 text-rose-500 rounded-2xl shadow-xl hover:bg-rose-500 hover:text-white transition-all"
                          >
                            <Trash2 size={18} />
                          </button>
                          <button className="p-3 bg-surface/90 text-accent-indigo rounded-2xl shadow-xl hover:bg-accent-indigo hover:text-white transition-all">
                            <Upload size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="p-8 flex-grow flex flex-col">
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-black text-xl text-foreground truncate flex-grow mr-2">{p.nom}</h3>
                          <span className="text-sm font-black text-accent-indigo whitespace-nowrap">{p.prixVente.toLocaleString()} F</span>
                        </div>
                        <p className="text-xs text-card-text-muted mb-6 line-clamp-3 leading-relaxed font-medium">{p.description}</p>
                        <div className="mt-auto pt-6 border-t border-border-subtle flex justify-between items-center">
                          <div className="flex -space-x-2">
                            {p.images?.slice(0, 3).map((img, idx) => (
                              <div key={idx} className="w-7 h-7 rounded-full border-2 border-background overflow-hidden bg-surface">
                                <img src={img} alt="" className="w-full h-full object-cover" />
                              </div>
                            ))}
                            {(p.images?.length || 0) > 3 && (
                              <div className="w-7 h-7 rounded-full bg-surface border-2 border-background flex items-center justify-center text-[8px] font-black text-card-text-muted">
                                +{p.images!.length - 3}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            {p.audioUrl && <Music size={14} className="text-accent-indigo" />}
                            <button className="text-[10px] font-black text-card-text-muted hover:text-accent-indigo uppercase tracking-widest transition-colors">
                              Modifier
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── COMMANDES ── */}
        {activeTab === 'commandes' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8">
            <h2 className="text-2xl font-black text-foreground flex items-center space-x-3">
              <span>Commandes</span>
              <span className="bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-300 text-[10px] px-3 py-1 rounded-full border border-rose-100 dark:border-rose-900/50">
                {orders.length}
              </span>
            </h2>
            <div className="glass-soft rounded-[40px] shadow-soft border border-glass-border overflow-hidden">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface border-b border-border-subtle">
                    {['Client / Contact', 'Article Commandé', 'État actuel', 'Actions'].map(h => (
                      <th key={h} className="p-8 text-[10px] font-black text-card-text-muted uppercase tracking-widest last:text-right">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {loading ? (
                    <tr><td colSpan={4} className="p-20 text-center">
                      <div className="w-10 h-10 border-4 border-border-subtle border-t-accent-indigo rounded-full animate-spin mx-auto" />
                    </td></tr>
                  ) : orders.length === 0 ? (
                    <tr><td colSpan={4} className="p-20 text-center text-card-text-muted font-bold italic">
                      Le silence est d&apos;or... mais pas pour le business !
                    </td></tr>
                  ) : orders.map(o => (
                    <tr key={o.id} className="hover:bg-accent-indigo/5 transition-colors">
                      <td className="p-8">
                        <div className="font-black text-foreground text-lg">{o.client.prenom}</div>
                        <div className="text-sm text-accent-indigo font-bold mt-1">{o.client.telephone}</div>
                        <div className="text-[10px] text-card-text-muted font-bold uppercase tracking-wider mt-1">{o.client.quartier}</div>
                      </td>
                      <td className="p-8">
                        <div className="font-bold text-card-text">{o.produitNom}</div>
                        <div className="text-sm font-black text-card-text-muted mt-1">{o.prixVente.toLocaleString()} FCFA</div>
                      </td>
                      <td className="p-8">
                        <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest inline-block ${
                          o.statut === 'livrée'       ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
                          : o.statut === 'en_livraison' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                          : o.statut === 'annulée'    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
                          : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50'
                        }`}>
                          {o.statut.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="p-8 text-right">
                        <select
                          value={o.statut}
                          onChange={e => updateOrderStatus(o.id, e.target.value)}
                          className="text-[10px] font-black border-2 border-border-subtle rounded-2xl p-3 bg-background text-foreground outline-none focus:border-accent-indigo transition-all cursor-pointer shadow-sm"
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

        {/* ── SETTINGS ── */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h2 className="text-2xl font-black text-foreground mb-8">Paramètres Boutique</h2>
            <div className="glass-soft rounded-[48px] shadow-2xl p-10 border border-glass-border">
              <form onSubmit={saveSettings} className="space-y-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Nom Public de la Boutique</label>
                  <input
                    type="text" required
                    value={settings.shopName}
                    onChange={e => setSettings({ ...settings, shopName: e.target.value })}
                    className="w-full p-5 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[24px] outline-none transition-all text-foreground font-black text-lg"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Numéro WhatsApp Réception</label>
                  <input
                    type="text" required
                    value={settings.whatsappNumber}
                    onChange={e => setSettings({ ...settings, whatsappNumber: e.target.value })}
                    className="w-full p-5 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[24px] outline-none transition-all text-foreground font-bold"
                  />
                  <p className="text-[10px] text-card-text-muted italic ml-1">ex: +22961000000</p>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest ml-1">Message de Bienvenue WhatsApp</label>
                  <textarea
                    required
                    value={settings.welcomeMessage}
                    onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })}
                    className="w-full p-5 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-[24px] outline-none transition-all text-foreground font-medium"
                    rows={4}
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-accent-indigo text-white p-6 rounded-[28px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-700 transition-all transform active:scale-[0.98]"
                >
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