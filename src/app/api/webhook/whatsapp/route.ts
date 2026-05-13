import { NextResponse } from 'next/server'
import { generateResponse } from '@/lib/claude'
import { sendWhatsAppMessage } from '@/lib/whatsapp'
import { db } from '@/lib/firebase'
import { collection, addDoc, getDocs, query, where, orderBy, limit, serverTimestamp } from 'firebase/firestore'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 })
  }

  return new NextResponse('Forbidden', { status: 403 })
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Check if it's a message event
    if (body.entry?.[0]?.changes?.[0]?.value?.messages?.[0]) {
      const messageObj = body.entry[0].changes[0].value.messages[0];
      const from = messageObj.from; // Sender's phone number
      const text = messageObj.text?.body;

      if (text && db) {
        // 1. Fetch conversation history from Firestore (simplified)
        const q = query(
          collection(db, 'conversations'),
          where('from', '==', from),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const snap = await getDocs(q);
        const history = snap.docs.reverse().map(d => ({
          role: d.data().role,
          content: d.data().content
        }));

        // 2. Generate AI response
        const aiResponse = await generateResponse(text, history);

        // 3. Send back to WhatsApp
        await sendWhatsAppMessage(from, aiResponse);

        // 4. Save to history
        await addDoc(collection(db, 'conversations'), {
          from,
          role: 'user',
          content: text,
          timestamp: serverTimestamp()
        });
        await addDoc(collection(db, 'conversations'), {
          from,
          role: 'assistant',
          content: aiResponse,
          timestamp: serverTimestamp()
        });
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp Webhook error:', error)
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 })
  }
}
