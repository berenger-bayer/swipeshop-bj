'use client'
import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, Bookmark, Music2, Plus, Package } from 'lucide-react'

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
}

interface ProductFeedProps {
  produits: Product[]
  whatsappNumber: string
}

export default function ProductFeed({ produits, whatsappNumber }: ProductFeedProps) {
  const refs = useRef<(HTMLDivElement | null)[]>([])
  const [liked, setLiked] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const idx = refs.current.indexOf(e.target as HTMLDivElement)
            refs.current.forEach((el, i) => {
              const video = el?.querySelector('video')
              if (video) {
                if (i === idx) {
                  video.play().catch(() => {})
                } else {
                  video.pause()
                }
              }
            })
          }
        })
      },
      { threshold: 0.6 }
    )
    refs.current.forEach(el => el && observer.observe(el))
    return () => observer.disconnect()
  }, [])

  const toggleLike = (id: string) => {
    setLiked(prev => ({ ...prev, [id]: !prev[id] }))
  }

  return (
    <div className="h-screen w-full bg-[#0a0a0a] overflow-hidden flex flex-col md:flex-row justify-center items-center">
      {/* Background Glows */}
      <div className="hidden md:block absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-500/10 blur-[120px] rounded-full" />
      </div>

      {/* Main Feed */}
      <div className="h-full w-full max-w-[500px] md:h-[85vh] md:w-[380px] md:rounded-[40px] overflow-y-scroll snap-y snap-mandatory no-scrollbar relative shadow-[0_0_50px_rgba(0,0,0,0.5)] border md:border-white/10">
        {produits.map((p, i) => (
          <div
            key={p.id}
            ref={el => { refs.current[i] = el }}
            className="h-full w-full snap-start relative flex flex-col bg-black overflow-hidden"
          >
            {/* Background Video */}
            <video
              src={p.videoUrl}
              className="absolute inset-0 w-full h-full object-cover"
              loop
              muted
              playsInline
            />

            {/* Interaction Buttons (TikTok Style) */}
            <div className="absolute right-3 bottom-32 flex flex-col items-center space-y-6 z-20">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mb-1 relative border border-white/20 overflow-hidden glass">
                    <div className="w-full h-full bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500" />
                    <div className="absolute -bottom-2 bg-[#fe2c55] rounded-full text-white p-0.5 shadow-lg">
                        <Plus size={12} />
                    </div>
                </div>
              </div>

              <div className="flex flex-col items-center">
                <button 
                  onClick={() => toggleLike(p.id)}
                  className={`transition-all duration-300 transform active:scale-150 ${liked[p.id] ? 'text-[#fe2c55] animate-heart-beat' : 'text-white'}`}
                >
                  <Heart size={34} fill={liked[p.id] ? "currentColor" : "none"} strokeWidth={2.5} />
                </button>
                <span className="text-white text-[11px] font-bold drop-shadow-md">12.5K</span>
              </div>

              <div className="flex flex-col items-center">
                <button className="text-white drop-shadow-md hover:scale-110 transition-transform">
                  <MessageCircle size={34} fill="currentColor" strokeWidth={0} />
                </button>
                <span className="text-white text-[11px] font-bold drop-shadow-md">456</span>
              </div>

              <div className="flex flex-col items-center">
                <button className="text-white drop-shadow-md hover:scale-110 transition-transform">
                  <Bookmark size={34} fill="currentColor" strokeWidth={0} />
                </button>
                <span className="text-white text-[11px] font-bold drop-shadow-md">2,103</span>
              </div>

              <div className="flex flex-col items-center">
                <button className="text-white drop-shadow-md hover:scale-110 transition-transform">
                  <Share2 size={34} fill="currentColor" strokeWidth={0} />
                </button>
                <span className="text-white text-[11px] font-bold drop-shadow-md">98</span>
              </div>

              <div className="animate-spin-slow mt-2">
                <div className="w-10 h-10 rounded-full bg-black/40 p-2 border-2 border-white/20 glass overflow-hidden">
                    <div className="w-full h-full rounded-full bg-gradient-to-tr from-gray-800 to-gray-500 flex items-center justify-center">
                      <Music2 size={16} className="text-white" />
                    </div>
                </div>
              </div>
            </div>

            {/* Bottom Info Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4 pb-10 bg-gradient-to-t from-black/90 via-black/40 to-transparent text-white z-10">
              <div className="glass rounded-2xl p-4 border border-white/10 mb-4 backdrop-blur-xl">
                <h3 className="text-lg font-black mb-1 drop-shadow-md">@swipeshop_bj</h3>
                <p className="text-sm mb-3 line-clamp-2 text-white/90 font-medium">
                  {p.nom} - {p.description}
                </p>
                
                <div className="flex items-center space-x-2 mb-4">
                  <Music2 size={14} className="text-[#fe2c55]" />
                  <div className="text-[11px] whitespace-nowrap animate-marquee font-bold">Son original - SwipeShop Bénin</div>
                </div>

                <div className="flex flex-col space-y-3">
                  <div className="flex items-center justify-between">
                      <span className="text-2xl font-black text-yellow-400 drop-shadow-lg">{p.prixVente.toLocaleString()} FCFA</span>
                      <span className="text-[10px] bg-white/20 px-2 py-1 rounded-full uppercase tracking-widest font-bold">Stock Limité</span>
                  </div>
                  <a
                    href={`https://wa.me/${whatsappNumber}?text=Bonjour, je suis intéressé(e) par ${p.nom} à ${p.prixVente} FCFA`}
                    className="bg-[#fe2c55] hover:bg-[#e0244a] text-white py-3.5 rounded-xl font-black text-center transition-all transform active:scale-95 shadow-[0_4px_20px_rgba(254,44,85,0.4)] uppercase tracking-widest text-xs"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Commander Maintenant
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop Info */}
      <div className="hidden md:flex flex-col ml-12 space-y-8 max-w-[300px]">
        <div className="glass p-8 rounded-[32px] border border-white/10 shadow-2xl">
          <h1 className="text-4xl font-black text-white italic tracking-tighter mb-4 leading-none">SWIPE<br/>SHOP</h1>
          <p className="text-gray-400 text-sm font-medium leading-relaxed">
            La première boutique immersive au Bénin. Commandez vos produits préférés en un clic.
          </p>
        </div>

        <div className="glass p-6 rounded-[24px] border border-white/10">
            <div className="flex items-center space-x-3 mb-4 text-[#fe2c55]">
                <Package size={20} />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Livraison 24h</span>
            </div>
            <div className="h-[2px] w-full bg-white/5 mb-4" />
            <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Populaire cette semaine</p>
            <p className="text-sm text-white mt-1 font-medium italic">#FerALisser #BeninBeauty</p>
        </div>
      </div>
    </div>
  )
}
