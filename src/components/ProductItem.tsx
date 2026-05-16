'use client'
import { useState, useEffect, useRef } from 'react'
import { Heart, ShoppingBag, Share2, Music2, ChevronLeft, ChevronRight, Volume2, VolumeX, Check } from 'lucide-react'
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  increment,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

function getVisitorId(): string {
  if (typeof window === 'undefined') return 'ssr'
  let id = localStorage.getItem('swipeshop_visitor_id')
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem('swipeshop_visitor_id', id)
  }
  return id
}

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
  features?: string[]
  images?: string[]
  audioUrl?: string
}

interface ProductItemProps {
  product: Product
  whatsappNumber: string
  isActive: boolean
  onPrev?: () => void
  onNext?: () => void
  currentIndex: number
  total: number
}

export default function ProductItem({
  product,
  whatsappNumber,
  isActive,
  onPrev,
  onNext,
  currentIndex,
  total,
}: ProductItemProps) {
  const [likeCount, setLikeCount] = useState(0)
  const [liked, setLiked] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [muted, setMuted] = useState(true)
  const [mediaIndex, setMediaIndex] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [shared, setShared] = useState(false)
  const [dbReady, setDbReady] = useState(false)

  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef<number | null>(null)
  const viewTracked = useRef(false)

  const allMedia = [
    { type: 'video' as const, url: product.videoUrl },
    ...(product.images || []).map(img => ({ type: 'image' as const, url: img })),
  ]
  const currentMedia = allMedia[mediaIndex] ?? allMedia[0]

  // ── Init : écoute temps réel likeCount + état like du visiteur ──
  useEffect(() => {
    setDbReady(false)
    setMediaIndex(0)
    viewTracked.current = false

    if (!db) {
      setDbReady(true)
      return
    }

    const visitorId  = getVisitorId()
    const produitRef = doc(db, 'produits', product.id)
    const myLikeRef  = doc(db, 'likes', `${product.id}_${visitorId}`)

    // Initialise likeCount à 0 si absent
    getDoc(produitRef).then(snap => {
      if (snap.exists() && snap.data()?.likeCount === undefined) {
        setDoc(produitRef, { likeCount: 0 }, { merge: true }).catch(() => {})
      }
    }).catch(() => {})

    // Ce visiteur a-t-il déjà liké ?
    getDoc(myLikeRef)
      .then(snap => { setLiked(snap.exists()); setDbReady(true) })
      .catch(() => { setDbReady(true) })

    // Compteur temps réel
    const unsub = onSnapshot(produitRef, snap => {
      const count = snap.data()?.likeCount
      if (typeof count === 'number') setLikeCount(count)
    }, () => {})

    return () => unsub()
  }, [product.id])

  // ── Vue ──
  useEffect(() => {
    if (!isActive || viewTracked.current || !db) return
    viewTracked.current = true
    const visitorId = getVisitorId()
    setDoc(
      doc(db, 'produits', product.id, 'vues', visitorId),
      { createdAt: serverTimestamp(), userAgent: navigator.userAgent },
      { merge: true }
    ).catch(() => {})
  }, [isActive, product.id])

  // ── Vidéo ──
  useEffect(() => {
    if (!videoRef.current) return
    if (isActive && currentMedia.type === 'video') {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [isActive, currentMedia])

  // ── Audio ──
  useEffect(() => {
    if (!audioRef.current) return
    if (isActive) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isActive])

  // ── Auto-avance images ──
  useEffect(() => {
    if (!isActive || currentMedia.type === 'video') return
    const timer = setTimeout(() => {
      setMediaIndex(i => (i + 1 < allMedia.length ? i + 1 : i))
    }, 5000)
    return () => clearTimeout(timer)
  }, [isActive, mediaIndex, currentMedia.type, allMedia.length])

  // ── Double tap ──
  const lastTap = useRef(0)
  const handleTap = () => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      if (!liked) {
        triggerLike()
        setShowHeart(true)
        setTimeout(() => setShowHeart(false), 900)
      }
    }
    lastTap.current = now
  }

  // ── Toggle like ──
  const triggerLike = async () => {
    if (!dbReady || !db) return
    const isNowLiked = !liked

    // Optimistic UI
    setLiked(isNowLiked)
    setLikeAnim(true)
    setLikeCount(c => isNowLiked ? c + 1 : Math.max(0, c - 1))
    setTimeout(() => setLikeAnim(false), 400)

    const visitorId  = getVisitorId()
    const myLikeRef  = doc(db, 'likes', `${product.id}_${visitorId}`)
    const produitRef = doc(db, 'produits', product.id)

    try {
      if (isNowLiked) {
        await setDoc(myLikeRef, {
          productId: product.id,
          visitorId,
          createdAt: serverTimestamp(),
        })
        await setDoc(produitRef, { likeCount: increment(1) }, { merge: true })
      } else {
        await deleteDoc(myLikeRef)
        await setDoc(produitRef, { likeCount: increment(-1) }, { merge: true })
      }
    } catch {
      // Rollback si erreur
      setLiked(!isNowLiked)
      setLikeCount(c => isNowLiked ? Math.max(0, c - 1) : c + 1)
    }
  }

  // ── Partage ──
  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const shareData = {
      title: product.nom,
      text: `🛍️ ${product.nom} — ${product.prixVente.toLocaleString('fr-FR')} FCFA\n${product.description}`,
      url: window.location.href,
    }
    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(
          `${shareData.title}\n${shareData.text}\n${shareData.url}`
        )
        setShared(true)
        setTimeout(() => setShared(false), 2000)
      }
      if (db) {
        const visitorId = getVisitorId()
        setDoc(
          doc(db, 'produits', product.id, 'partages', `${visitorId}_${Date.now()}`),
          { createdAt: serverTimestamp(), visitorId }
        ).catch(() => {})
      }
    } catch { /* ignore */ }
  }

  // ── Swipe ──
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    if (dx < -60) onNext?.()
    else if (dx > 60) onPrev?.()
    touchStartX.current = null
  }

  const handleZoneTap = (zone: 'left' | 'right') => {
    if (zone === 'left') {
      if (mediaIndex > 0) setMediaIndex(i => i - 1)
      else onPrev?.()
    } else {
      if (mediaIndex < allMedia.length - 1) setMediaIndex(i => i + 1)
      else onNext?.()
    }
  }

  const formatCount = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}K`
    return n.toString()
  }

  const buildWaMessage = () => {
    const lines = [
      `Bonjour ! 👋`,
      ``,
      `Je suis intéressé(e) par :`,
      ``,
      `🛍️ *${product.nom}*`,
      `💰 *${product.prixVente.toLocaleString('fr-FR')} FCFA*`,
      ``,
      product.description,
    ]
    if (product.features?.length) {
      lines.push(``, `✅ Caractéristiques :`)
      product.features.forEach(f => lines.push(`• ${f}`))
    }
    lines.push(``, `Est-ce disponible ? Merci !`)
    return encodeURIComponent(lines.join('\n'))
  }

  const handleWhatsAppClick = async () => {
    try {
      await fetch('/api/commandes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId:  getVisitorId(),
          productId:  product.id,
          productNom: product.nom,
          prixVente:  product.prixVente,
        }),
      })
    } catch { /* ignore */ }
  }

  const waLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${buildWaMessage()}`

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* ── MEDIA BACKGROUND ── */}
      {currentMedia.type === 'video' ? (
        <video
          ref={videoRef}
          src={currentMedia.url}
          className="absolute inset-0 w-full h-full object-cover"
          loop muted={muted} playsInline preload="auto"
        />
      ) : (
        <img
          src={currentMedia.url}
          alt={product.nom}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
      )}

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-40% to-black/85 pointer-events-none z-10" />

      {product.audioUrl && <audio ref={audioRef} src={product.audioUrl} loop />}

      {/* ── ZONES TAP GAUCHE / DROITE ── */}
      <div className="absolute inset-0 z-20 flex pointer-events-none">
        <div className="w-1/3 h-full pointer-events-auto"
          onClick={e => { e.stopPropagation(); handleZoneTap('left') }} />
        <div className="w-1/3 h-full" />
        <div className="w-1/3 h-full pointer-events-auto"
          onClick={e => { e.stopPropagation(); handleZoneTap('right') }} />
      </div>

      {/* ── PROGRESS BARS ── */}
      <div className="absolute top-0 inset-x-0 z-30 px-3 pt-3 flex space-x-1">
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                i < currentIndex ? 'w-full bg-white' : i === currentIndex ? 'bg-white' : 'w-0'
              }`}
              style={
                i === currentIndex && isActive
                  ? { width: `${((mediaIndex + 1) / allMedia.length) * 100}%`, transition: 'width 5s linear' }
                  : undefined
              }
            />
          </div>
        ))}
      </div>

      {/* ── HEADER ── */}
      <div className="absolute top-10 left-4 right-4 z-30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-black border border-white/30">
            SS
          </div>
          <div>
            <p className="text-white text-xs font-bold leading-none drop-shadow">@swipeshop_bj</p>
            <p className="text-white/60 text-[10px] leading-none mt-0.5">SwipeShop Bénin</p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); setMuted(m => !m) }}
          className="w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center border border-white/20"
        >
          {muted
            ? <VolumeX size={14} className="text-white" />
            : <Volume2 size={14} className="text-white" />
          }
        </button>
      </div>

      {/* ── DOUBLE TAP HEART ── */}
      {showHeart && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <Heart
            size={100}
            fill="#fe2c55"
            className="text-[#fe2c55] opacity-90 animate-ping"
            style={{ animationDuration: '0.6s', animationIterationCount: 1 }}
          />
        </div>
      )}

      {/* ── BARRE DROITE ── */}
      <div className="absolute right-3 bottom-56 z-30 flex flex-col items-center gap-6">

        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); triggerLike() }}
          className="flex flex-col items-center gap-[6px] w-12"
          aria-label={liked ? 'Retirer le like' : 'Liker'}
          disabled={!dbReady}
        >
          <div
            className="w-12 h-12 flex items-center justify-center"
            style={{
              transform: likeAnim ? 'scale(1.4)' : 'scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            <Heart
              size={34}
              fill={liked ? '#fe2c55' : 'none'}
              strokeWidth={liked ? 0 : 2}
              className={liked ? 'text-[#fe2c55]' : 'text-white drop-shadow'}
            />
          </div>
          <span className="text-white text-[11px] font-semibold drop-shadow text-center w-full leading-none tabular-nums">
            {formatCount(likeCount)}
          </span>
        </button>

        {/* Partage */}
        <button
          onClick={handleShare}
          className="flex flex-col items-center gap-[6px] w-12"
          aria-label="Partager"
        >
          <div className="w-12 h-12 flex items-center justify-center">
            {shared
              ? <Check size={34} strokeWidth={2} className="text-green-400 drop-shadow" />
              : <Share2 size={34} strokeWidth={2} className="text-white drop-shadow" />
            }
          </div>
          <span className={`text-[11px] font-semibold drop-shadow text-center w-full leading-none ${shared ? 'text-green-400' : 'text-white'}`}>
            {shared ? 'Copié !' : 'Partager'}
          </span>
        </button>

        {/* Disque vinyle */}
        {product.audioUrl && (
          <div
            className="w-12 h-12 flex items-center justify-center animate-spin"
            style={{ animationDuration: '4s' }}
          >
            <div className="w-10 h-10 rounded-full bg-gray-900 border-4 border-gray-700 flex items-center justify-center">
              <Music2 size={13} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* ── INFOS PRODUIT ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-4 pb-6 pt-12 bg-gradient-to-t from-black/90 to-transparent">
        <div className="flex items-end justify-between mb-2">
          <div className="flex-1 mr-4">
            <h2 className="text-white font-black text-lg leading-tight drop-shadow-lg line-clamp-1">
              {product.nom}
            </h2>
            <p className="text-white/75 text-xs mt-1 leading-snug line-clamp-2">
              {product.description}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-white font-black text-xl leading-none drop-shadow">
              {product.prixVente.toLocaleString('fr-FR')}
            </p>
            <p className="text-white/70 text-[10px] font-bold">FCFA</p>
          </div>
        </div>

        {/* Features */}
        {(product.features?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.features!.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="text-[10px] text-white/90 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full border border-white/20 font-medium"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Miniatures médias */}
        {allMedia.length > 1 && (
          <div className="flex gap-1.5 mb-3">
            {allMedia.map((m, i) => (
              <button
                key={i}
                onClick={e => { e.stopPropagation(); setMediaIndex(i) }}
                className={`w-10 h-10 rounded-lg overflow-hidden border-2 transition-all ${
                  i === mediaIndex ? 'border-white scale-110' : 'border-white/30 opacity-60'
                }`}
              >
                {m.type === 'video'
                  ? <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                  : <img src={m.url} alt="" className="w-full h-full object-cover" />
                }
              </button>
            ))}
          </div>
        )}

        {/* Bouton WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => { e.stopPropagation(); handleWhatsAppClick() }}
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white py-3.5 rounded-2xl font-black text-sm transition-all shadow-2xl"
        >
          <ShoppingBag size={18} />
          Commander sur WhatsApp
        </a>

        {product.audioUrl && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <Music2 size={11} className="text-white/60 shrink-0" />
            <p className="text-white/50 text-[10px] truncate">Son original · SwipeShop Bénin</p>
          </div>
        )}
      </div>

      {/* ── FLÈCHES DESKTOP ── */}
      {onPrev && (
        <button
          onClick={e => { e.stopPropagation(); onPrev() }}
          className="hidden md:flex absolute left-3 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur items-center justify-center border border-white/20 hover:bg-black/60 transition"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
      )}
      {onNext && (
        <button
          onClick={e => { e.stopPropagation(); onNext() }}
          className="hidden md:flex absolute right-14 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur items-center justify-center border border-white/20 hover:bg-black/60 transition"
        >
          <ChevronRight size={20} className="text-white" />
        </button>
      )}
    </div>
  )
}