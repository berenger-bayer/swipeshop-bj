'use client'
import { useEffect, useRef, useState } from 'react'
import { Package, Sparkles, ShieldCheck, Star, CheckCircle2, ChevronRight, ShoppingBag, Heart } from 'lucide-react'
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
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = 'auto' }
  }, [])

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
  }, [produits])

  if (produits.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center gap-4 bg-background">
        <div className="text-5xl">🛍️</div>
        <p className="text-card-text-muted font-bold text-sm">Aucun produit disponible</p>
      </div>
    )
  }

  return (
    <div className="h-screen w-full bg-background overflow-hidden flex flex-col lg:flex-row justify-center items-center font-sans transition-colors duration-500">

      {/* Glows décoratifs */}
      <div className="hidden lg:block absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#fe2c55]/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      {/* ── COLONNE GAUCHE (desktop) ── */}
      <div className="hidden lg:flex flex-col w-[22%] px-10 space-y-8 z-10">

        {/* Branding */}
        <div className="bg-glass-bg backdrop-blur-xl p-8 rounded-[32px] border border-glass-border shadow-2xl transition-colors duration-500">
          <div className="flex items-center space-x-3 mb-8">
            <div className="w-10 h-10 bg-[#fe2c55] rounded-xl flex items-center justify-center shadow-lg shadow-[#fe2c55]/20">
              <Sparkles className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase italic">
              Swipe<span className="text-[#fe2c55]">Shop</span>
            </h1>
          </div>

          <div className="space-y-4">
            <h2 className="text-[10px] font-black text-card-text-muted uppercase tracking-[0.2em]">Boutique</h2>
            <p className="text-card-text text-sm leading-relaxed font-medium">
              Découvrez le futur du e-commerce au Bénin. Immersif, rapide, sécurisé.
            </p>
          </div>

          <div className="mt-10 pt-6 border-t border-glass-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[#fe2c55] font-black text-[10px] uppercase tracking-widest">
                <ShieldCheck size={14} />
                <span>Certifié</span>
              </div>
              <ThemeToggle />
            </div>
          </div>
        </div>

        {/* Catégories */}
        <div className="bg-glass-bg backdrop-blur-xl p-6 rounded-[28px] border border-glass-border transition-colors duration-500">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-card-text-muted mb-6">Exploration</h2>
          <div className="space-y-2">
            {['Coiffure', 'Soins Visage', 'Accessoires'].map(cat => (
              <div key={cat} className="flex items-center justify-between p-3 rounded-xl hover:bg-surface transition-all cursor-pointer group">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 rounded-lg bg-surface flex items-center justify-center border border-glass-border group-hover:border-[#fe2c55]/50 transition-colors">
                    <ShoppingBag size={14} className="text-foreground" />
                  </div>
                  <span className="text-xs font-bold text-card-text group-hover:text-foreground transition-colors">{cat}</span>
                </div>
                <ChevronRight size={12} className="text-card-text-muted group-hover:text-[#fe2c55] transition-colors" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── COLONNE CENTRE : Feed ── */}
      <div className="relative z-20 flex justify-center items-center w-full lg:w-[35%]">
        <div
          ref={containerRef}
          className="h-screen w-full max-w-[500px] lg:h-[85vh] lg:w-[380px] lg:rounded-[40px] overflow-y-scroll snap-y snap-mandatory no-scrollbar relative shadow-[0_0_100px_rgba(0,0,0,0.1)] dark:shadow-[0_0_100px_rgba(0,0,0,1)] lg:border border-glass-border bg-black"
        >
          {produits.map((p, i) => (
            <div
              key={p.id}
              data-index={i}
              className="product-slide h-full w-full snap-start"
            >
              {/* ── Props currentIndex + total ajoutés ── */}
              <ProductItem
                product={p}
                whatsappNumber={whatsappNumber}
                isActive={activeIndex === i}
                currentIndex={i}
                total={produits.length}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── COLONNE DROITE : Zoom produit (desktop) ── */}
      <div className="hidden lg:flex flex-col w-[28%] px-10 space-y-6 z-10 overflow-y-auto max-h-[85vh] no-scrollbar">

        <div className="bg-glass-bg backdrop-blur-xl p-8 rounded-[32px] border border-glass-border shadow-2xl transition-all duration-500">
          <div className="flex items-center justify-between mb-6">
            <span className="text-[9px] font-black uppercase tracking-widest text-[#fe2c55] bg-[#fe2c55]/10 px-3 py-1 rounded-full border border-[#fe2c55]/20">
              Zoom Produit
            </span>
            <div className="flex items-center space-x-0.5 text-yellow-400">
              {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} fill="currentColor" />)}
            </div>
          </div>

          <h2 className="text-2xl font-black text-foreground mb-2 leading-tight uppercase italic">
            {activeProduct?.nom ?? '—'}
          </h2>
          <p className="text-card-text-muted text-xs mb-6 leading-relaxed">
            {activeProduct?.description ?? ''}
          </p>

          {/* Prix */}
          {activeProduct && (
            <div className="mb-6 p-4 rounded-2xl bg-surface border border-glass-border flex items-center justify-between">
              <span className="text-[10px] font-black text-card-text-muted uppercase tracking-widest">Prix</span>
              <span className="text-xl font-black text-foreground">
                {activeProduct.prixVente.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
          )}

          {/* Features */}
          {(activeProduct?.features?.length ?? 0) > 0 && (
            <div className="grid grid-cols-1 gap-3 mb-8">
              {activeProduct!.features!.map((feature, idx) => (
                <div key={idx} className="flex items-center space-x-3 p-3 rounded-2xl bg-surface border border-glass-border">
                  <CheckCircle2 size={14} className="text-[#fe2c55] shrink-0" />
                  <span className="text-xs font-bold text-card-text">{feature}</span>
                </div>
              ))}
            </div>
          )}

          {/* Galerie */}
          {(activeProduct?.images?.length ?? 0) > 0 && (
            <div className="space-y-4">
              <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-card-text-muted">Galerie</h3>
              <div className="flex flex-wrap gap-3">
                {activeProduct!.images!.map((img, idx) => (
                  <div key={idx} className="w-20 h-20 rounded-2xl overflow-hidden border border-glass-border bg-surface">
                    <img src={img} alt={`${activeProduct!.nom} ${idx}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-glass-bg p-6 rounded-[28px] border border-glass-border flex flex-col items-center text-center space-y-3 transition-colors duration-500">
            <Package size={20} className="text-[#fe2c55]" />
            <p className="text-[10px] font-black text-card-text uppercase">Express 24h</p>
          </div>
          <div className="bg-glass-bg p-6 rounded-[28px] border border-glass-border flex flex-col items-center text-center space-y-3 transition-colors duration-500">
            <Heart size={20} className="text-[#fe2c55]" />
            <p className="text-[10px] font-black text-card-text uppercase">Qualité Or</p>
          </div>
        </div>

      </div>
    </div>
  )
}