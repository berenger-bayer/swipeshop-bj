'use client'
import { useEffect, useRef, useState } from 'react'
import { Package, Sparkles, ShieldCheck, Star, CheckCircle2, ChevronRight, Store, Heart } from 'lucide-react'
import ProductItem from './ProductItem'
import { ThemeToggle } from './ThemeToggle'

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

interface ProductFeedProps {
  produits: Product[]
  whatsappNumber: string
}

export default function ProductFeed({ produits, whatsappNumber }: ProductFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const activeProduct = produits[activeIndex]

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            const index = Number(e.target.getAttribute('data-index'))
            setActiveIndex(index)
          }
        })
      },
      { threshold: 0.6 }
    )

    const items = containerRef.current?.querySelectorAll('.product-slide')
    items?.forEach(el => observer.observe(el))
    
    return () => observer.disconnect()
  }, [])

  return (
    <div className="h-screen w-full bg-black overflow-hidden flex flex-col lg:flex-row justify-center items-center font-sans">
      {/* Background Decorative Elements (Subtle Glows) */}
      <div className="hidden lg:block absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#fe2c55]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* LEFT COLUMN: Brand & Story (Simplistic Sidebar) */}
      <div className="hidden lg:flex flex-col w-[22%] px-10 space-y-8 z-10 animate-fade-in">
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-2xl">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-[#fe2c55] rounded-xl flex items-center justify-center shadow-lg shadow-[#fe2c55]/20">
                <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tighter uppercase italic">
                Swipe<span className="text-[#fe2c55]">Shop</span>
            </h1>
          </div>
          
          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Boutique</h2>
            <p className="text-white/80 text-sm leading-relaxed font-medium">
              Découvrez le futur du e-commerce au Bénin. Immersif, rapide, sécurisé.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-white/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#fe2c55] font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck size={14} />
                <span>Certifié</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-xl p-6 rounded-[28px] border border-white/10">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 mb-6">Exploration</h2>
            <div className="space-y-2">
                {[
                    { name: 'Coiffure', color: 'bg-white/5 text-white' },
                    { name: 'Soins Visage', color: 'bg-white/5 text-white' },
                    { name: 'Accessoires', color: 'bg-white/5 text-white' },
                ].map(cat => (
                    <div key={cat.name} className="flex items-center justify-between p-3 rounded-xl hover:bg-white/10 transition-all cursor-pointer group">
                        <div className="flex items-center space-x-4">
                            <div className={`w-8 h-8 rounded-lg ${cat.color} flex items-center justify-center border border-white/10 group-hover:border-[#fe2c55]/50 transition-colors`}>
                                <Store size={14} />
                            </div>
                            <span className="text-xs font-bold text-white/70 group-hover:text-white transition-colors">{cat.name}</span>
                        </div>
                        <ChevronRight size={12} className="text-white/20 group-hover:text-[#fe2c55] transition-colors" />
                    </div>
                ))}
            </div>
        </div>
      </div>

      {/* CENTER COLUMN: The Feed (Immersive) */}
      <div className="relative z-20 flex justify-center items-center w-full lg:w-[35%]">
        <div 
          ref={containerRef}
          className="h-screen w-full max-w-[500px] lg:h-[85vh] lg:w-[380px] lg:rounded-[40px] overflow-y-scroll snap-y snap-mandatory no-scrollbar relative shadow-[0_0_100px_rgba(0,0,0,1)] lg:border-[1px] border-white/10 bg-black"
        >
          {produits.map((p, i) => (
            <div
              key={p.id}
              data-index={i}
              className="product-slide h-full w-full snap-start"
            >
              <ProductItem 
                  product={p} 
                  whatsappNumber={whatsappNumber} 
                  isActive={activeIndex === i} 
              />
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN: Product Zoom (Simplistic) */}
      <div className="hidden lg:flex flex-col w-[28%] px-10 space-y-6 z-10 overflow-y-auto max-h-[85vh] no-scrollbar">
        <div className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-2xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe2c55] bg-[#fe2c55]/10 px-3 py-1 rounded-full border border-[#fe2c55]/20">
                Zoom Produit
            </span>
            <div className="flex items-center space-x-0.5 text-yellow-400">
                {[1,2,3,4,5].map(s => <Star key={s} size={12} fill="currentColor" />)}
            </div>
          </div>
          
          <h2 className="text-2xl font-black text-white mb-6 leading-tight uppercase italic">{activeProduct?.nom}</h2>
          
          <div className="grid grid-cols-1 gap-3 mb-8">
            {activeProduct?.features?.map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-2xl bg-white/5 border border-white/5">
                    <CheckCircle2 size={14} className="text-[#fe2c55]" />
                    <span className="text-xs font-bold text-white/80">{feature}</span>
                </div>
            ))}
          </div>

          <div className="space-y-4">
            <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30">Galerie Photos</h3>
            <div className="flex flex-wrap gap-3">
                {activeProduct?.images?.map((img, idx) => (
                    <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                        <img src={img} alt={`${activeProduct.nom} gallery ${idx}`} className="w-full h-full object-cover" />
                    </div>
                ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-6 rounded-[28px] border border-white/10 flex flex-col items-center text-center space-y-3">
                <Package size={20} className="text-[#fe2c55]" />
                <p className="text-[10px] font-black text-white uppercase">Express 24h</p>
            </div>
            
            <div className="bg-white/5 p-6 rounded-[28px] border border-white/10 flex flex-col items-center text-center space-y-3">
                <Heart size={20} className="text-[#fe2c55]" />
                <p className="text-[10px] font-black text-white uppercase">Qualité Or</p>
            </div>
        </div>
      </div>
    </div>
  )
}
