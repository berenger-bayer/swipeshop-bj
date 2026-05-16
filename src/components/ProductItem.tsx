'use client'
import { useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, Share2, Music2, Plus } from 'lucide-react'

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
}

export default function ProductItem({ product, whatsappNumber, isActive }: ProductItemProps) {
  const [liked, setLiked] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)

  const toggleLike = () => {
    setLiked(!liked)
  }

  useEffect(() => {
    if (isActive && audioRef.current) {
      audioRef.current.play().catch(() => {
        console.log("Audio autoplay blocked by browser")
      })
    } else if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
  }, [isActive])

  return (
    <div className="h-full w-full snap-start relative flex flex-col bg-black overflow-hidden group">
      {/* Top Story Progress Bars (Visual only for now) */}
      <div className="absolute top-4 inset-x-4 flex space-x-1.5 z-30">
        {[1, 2].map((i) => (
            <div key={i} className="h-1 flex-grow bg-white/20 rounded-full overflow-hidden">
                <div 
                    className={`h-full bg-white transition-all duration-[5000ms] ease-linear ${isActive && i === 1 ? 'w-full' : 'w-0'}`} 
                />
            </div>
        ))}
      </div>

      {/* Background Media (Story Style Split) */}
      <div className="absolute inset-0 flex flex-row">
        {/* Left Side: Video */}
        <div className="relative w-1/2 h-full overflow-hidden border-r border-white/10">
            <video
                src={product.videoUrl}
                className="absolute inset-0 w-full h-full object-cover"
                loop
                muted
                playsInline
                autoPlay={isActive}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>
        
        {/* Right Side: Image (Story Style) */}
        <div className="relative w-1/2 h-full overflow-hidden">
            {product.images && product.images.length > 0 ? (
                <img 
                    src={product.images[0]} 
                    alt={product.nom}
                    className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                />
            ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-900 to-purple-900 flex items-center justify-center">
                    <Music2 className="text-white/20" size={48} />
                </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
        </div>
      </div>
      
      {/* Background Audio */}
      {product.audioUrl && (
        <audio ref={audioRef} src={product.audioUrl} loop />
      )}

      {/* Right Interaction Bar (Strict TikTok Style) */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center space-y-5 z-20">
        {/* Profile / Shop Icon */}
        <div className="flex flex-col items-center mb-2">
            <div className="w-12 h-12 bg-white rounded-full p-[1px] relative shadow-lg">
                <div className="w-full h-full rounded-full bg-accent-indigo flex items-center justify-center text-white font-bold text-xs italic">SS</div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-[#fe2c55] text-white rounded-full p-0.5 shadow-lg border-2 border-black/10">
                    <Plus size={12} strokeWidth={4} />
                </div>
            </div>
        </div>

        <div className="flex flex-col items-center">
          <button 
            onClick={toggleLike}
            className={`transition-all duration-300 transform active:scale-150 ${liked ? 'text-[#fe2c55] animate-heart-beat' : 'text-white'}`}
          >
            <Heart size={36} fill={liked ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
          <span className="text-white text-[11px] font-bold mt-1 drop-shadow-md">12.5K</span>
        </div>

        <div className="flex flex-col items-center">
          <button className="text-white hover:scale-110 transition-transform">
            <MessageCircle size={36} fill="white" strokeWidth={0} />
          </button>
          <span className="text-white text-[11px] font-bold mt-1 drop-shadow-md">456</span>
        </div>

        <div className="flex flex-col items-center">
          <button className="text-white hover:scale-110 transition-transform">
            <Share2 size={36} fill="white" strokeWidth={0} />
          </button>
          <span className="text-white text-[11px] font-bold mt-1 drop-shadow-md">98</span>
        </div>

        {/* Spinning Vinyl Record Icon */}
        <div className={`${product.audioUrl ? 'animate-spin-slow' : ''} mt-4`}>
          <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-gray-950 to-gray-700 border-[6px] border-gray-900 p-2 flex items-center justify-center shadow-2xl">
            <Music2 size={16} className="text-white" />
          </div>
        </div>
      </div>

      {/* Bottom Information Overlay (Strict TikTok Style) */}
      <div className="absolute bottom-6 left-4 right-16 z-20 flex flex-col items-start space-y-3">
        <div className="flex flex-col items-start max-w-full">
            <h3 className="text-white font-bold text-base drop-shadow-lg tracking-tight">@swipeshop_bj</h3>
            <p className="text-white text-sm mt-1.5 leading-snug drop-shadow-lg line-clamp-2 font-medium opacity-95">
                {product.nom} — {product.description}
            </p>
        </div>

        <div className="flex items-center space-x-2 bg-black/30 backdrop-blur-md p-1.5 px-3 rounded-full border border-white/10 max-w-[200px] overflow-hidden">
            <Music2 size={12} className="text-white shrink-0" />
            <div className="text-[11px] text-white whitespace-nowrap animate-marquee font-medium">
                {product.audioUrl ? 'Son original - SwipeShop Bénin' : 'Audio désactivé'}
            </div>
        </div>

        {/* Call to Action Button (Integrated into TikTok UI) */}
        <div className="w-full pt-3">
            <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-baseline space-x-1.5">
                    <span className="text-2xl font-black text-white drop-shadow-lg">{product.prixVente.toLocaleString()}</span>
                    <span className="text-xs font-bold text-white/90 drop-shadow-md">FCFA</span>
                </div>
                <div className="bg-[#fe2c55] text-white text-[9px] px-2.5 py-1 rounded-sm font-black uppercase tracking-tighter shadow-xl animate-pulse">
                    En Stock
                </div>
            </div>
            <a
              href={`https://wa.me/${whatsappNumber}?text=Bonjour, je suis intéressé(e) par ${product.nom} à ${product.prixVente} FCFA`}
              className="w-full bg-[#fe2c55] hover:bg-[#e0244a] text-white py-4 rounded-xl font-black text-center transition-all transform active:scale-95 shadow-2xl uppercase tracking-[0.2em] text-[10px] flex items-center justify-center"
              target="_blank"
              rel="noopener noreferrer"
            >
              Commander sur WhatsApp
            </a>
        </div>
      </div>
    </div>
  )
}
