import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import { getMessaging } from 'firebase-admin/messaging'

export const runtime = 'nodejs'

// Needs FIREBASE_SERVICE_ACCOUNT: the full service-account JSON (Firebase
// Console → Project settings → Service accounts → Generate new private key),
// set as a server-only env var on the host. Never prefix it NEXT_PUBLIC_.
function adminApp() {
  if (getApps().length) return getApps()[0]
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set')
  return initializeApp({ credential: cert(JSON.parse(raw)) })
}

// POST { conversationId, text } with `Authorization: Bearer <Firebase ID token>`.
// The caller must be a participant; the push goes to the OTHER participant's
// registered devices only.
export async function POST(request: Request) {
  try {
    const idToken = request.headers.get('authorization')?.replace(/^Bearer /, '')
    if (!idToken) return Response.json({ error: 'unauthorized' }, { status: 401 })
    const app = adminApp()
    const { uid } = await getAuth(app).verifyIdToken(idToken)

    const { conversationId, text } = await request.json()
    if (typeof conversationId !== 'string' || typeof text !== 'string' || !text.trim()) {
      return Response.json({ error: 'bad request' }, { status: 400 })
    }

    const db = getFirestore(app)
    const conversation = (await db.doc(`conversations/${conversationId}`).get()).data()
    const participants: string[] = conversation?.participantIds ?? []
    if (!participants.includes(uid)) return Response.json({ error: 'forbidden' }, { status: 403 })

    const recipientUid = participants.find((id) => id !== uid)
    if (!recipientUid) return Response.json({ sent: 0 })

    const tokenDocs = await db.collection(`users/${recipientUid}/fcmTokens`).get()
    const tokens = tokenDocs.docs.map((d) => d.id)
    if (tokens.length === 0) return Response.json({ sent: 0 })

    const senderName: string = conversation?.participantNames?.[uid] ?? 'A housemate'
    const result = await getMessaging(app).sendEachForMulticast({
      tokens,
      notification: { title: senderName, body: text.trim().slice(0, 120) },
      webpush: { fcmOptions: { link: '/' }, notification: { icon: '/icon-192x192.png', tag: conversationId } },
    })

    // Drop tokens for devices that unregistered so we stop targeting them.
    await Promise.all(
      result.responses.map((r, i) =>
        !r.success && r.error?.code === 'messaging/registration-token-not-registered'
          ? tokenDocs.docs[i].ref.delete()
          : null,
      ),
    )
    return Response.json({ sent: result.successCount })
  } catch (err) {
    console.error('notify failed:', err)
    return Response.json({ error: 'failed' }, { status: 500 })
  }
}
