import { collection, getDocs, query, where } from 'firebase/firestore'
import { db, isConfigValid } from '@/lib/firebase'
import ProductFeed from '@/components/ProductFeed'

interface Product {
  id: string
  nom: string
  description: string
  prixVente: number
  videoUrl: string
  features?: string[]
  images?: string[]
}

// Mock products for development if Firebase is not configured or empty
const mockProduits: Product[] = [
  {
    id: '1',
    nom: 'Fer à lisser 2-en-1',
    description: 'Obtenez des cheveux soyeux et brillants en quelques minutes. Plaques céramiques, câble pivotant 360°.',
    prixVente: 4500,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-brushing-her-hair-41133-large.mp4',
    features: ['Plaques en céramique', 'Câble pivotant 360°', 'Température réglable', 'Chauffe rapide'],
    images: [
      'https://images.unsplash.com/photo-1522338242992-e1a54906a8da?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1595475243692-3b65bb2a8f41?q=80&w=400&auto=format&fit=crop'
    ]
  },
  {
    id: '2',
    nom: 'Épilateur Électrique Portable',
    description: 'Une peau douce partout où vous allez. Rechargeable et compact.',
    prixVente: 2500,
    videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-applying-lotion-to-her-legs-41131-large.mp4',
    features: ['Format compact', 'Rechargeable USB', 'Lumière LED intégrée', 'Etanche'],
    images: [
      'https://images.unsplash.com/photo-1556229010-6c3f2c9ca5f8?q=80&w=400&auto=format&fit=crop',
      'https://images.unsplash.com/photo-1619451334792-150fd785ee74?q=80&w=400&auto=format&fit=crop'
    ]
  }
]

export default async function Home() {
  let produits: Product[] = []
  let whatsappNumber = '+2290155063713'

  try {
    // Attempt to fetch from Firebase
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

  // Use mock products if none found or error
  if (produits.length === 0) {
    produits = mockProduits
  }

  return (
    <main className="h-screen w-full">
      <ProductFeed produits={produits} whatsappNumber={whatsappNumber} />
    </main>
  )
}
