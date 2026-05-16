'use client'
import { useState, useEffect, useRef } from 'react'
import { Heart, ShoppingBag, Share2, Music2, ChevronLeft, ChevronRight, Volume2, VolumeX } from 'lucide-react'

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
  const [liked, setLiked] = useState(false)
  const [likeAnim, setLikeAnim] = useState(false)
  const [muted, setMuted] = useState(true)
  const [mediaIndex, setMediaIndex] = useState(0) // index image galerie
  const [showHeart, setShowHeart] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const touchStartX = useRef<number | null>(null)

  // Toutes les médias (vidéo + images)
  const allMedia = [
    { type: 'video' as const, url: product.videoUrl },
    ...(product.images || []).map(img => ({ type: 'image' as const, url: img })),
  ]
  const currentMedia = allMedia[mediaIndex] ?? allMedia[0]

  // Jouer/pauser la vidéo selon le slide actif
  useEffect(() => {
    if (!videoRef.current) return
    if (isActive && currentMedia.type === 'video') {
      videoRef.current.play().catch(() => {})
    } else {
      videoRef.current.pause()
    }
  }, [isActive, currentMedia])

  // Audio
  useEffect(() => {
    if (!audioRef.current) return
    if (isActive) {
      audioRef.current.play().catch(() => {})
    } else {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isActive])

  // Reset media index quand on change de produit
  useEffect(() => {
    setMediaIndex(0)
  }, [product.id])

  // Progress auto sur les médias (5s par image)
  useEffect(() => {
    if (!isActive || currentMedia.type === 'video') return
    const timer = setTimeout(() => {
      setMediaIndex(i => (i + 1 < allMedia.length ? i + 1 : i))
    }, 5000)
    return () => clearTimeout(timer)
  }, [isActive, mediaIndex, currentMedia.type, allMedia.length])

  // Double tap = like
  const lastTap = useRef(0)
  const handleTap = (e: React.MouseEvent) => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      handleLike()
      setShowHeart(true)
      setTimeout(() => setShowHeart(false), 900)
    }
    lastTap.current = now
  }

  const handleLike = () => {
    setLiked(true)
    setLikeAnim(true)
    setTimeout(() => setLikeAnim(false), 400)
  }

  // Touch swipe gauche/droite entre produits
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

  // Tap zone gauche/droite pour naviguer dans les médias du produit
  const handleZoneTap = (zone: 'left' | 'right') => {
    if (zone === 'left') {
      if (mediaIndex > 0) setMediaIndex(i => i - 1)
      else onPrev?.()
    } else {
      if (mediaIndex < allMedia.length - 1) setMediaIndex(i => i + 1)
      else onNext?.()
    }
  }

  const waLink = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Bonjour ! Je suis intéressé(e) par *${product.nom}* à ${product.prixVente.toLocaleString('fr-FR')} FCFA. Est-ce disponible ?`
  )}`

  return (
    <div
      className="relative w-full h-full bg-black overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onClick={handleTap}
    >
      {/* ── BACKGROUND MEDIA ── */}
      {currentMedia.type === 'video' ? (
        <video
          ref={videoRef}
          src={currentMedia.url}
          className="absolute inset-0 w-full h-full object-cover"
          loop
          muted={muted}
          playsInline
          preload="auto"
        />
      ) : (
        <img
          src={currentMedia.url}
          alt={product.nom}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
        />
      )}

      {/* Gradient haut + bas */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-40% to-black/85 pointer-events-none z-10" />

      {/* ── AUDIO ── */}
      {product.audioUrl && (
        <audio ref={audioRef} src={product.audioUrl} loop />
      )}

      {/* ── ZONES DE TAP GAUCHE / DROITE ── */}
      <div className="absolute inset-0 z-20 flex pointer-events-none">
        <div className="w-1/3 h-full pointer-events-auto" onClick={e => { e.stopPropagation(); handleZoneTap('left') }} />
        <div className="w-1/3 h-full" /> {/* zone centrale = double-tap like */}
        <div className="w-1/3 h-full pointer-events-auto" onClick={e => { e.stopPropagation(); handleZoneTap('right') }} />
      </div>

      {/* ── PROGRESS BARS (Stories) ── */}
      <div className="absolute top-0 inset-x-0 z-30 px-3 pt-3 flex space-x-1">
        {/* Barre par produit */}
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} className="flex-1 h-[3px] rounded-full bg-white/25 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                i < currentIndex
                  ? 'w-full bg-white'
                  : i === currentIndex
                  ? 'bg-white'
                  : 'w-0'
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

      {/* ── HEADER (boutique) ── */}
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

        {/* Mute / Unmute */}
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

      {/* ── BARRE DROITE (actions) ── */}
      <div className="absolute right-3 bottom-36 z-30 flex flex-col items-center gap-5">
        {/* Like */}
        <button
          onClick={e => { e.stopPropagation(); handleLike() }}
          className="flex flex-col items-center gap-1"
        >
          <div className={`transition-transform duration-200 ${likeAnim ? 'scale-150' : 'scale-100'}`}>
            <Heart
              size={32}
              fill={liked ? '#fe2c55' : 'none'}
              strokeWidth={2}
              className={liked ? 'text-[#fe2c55]' : 'text-white drop-shadow'}
            />
          </div>
          <span className="text-white text-[10px] font-bold drop-shadow">
            {liked ? '12.6K' : '12.5K'}
          </span>
        </button>

        {/* Partager */}
        <button
          onClick={e => { e.stopPropagation(); navigator.share?.({ url: window.location.href }) }}
          className="flex flex-col items-center gap-1"
        >
          <Share2 size={30} className="text-white drop-shadow" strokeWidth={2} />
          <span className="text-white text-[10px] font-bold drop-shadow">Partager</span>
        </button>

        {/* Disque vinyle */}
        {product.audioUrl && (
          <div className="mt-1 animate-spin" style={{ animationDuration: '4s' }}>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-900 to-gray-700 border-4 border-gray-800 flex items-center justify-center shadow-xl">
              <Music2 size={13} className="text-white" />
            </div>
          </div>
        )}
      </div>

      {/* ── INFOS PRODUIT (bas) ── */}
      <div className="absolute bottom-0 inset-x-0 z-30 px-4 pb-6 pt-12 bg-gradient-to-t from-black/90 to-transparent">
        {/* Nom + prix */}
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
        {product.features && product.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {product.features.slice(0, 3).map((f, i) => (
              <span
                key={i}
                className="text-[10px] text-white/90 bg-white/15 backdrop-blur px-2 py-0.5 rounded-full border border-white/20 font-medium"
              >
                {f}
              </span>
            ))}
          </div>
        )}

        {/* Médias miniatures */}
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
                {m.type === 'video' ? (
                  <video src={m.url} className="w-full h-full object-cover" muted playsInline />
                ) : (
                  <img src={m.url} alt="" className="w-full h-full object-cover" />
                )}
              </button>
            ))}
          </div>
        )}

        {/* Bouton WhatsApp */}
        <a
          href={waLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={e => e.stopPropagation()}
          className="flex items-center justify-center gap-2 w-full bg-[#25D366] hover:bg-[#20bd5a] active:scale-95 text-white py-3.5 rounded-2xl font-black text-sm transition-all shadow-2xl"
        >
          <ShoppingBag size={18} />
          Commander sur WhatsApp
        </a>

        {/* Audio label */}
        {product.audioUrl && (
          <div className="flex items-center gap-1.5 mt-2.5">
            <Music2 size={11} className="text-white/60 shrink-0" />
            <p className="text-white/50 text-[10px] truncate">Son original · SwipeShop Bénin</p>
          </div>
        )}
      </div>

      {/* ── FLÈCHES (desktop) ── */}
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