import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, isConfigValid } from '@/lib/firebase'
import ProductFeed from '@/components/ProductFeed'
import { Package } from 'lucide-react'

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
  features?: string[]
  images?: string[]
}

export default async function Home() {
  let produits: Product[] = []
  let whatsappNumber = '+2290155063713'

  try {
    if (isConfigValid && db) {
      const q = query(collection(db, 'produits'), where('actif', '==', true))
      const snap = await getDocs(q)
      produits = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Product[]

      const sSnap = await getDocs(collection(db, 'settings'))
      if (!sSnap.empty) {
        whatsappNumber = sSnap.docs[0].data().whatsappNumber
      }
    }
  } catch (error) {
    console.error("Error fetching data from Firebase:", error)
  }

  return (
    <main className="h-screen w-full">
      {produits.length > 0 ? (
        <ProductFeed produits={produits} whatsappNumber={whatsappNumber} />
      ) : (
        <div className="h-screen w-full bg-background flex flex-col items-center justify-center p-4 text-center">
          <div className="w-16 h-16 bg-accent-indigo/10 rounded-2xl flex items-center justify-center mb-6">
            <Package className="text-accent-indigo" size={32} />
          </div>
          <h1 className="text-2xl font-black text-foreground mb-2">Boutique en maintenance</h1>
          <p className="text-card-text-muted max-w-xs">Nous préparons de nouveaux produits pour vous. Reviens très vite !</p>
        </div>
      )}
    </main>
  )
}
