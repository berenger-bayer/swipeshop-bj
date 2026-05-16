import { collection, getDocs, query, where } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProductFeed from '@/components/ProductFeed'

// Sérialise les données Firestore pour les Server Components
// (évite l'erreur "Objects with toJSON methods are not supported")
function serializeProduct(data: Record<string, unknown>, id: string) {
  return {
    id,
    nom:         (data.nom as string)         ?? '',
    description: (data.description as string) ?? '',
    prixVente:   (data.prixVente as number)   ?? 0,
    videoUrl:    (data.videoUrl as string)    ?? '',
    audioUrl:    (data.audioUrl as string)    ?? '',
    features:    (data.features as string[])  ?? [],
    images:      (data.images as string[])    ?? [],
    actif:       (data.actif as boolean)      ?? true,
    // dateCreation est un Timestamp Firebase — on le convertit en ISO string
    dateCreation: data.dateCreation
      ? new Date(
          (data.dateCreation as { seconds: number }).seconds * 1000
        ).toISOString()
      : null,
  }
}

async function getSettings() {
  if (!db) return { whatsappNumber: '+22900000000', shopName: 'SwipeShop Bénin' }
  try {
    const snap = await getDocs(collection(db, 'settings'))
    if (!snap.empty) return snap.docs[0].data() as { whatsappNumber: string; shopName: string }
  } catch {}
  return { whatsappNumber: '+2290155063713', shopName: 'SwipeShop Bénin' }
}

export default async function Home() {
  let produits: ReturnType<typeof serializeProduct>[] = []
  let settings = { whatsappNumber: '+2290155063713', shopName: 'SwipeShop Bénin' }

  if (db) {
    try {
      const [pSnap, s] = await Promise.all([
        getDocs(query(collection(db, 'produits'), where('actif', '==', true))),
        getSettings(),
      ])
      produits = pSnap.docs.map(d => serializeProduct(d.data(), d.id))
      settings = s
    } catch (err) {
      console.error('Error fetching data from Firebase:', err)
    }
  }

  return (
    <main className="w-full h-screen overflow-hidden bg-black">
      <ProductFeed
        produits={produits}
        whatsappNumber={settings.whatsappNumber}
      />
    </main>
  )
}