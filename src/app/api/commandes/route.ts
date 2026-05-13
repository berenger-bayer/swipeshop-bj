import { NextResponse } from 'next/server'
import { db, isConfigValid } from '@/lib/firebase'
import { collection, addDoc, serverTimestamp } from 'firebase/firestore'

export async function POST(request: Request) {
  if (!isConfigValid || !db) {
    return NextResponse.json({ error: "Firebase not configured" }, { status: 500 })
  }

  try {
    const body = await request.json()
    const { produitId, produitNom, prixVente, client } = body

    if (!produitId || !client || !client.telephone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const docRef = await addDoc(collection(db, 'commandes'), {
      produitId,
      produitNom,
      prixVente,
      client,
      statut: 'en_attente',
      dateCommande: serverTimestamp(),
      dateModif: serverTimestamp(),
    })

    return NextResponse.json({ id: docRef.id, success: true }, { status: 201 })
  } catch (error) {
    console.error("Error creating order:", error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
