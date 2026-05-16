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
  CheckCircle2, X, Sparkles, AlertCircle, Loader2, LayoutGrid,
  TrendingUp, Eye, EyeOff
} from 'lucide-react'
import { ThemeToggle } from '@/components/ThemeToggle'

interface Product {
  id: string; nom: string; description: string; prixVente: number
  videoUrl: string; images?: string[]; audioUrl?: string
  features?: string[]; actif: boolean
}
interface Order {
  id: string; produitNom: string; prixVente: number
  client: { prenom: string; telephone: string; quartier: string }
  statut: string
  dateCommande: { seconds: number; nanoseconds: number } | null
}
interface Settings { whatsappNumber: string; shopName: string; welcomeMessage: string }

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [onClose])
  return (
    <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl border text-sm font-bold animate-in slide-in-from-bottom-4 duration-300 max-w-sm ${
      type === 'success'
        ? 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        : 'bg-rose-50 dark:bg-rose-900/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
    }`}>
      {type === 'success' ? <CheckCircle2 size={18} className="shrink-0" /> : <AlertCircle size={18} className="shrink-0" />}
      <span className="flex-1">{message}</span>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 shrink-0"><X size={14} /></button>
    </div>
  )
}

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: string }) {
  return (
    <div className={`rounded-2xl p-4 border flex items-center gap-3 ${color}`}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white/20">{icon}</div>
      <div>
        <p className="text-xs font-bold opacity-70">{label}</p>
        <p className="text-xl font-black">{value}</p>
      </div>
    </div>
  )
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'produits' | 'commandes' | 'settings'>('produits')
  const [produits, setProduits] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [settings, setSettings] = useState<Settings>({
    whatsappNumber: '+2290155063713', shopName: 'SwipeShop Bénin',
    welcomeMessage: 'Bonjour, je suis intéressé(e) par vos produits !',
  })
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newProduct, setNewProduct] = useState<Omit<Product, 'id'>>({
    nom: '', description: '', prixVente: 4500, videoUrl: '',
    images: [], audioUrl: '', features: [], actif: true,
  })
  const [featureInput, setFeatureInput] = useState('')
  const router = useRouter()

  const showToast = (message: string, type: 'success' | 'error') => setToast({ message, type })

  useEffect(() => {
    if (!auth) { setLoading(false); return }
    const unsub = onAuthStateChanged(auth, user => {
      if (user) { setAuthenticated(true); fetchData(); fetchSettings() }
      else router.push('/login')
    })
    return () => unsub()
  }, [router])

  const handleLogout = async () => {
    if (!auth) return
    await signOut(auth).catch(console.error)
    router.push('/login')
  }

  const fetchData = async () => {
    if (!db) { setLoading(false); return }
    setLoading(true)
    try {
      const [pSnap, oSnap] = await Promise.all([
        getDocs(collection(db, 'produits')),
        getDocs(query(collection(db, 'commandes'), orderBy('dateCommande', 'desc')))
      ])
      setProduits(pSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[])
      setOrders(oSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Order[])
    } catch (err) {
      console.error('fetchData error:', err)
      showToast('Erreur de chargement', 'error')
    } finally { setLoading(false) }
  }

  const fetchSettings = async () => {
    if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (!snap.empty) setSettings(snap.docs[0].data() as Settings)
    } catch {}
  }

  const uploadFile = async (file: File, type: 'video' | 'image' | 'audio'): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', `products/${type}s`)
    setUploadProgress(prev => ({ ...prev, [file.name]: 10 }))
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Upload échoué') }
    const data = await res.json()
    setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
    return data.secure_url as string
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'image' | 'audio') => {
    const files = e.target.files
    if (!files?.length) return
    try {
      if (type === 'image') {
        const urls = await Promise.all(Array.from(files).map(f => uploadFile(f, 'image')))
        setNewProduct(prev => ({ ...prev, images: [...(prev.images || []), ...urls] }))
        showToast(`${urls.length} image(s) uploadée(s)`, 'success')
      } else if (type === 'video') {
        const url = await uploadFile(files[0], 'video')
        setNewProduct(prev => ({ ...prev, videoUrl: url }))
        showToast('Vidéo prête ✓', 'success')
      } else {
        const url = await uploadFile(files[0], 'audio')
        setNewProduct(prev => ({ ...prev, audioUrl: url }))
        showToast('Audio prêt ✓', 'success')
      }
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur upload', 'error') }
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!db) { showToast('Firestore non initialisé', 'error'); return }
    if (!newProduct.nom.trim()) { showToast('Nom requis', 'error'); return }
    if (!newProduct.videoUrl) { showToast('Vidéo requise', 'error'); return }
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'produits'), {
        ...newProduct, nom: newProduct.nom.trim(),
        description: newProduct.description.trim(),
        dateCreation: serverTimestamp(),
      })
      showToast('Produit mis en ligne !', 'success')
      setShowAddForm(false)
      setNewProduct({ nom: '', description: '', prixVente: 4500, videoUrl: '', images: [], audioUrl: '', features: [], actif: true })
      setUploadProgress({})
      fetchData()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('permission-denied')) showToast('Permission refusée — vérifie les règles Firestore', 'error')
      else showToast('Erreur : ' + msg, 'error')
    } finally { setSubmitting(false) }
  }

  const saveSettings = async (e: React.FormEvent) => {
    e.preventDefault(); if (!db) return
    try {
      const snap = await getDocs(collection(db, 'settings'))
      if (snap.empty) await addDoc(collection(db, 'settings'), settings as unknown as Record<string, unknown>)
      else await updateDoc(doc(db, 'settings', snap.docs[0].id), settings as unknown as Record<string, unknown>)
      showToast('Paramètres enregistrés !', 'success')
    } catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error') }
  }

  const toggleActif = async (p: Product) => {
    if (!db) return
    try { await updateDoc(doc(db, 'produits', p.id), { actif: !p.actif }); fetchData() }
    catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error') }
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Supprimer ce produit ?') || !db) return
    try { await deleteDoc(doc(db, 'produits', id)); showToast('Produit supprimé', 'success'); fetchData() }
    catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error') }
  }

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    if (!db) return
    try { await updateDoc(doc(db, 'commandes', orderId), { statut: newStatus, dateModif: serverTimestamp() }); fetchData() }
    catch (err) { showToast(err instanceof Error ? err.message : 'Erreur', 'error') }
  }

  const addFeature = () => {
    if (featureInput.trim()) {
      setNewProduct(prev => ({ ...prev, features: [...(prev.features || []), featureInput.trim()] }))
      setFeatureInput('')
    }
  }

  const isUploading = Object.values(uploadProgress).some(p => p > 0 && p < 100)
  const activeCount = produits.filter(p => p.actif).length
  const pendingOrders = orders.filter(o => o.statut === 'en_attente').length

  const navItems = [
    { id: 'produits', label: 'Produits', icon: ShoppingBag, badge: produits.length },
    { id: 'commandes', label: 'Commandes', icon: Package, badge: pendingOrders || null },
    { id: 'settings', label: 'Paramètres', icon: SettingsIcon, badge: null },
  ] as const

  if (!authenticated && !loading) return null

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* ══════════════════════════════════════════
          SIDEBAR — fixe, visible desktop
      ══════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-64 shrink-0 h-screen border-r border-glass-border bg-surface/60 backdrop-blur-xl sticky top-0 left-0 z-40">
        {/* Logo */}
        <div className="px-6 pt-8 pb-6 border-b border-glass-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent-indigo rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 dark:shadow-indigo-900/40 shrink-0">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-lg font-black italic tracking-tighter uppercase leading-none">
                SWIPE<span className="text-accent-indigo">SHOP</span>
              </h1>
              <p className="text-[9px] text-card-text-muted font-black uppercase tracking-[0.15em]">Dashboard Admin</p>
            </div>
          </div>
        </div>

        {/* Stats rapides */}
        <div className="px-4 py-4 space-y-2 border-b border-glass-border">
          <StatCard label="Produits actifs" value={activeCount} icon={<LayoutGrid size={16} className="text-indigo-100" />} color="bg-accent-indigo text-white border-indigo-400/30" />
          <StatCard label="Commandes" value={orders.length} icon={<TrendingUp size={16} className="text-emerald-100" />} color="bg-emerald-600 text-white border-emerald-400/30" />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon, badge }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all group ${
                activeTab === id
                  ? 'bg-accent-indigo text-white shadow-lg shadow-indigo-200/50 dark:shadow-none'
                  : 'text-card-text-muted hover:bg-background hover:text-foreground'
              }`}
            >
              <Icon size={18} className={activeTab === id ? 'text-white' : 'text-card-text-muted group-hover:text-accent-indigo'} />
              <span className="flex-1 text-left">{label}</span>
              {badge !== null && badge !== undefined && badge > 0 && (
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                  activeTab === id ? 'bg-white/20 text-white' : 'bg-accent-indigo/10 text-accent-indigo'
                }`}>{badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Footer sidebar */}
        <div className="px-4 pb-6 pt-4 border-t border-glass-border space-y-2">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-card-text-muted font-bold">Thème</span>
            <ThemeToggle />
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold text-card-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all"
          >
            <LogOut size={18} />
            Déconnexion
          </button>
        </div>
      </aside>

      {/* ══════════════════════════════════════════
          MAIN CONTENT — scrollable indépendamment
      ══════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">

        {/* TOP BAR — sticky, toujours visible */}
        <header className="shrink-0 sticky top-0 z-30 flex items-center justify-between px-4 lg:px-8 py-4 bg-background/80 backdrop-blur-xl border-b border-glass-border">
          {/* Mobile : logo + nav tabs */}
          <div className="flex items-center gap-3 lg:hidden">
            <div className="w-8 h-8 bg-accent-indigo rounded-xl flex items-center justify-center">
              <Sparkles className="text-white" size={16} />
            </div>
            <span className="text-base font-black italic uppercase tracking-tighter">
              SWIPE<span className="text-accent-indigo">SHOP</span>
            </span>
          </div>

          {/* Mobile nav */}
          <div className="flex lg:hidden items-center gap-1 bg-surface rounded-2xl p-1 border border-glass-border ml-auto">
            {navItems.map(({ id, icon: Icon, badge }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative p-2.5 rounded-xl transition-all ${
                  activeTab === id ? 'bg-background text-accent-indigo shadow-md' : 'text-card-text-muted'
                }`}
              >
                <Icon size={16} />
                {badge !== null && badge !== undefined && badge > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 text-[8px] font-black bg-accent-indigo text-white rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Desktop : titre de la section courante */}
          <div className="hidden lg:block">
            <h2 className="text-xl font-black text-foreground capitalize">
              {activeTab === 'produits' ? 'Catalogue Produits' : activeTab === 'commandes' ? 'Commandes' : 'Paramètres'}
            </h2>
            <p className="text-xs text-card-text-muted font-medium mt-0.5">
              {activeTab === 'produits' ? `${produits.length} article(s) — ${activeCount} actif(s)` :
               activeTab === 'commandes' ? `${orders.length} commande(s) — ${pendingOrders} en attente` :
               'Configuration de votre boutique'}
            </p>
          </div>

          {/* Actions droite (desktop) */}
          <div className="hidden lg:flex items-center gap-3">
            <ThemeToggle />
            {activeTab === 'produits' && (
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl font-black text-sm transition-all ${
                  showAddForm
                    ? 'bg-rose-50 text-rose-500 border border-rose-200'
                    : 'bg-accent-indigo text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200/50 dark:shadow-none'
                }`}
              >
                {showAddForm ? <X size={16} /> : <Plus size={16} />}
                {showAddForm ? 'Annuler' : 'Nouveau produit'}
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-2xl text-card-text-muted hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-all border border-transparent hover:border-rose-100"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {/* CONTENU — zone scrollable */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 pb-24">

            {/* ── PRODUITS ── */}
            {activeTab === 'produits' && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Mobile : bouton ajouter */}
                <div className="flex lg:hidden justify-between items-center">
                  <div>
                    <p className="text-sm font-bold text-card-text-muted">{produits.length} produit(s) · {activeCount} actif(s)</p>
                  </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs transition-all ${
                      showAddForm
                        ? 'bg-rose-50 text-rose-500 border border-rose-200'
                        : 'bg-accent-indigo text-white shadow-lg shadow-indigo-200/50'
                    }`}
                  >
                    {showAddForm ? <X size={14} /> : <Plus size={14} />}
                    {showAddForm ? 'Annuler' : 'Nouveau'}
                  </button>
                </div>

                {/* Formulaire */}
                {showAddForm && (
                  <div className="glass-soft rounded-[32px] shadow-2xl p-6 md:p-8 border-2 border-accent-indigo/20 animate-in zoom-in-95 duration-400">
                    <div className="flex items-center gap-3 mb-8">
                      <div className="w-10 h-10 bg-accent-indigo/10 rounded-xl flex items-center justify-center">
                        <Package className="text-accent-indigo" size={20} />
                      </div>
                      <h3 className="text-xl font-black text-foreground">Nouveau produit</h3>
                    </div>

                    <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Nom commercial</label>
                        <input type="text" required value={newProduct.nom}
                          onChange={e => setNewProduct({ ...newProduct, nom: e.target.value })}
                          className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none transition-all text-foreground font-bold"
                          placeholder="ex: Fer à lisser 2-en-1" />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Prix de vente (FCFA)</label>
                        <input type="number" required min={0} value={newProduct.prixVente}
                          onChange={e => setNewProduct({ ...newProduct, prixVente: parseInt(e.target.value) || 0 })}
                          className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none transition-all text-foreground font-bold" />
                      </div>

                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Description</label>
                        <textarea required value={newProduct.description}
                          onChange={e => setNewProduct({ ...newProduct, description: e.target.value })}
                          className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none transition-all text-foreground font-medium"
                          rows={2} placeholder="Pourquoi vos clientes vont-elles l'adorer ?" />
                      </div>

                      {/* Uploads */}
                      {[
                        { type: 'video' as const, id: 'v', label: 'Vidéo principale', icon: <Film size={18} />, done: !!newProduct.videoUrl, doneLabel: '✅ Vidéo prête', placeholder: 'Choisir une vidéo', accept: 'video/*' },
                        { type: 'image' as const, id: 'i', label: 'Images galerie', icon: <ImageIcon size={18} />, done: (newProduct.images?.length ?? 0) > 0, doneLabel: `✅ ${newProduct.images?.length} image(s)`, placeholder: 'Ajouter des photos', accept: 'image/*', multiple: true },
                        { type: 'audio' as const, id: 'a', label: 'Musique (optionnel)', icon: <Music size={18} />, done: !!newProduct.audioUrl, doneLabel: '✅ Son prêt', placeholder: 'Ajouter un son', accept: 'audio/*' },
                      ].map(({ type, id, label, icon, done, doneLabel, placeholder, accept, multiple }) => (
                        <div key={id} className="space-y-2">
                          <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">{label}</label>
                          <input type="file" accept={accept} multiple={multiple} onChange={e => handleFileUpload(e, type)} className="hidden" id={`upload-${id}`} />
                          <label htmlFor={`upload-${id}`}
                            className={`flex items-center justify-center gap-3 p-5 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                              done ? 'border-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10' : 'border-border-subtle hover:border-accent-indigo bg-surface/50'
                            }`}>
                            {done ? <CheckCircle2 className="text-emerald-500" size={18} /> : <span className="text-card-text-muted">{icon}</span>}
                            <span className="text-xs font-bold text-card-text-muted">{done ? doneLabel : placeholder}</span>
                          </label>
                        </div>
                      ))}

                      {/* Features */}
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Points forts</label>
                        <div className="flex gap-2">
                          <input type="text" value={featureInput}
                            onChange={e => setFeatureInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                            className="flex-grow p-3 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none text-foreground text-xs"
                            placeholder="Ex: Câble pivotant 360°..." />
                          <button type="button" onClick={addFeature}
                            className="px-4 py-3 bg-surface rounded-2xl text-card-text-muted hover:text-accent-indigo border border-border-subtle transition-colors">
                            <Plus size={18} />
                          </button>
                        </div>
                        {(newProduct.features?.length ?? 0) > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {newProduct.features?.map((f, i) => (
                              <span key={i} className="text-[10px] font-bold bg-accent-indigo/10 text-accent-indigo px-3 py-1.5 rounded-full flex items-center gap-1.5">
                                {f}
                                <button type="button" onClick={() => setNewProduct(prev => ({ ...prev, features: prev.features?.filter((_, j) => j !== i) }))}><X size={10} /></button>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Progress uploads */}
                      {Object.keys(uploadProgress).length > 0 && (
                        <div className="md:col-span-2 grid grid-cols-2 gap-3">
                          {Object.entries(uploadProgress).map(([name, progress]) => (
                            <div key={name} className="bg-surface p-3 rounded-xl">
                              <div className="flex justify-between text-[9px] font-bold mb-1.5">
                                <span className="text-card-text-muted truncate max-w-[120px]">{name}</span>
                                <span className="text-accent-indigo">{progress}%</span>
                              </div>
                              <div className="h-1 bg-border-subtle rounded-full overflow-hidden">
                                <div className="h-full bg-accent-indigo transition-all" style={{ width: `${progress}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="md:col-span-2">
                        <button type="submit" disabled={isUploading || submitting}
                          className="w-full bg-accent-indigo text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-xl shadow-indigo-200/50 dark:shadow-none">
                          {submitting ? <><Loader2 size={16} className="animate-spin" /> Enregistrement...</>
                            : isUploading ? <><Loader2 size={16} className="animate-spin" /> Upload en cours...</>
                            : 'Enregistrer et mettre en ligne'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Grille produits */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {loading
                    ? Array(3).fill(0).map((_, i) => (
                        <div key={i} className="bg-surface/40 rounded-[28px] border border-glass-border animate-pulse h-[480px]" />
                      ))
                    : produits.map(p => (
                        <div key={p.id} className="glass-soft rounded-[28px] border border-glass-border overflow-hidden group hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                          {/* Vidéo */}
                          <div className="aspect-[9/16] bg-black relative overflow-hidden">
                            <video src={p.videoUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                              muted loop playsInline
                              onMouseOver={e => e.currentTarget.play()}
                              onMouseOut={e => { e.currentTarget.pause(); e.currentTarget.currentTime = 0 }} />

                            {/* Overlay gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

                            {/* Badge actif/masqué */}
                            <div className="absolute top-3 left-3">
                              <button onClick={() => toggleActif(p)}
                                className={`flex items-center gap-1.5 text-[9px] font-black uppercase px-3 py-1.5 rounded-full backdrop-blur-xl border transition-all ${
                                  p.actif ? 'bg-emerald-500/80 text-white border-emerald-400' : 'bg-slate-700/80 text-white border-slate-500'
                                }`}>
                                {p.actif ? <Eye size={10} /> : <EyeOff size={10} />}
                                {p.actif ? 'Actif' : 'Masqué'}
                              </button>
                            </div>

                            {/* Prix overlay */}
                            <div className="absolute bottom-3 left-3">
                              <span className="text-white font-black text-lg drop-shadow-lg">{p.prixVente.toLocaleString()} F</span>
                            </div>

                            {/* Actions hover */}
                            <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all -translate-y-2 group-hover:translate-y-0">
                              <button onClick={() => handleDeleteProduct(p.id)}
                                className="p-2.5 bg-white/90 text-rose-500 rounded-xl shadow-lg hover:bg-rose-500 hover:text-white transition-all">
                                <Trash2 size={15} />
                              </button>
                              <button className="p-2.5 bg-white/90 text-accent-indigo rounded-xl shadow-lg hover:bg-accent-indigo hover:text-white transition-all">
                                <Upload size={15} />
                              </button>
                            </div>
                          </div>

                          {/* Infos */}
                          <div className="p-5 flex-grow flex flex-col">
                            <div className="flex justify-between items-start mb-2">
                              <h3 className="font-black text-base text-foreground truncate mr-2">{p.nom}</h3>
                              {p.audioUrl && <Music size={13} className="text-accent-indigo shrink-0" />}
                            </div>
                            <p className="text-xs text-card-text-muted line-clamp-2 leading-relaxed mb-3">{p.description}</p>

                            {/* Features pills */}
                            {(p.features?.length ?? 0) > 0 && (
                              <div className="flex flex-wrap gap-1 mb-3">
                                {p.features?.slice(0, 2).map((f, i) => (
                                  <span key={i} className="text-[9px] font-bold bg-surface px-2 py-1 rounded-full border border-border-subtle text-card-text-muted">{f}</span>
                                ))}
                                {(p.features?.length ?? 0) > 2 && (
                                  <span className="text-[9px] font-bold text-card-text-muted">+{p.features!.length - 2}</span>
                                )}
                              </div>
                            )}

                            {/* Images miniatures */}
                            {(p.images?.length ?? 0) > 0 && (
                              <div className="flex gap-1 mt-auto pt-3 border-t border-border-subtle">
                                {p.images?.slice(0, 4).map((img, idx) => (
                                  <div key={idx} className="w-8 h-8 rounded-lg overflow-hidden border border-border-subtle">
                                    <img src={img} alt="" className="w-full h-full object-cover" />
                                  </div>
                                ))}
                                {(p.images?.length ?? 0) > 4 && (
                                  <div className="w-8 h-8 rounded-lg bg-surface border border-border-subtle flex items-center justify-center text-[8px] font-black text-card-text-muted">
                                    +{p.images!.length - 4}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                  }
                </div>
              </div>
            )}

            {/* ── COMMANDES ── */}
            {activeTab === 'commandes' && (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                {/* Stats commandes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total', val: orders.length, color: 'bg-surface border-border-subtle text-foreground' },
                    { label: 'En attente', val: orders.filter(o => o.statut === 'en_attente').length, color: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300' },
                    { label: 'En livraison', val: orders.filter(o => o.statut === 'en_livraison').length, color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300' },
                    { label: 'Livrées', val: orders.filter(o => o.statut === 'livrée').length, color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300' },
                  ].map(({ label, val, color }) => (
                    <div key={label} className={`p-4 rounded-2xl border ${color}`}>
                      <p className="text-xs font-bold opacity-70">{label}</p>
                      <p className="text-2xl font-black mt-0.5">{val}</p>
                    </div>
                  ))}
                </div>

                {/* Table commandes */}
                <div className="glass-soft rounded-[28px] border border-glass-border overflow-hidden">
                  {/* Header table */}
                  <div className="hidden md:grid grid-cols-4 bg-surface border-b border-border-subtle px-6 py-4">
                    {['Client', 'Produit', 'Statut', 'Action'].map(h => (
                      <div key={h} className="text-[10px] font-black text-card-text-muted uppercase tracking-widest last:text-right">{h}</div>
                    ))}
                  </div>

                  <div className="divide-y divide-border-subtle">
                    {loading ? (
                      <div className="p-16 flex justify-center">
                        <div className="w-8 h-8 border-4 border-border-subtle border-t-accent-indigo rounded-full animate-spin" />
                      </div>
                    ) : orders.length === 0 ? (
                      <div className="p-16 text-center">
                        <div className="text-4xl mb-3">📦</div>
                        <p className="text-card-text-muted font-bold text-sm">Aucune commande pour le moment</p>
                        <p className="text-card-text-muted text-xs mt-1">Les commandes WhatsApp apparaîtront ici</p>
                      </div>
                    ) : orders.map(o => (
                      <div key={o.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 px-6 py-5 hover:bg-accent-indigo/[0.02] transition-colors">
                        <div>
                          <p className="font-black text-foreground">{o.client.prenom}</p>
                          <p className="text-xs text-accent-indigo font-bold mt-0.5">{o.client.telephone}</p>
                          <p className="text-[10px] text-card-text-muted font-bold uppercase mt-0.5">{o.client.quartier}</p>
                        </div>
                        <div className="flex flex-col justify-center">
                          <p className="font-bold text-foreground text-sm">{o.produitNom}</p>
                          <p className="text-xs text-card-text-muted font-black mt-0.5">{o.prixVente.toLocaleString()} FCFA</p>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                            o.statut === 'livrée'       ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : o.statut === 'en_livraison' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : o.statut === 'annulée'    ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                            {o.statut.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="flex items-center md:justify-end">
                          <select value={o.statut} onChange={e => updateOrderStatus(o.id, e.target.value)}
                            className="text-xs font-bold border-2 border-border-subtle rounded-2xl px-3 py-2 bg-background text-foreground outline-none focus:border-accent-indigo transition-all cursor-pointer">
                            <option value="en_attente">En attente</option>
                            <option value="en_livraison">En livraison</option>
                            <option value="livrée">Livrée</option>
                            <option value="annulée">Annulée</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── SETTINGS ── */}
            {activeTab === 'settings' && (
              <div className="max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="glass-soft rounded-[32px] shadow-2xl p-6 md:p-8 border border-glass-border">
                  <form onSubmit={saveSettings} className="space-y-6">
                    {[
                      { key: 'shopName', label: 'Nom de la boutique', type: 'text', hint: '' },
                      { key: 'whatsappNumber', label: 'Numéro WhatsApp', type: 'text', hint: 'ex: +22961000000' },
                    ].map(({ key, label, type, hint }) => (
                      <div key={key} className="space-y-2">
                        <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">{label}</label>
                        <input type={type} required
                          value={settings[key as keyof Settings]}
                          onChange={e => setSettings({ ...settings, [key]: e.target.value })}
                          className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none transition-all text-foreground font-bold" />
                        {hint && <p className="text-[10px] text-card-text-muted italic">{hint}</p>}
                      </div>
                    ))}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Message de bienvenue WhatsApp</label>
                      <textarea required value={settings.welcomeMessage}
                        onChange={e => setSettings({ ...settings, welcomeMessage: e.target.value })}
                        className="w-full p-4 bg-background border-2 border-border-subtle focus:border-accent-indigo rounded-2xl outline-none transition-all text-foreground font-medium"
                        rows={4} />
                    </div>
                    <button type="submit"
                      className="w-full bg-accent-indigo text-white p-4 rounded-2xl font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200/50 dark:shadow-none">
                      Enregistrer
                    </button>
                  </form>
                </div>
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  )
}