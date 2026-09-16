'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  ChevronDown,
  Heart,
  Image as ImageIcon,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Send,
  SmilePlus,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, Expiry } from '@/app/page'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import {
  addDoc,
  collection,
  doc,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import type { PostDoc, UserProfile } from '@/lib/types'

const POST_TTL_MS = 24 * 60 * 60 * 1000
const REACTION_OPTIONS = [
  { label: 'Hala ka ni Nanay', emoji: '😂' },
  { label: 'Ang Panghe', emoji: '🤢' },
  { label: 'Sana all', emoji: '🥹' },
  { label: 'Keri yan', emoji: '💪' },
  { label: 'Pakisuyo', emoji: '🙏' },
]

function timeAgo(createdAt: Timestamp) {
  const minutes = Math.max(0, Math.round((Date.now() - createdAt.toMillis()) / 60000))
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.round(minutes / 60)
  return `${hours}h`
}

function expiresLabel(expiresAt: Timestamp) {
  const hours = Math.max(0, Math.ceil((expiresAt.toMillis() - Date.now()) / 3600000))
  return `Expires in ${hours}h`
}

export function HomeView({ profile }: { profile: UserProfile }) {
  const [composer, setComposer] = useState('')
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  // `expiresAt` is createdAt + a fixed 24h for every post, so ordering by it
  // is exactly equivalent to ordering by createdAt (constant offset) — one
  // orderBy does both "newest first" and "same field as the inequality
  // filter" (the latter is what keeps this off the composite-index list).
  //
  // The `>` bound is refreshed every 60s (not just captured once at mount):
  // Firestore's realtime listener does NOT re-evaluate an inequality against
  // a moving "now" — a post that crosses its expiresAt while this tab stays
  // open would otherwise keep matching the original snapshot's cutoff and
  // linger on screen until the (slow, "within 24h") TTL sweep actually
  // deletes it, which is exactly the stale-visibility problem the spec's R6
  // ruling says the client-side filter exists to prevent.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const postsQuery = useMemo(
    () => query(collection(db, 'posts'), where('expiresAt', '>', Timestamp.fromMillis(nowTick)), orderBy('expiresAt', 'desc')),
    [nowTick],
  )
  const { data: posts } = useCollection<PostDoc>(postsQuery)

  async function submitPost() {
    const body = composer.trim()
    if (!body || posting) return
    setPosting(true)
    try {
      const now = Date.now()
      await addDoc(collection(db, 'posts'), {
        authorId: profile.uid,
        authorName: profile.name,
        authorProgram: profile.program,
        authorRoom: profile.room,
        authorInitials: profile.initials,
        body,
        image: null,
        reactions: {},
        commentsCount: 0,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(now + POST_TTL_MS),
      })
      setComposer('')
    } finally {
      setPosting(false)
    }
  }

  return <div className="page-grid">
    <div className="feed-column">
      <div className="page-heading">
        <div><span className="eyebrow">THE FREEDOM WALL</span><h1>Good morning, {profile.name.split(' ')[0]}.</h1><p>Here&apos;s what&apos;s happening around the house.</p></div>
        <div className="heading-sparkle">✦</div>
      </div>
      <div className="composer-card card">
        <div className="composer-top">
          <Avatar profile={profile} />
          <textarea value={composer} onChange={(e) => setComposer(e.target.value)} placeholder={`What's happening, ${profile.name.split(' ')[0]}?`} />
        </div>
        <div className="composer-actions">
          <button type="button" disabled><ImageIcon /> Photo</button>
          <button type="button" disabled><SmilePlus /> Feeling</button>
          <button type="button" disabled><Paperclip /> Add file</button>
          <Button size="sm" disabled={!composer.trim() || posting} onClick={submitPost}>{posting ? 'Posting…' : 'Post'}</Button>
        </div>
      </div>
      <div className="freedom-wall">
        <div className="wall-icon">✎</div>
        <div><strong>Freedom Wall</strong><p>Your casual corner for random thoughts, shoutouts, and house tea.</p></div>
        <Sparkles />
      </div>
      {posts.map((post) => (
        <PostCard key={post.id} post={post} myUid={profile.uid} activeReaction={activeReaction} setActiveReaction={setActiveReaction} />
      ))}
      {posts.length === 0 && <p className="load-more">No posts yet — be the first to say something <ChevronDown /></p>}
    </div>
    <RightRail />
  </div>
}

function PostCard({ post, myUid, activeReaction, setActiveReaction }: {
  post: PostDoc & { id: string }
  myUid: string
  activeReaction: string | null
  setActiveReaction: (v: string | null) => void
}) {
  const myReaction = post.reactions[myUid]
  const counts = new Map<string, { emoji: string; count: number }>()
  for (const reaction of Object.values(post.reactions)) {
    const existing = counts.get(reaction.label)
    counts.set(reaction.label, { emoji: reaction.emoji, count: (existing?.count ?? 0) + 1 })
  }

  async function react(option: { label: string; emoji: string }) {
    await updateDoc(doc(db, 'posts', post.id), { [`reactions.${myUid}`]: option })
    setActiveReaction(null)
  }

  return <article className="post-card card">
    <div className="post-header">
      <Avatar profile={{ name: post.authorName, initials: post.authorInitials }} />
      <div className="post-byline"><strong>{post.authorName}</strong><span>{post.authorProgram} · {post.authorRoom}</span><small>{timeAgo(post.createdAt)} · <span className="public-dot">●</span> Housemates</small></div>
      <button className="more-button" type="button"><MoreHorizontal /></button>
    </div>
    <p className="post-body">{post.body}</p>
    <div className="post-footer-meta"><Expiry>{expiresLabel(post.expiresAt)}</Expiry><span>{post.commentsCount} comments</span></div>
    <div className="reaction-summary">
      {[...counts.entries()].map(([label, { emoji, count }]) => <span key={label}>{emoji} {count}</span>)}
    </div>
    <div className="post-actions">
      <div className="reaction-wrap">
        <button type="button" className={myReaction ? 'reacted' : ''} onClick={() => setActiveReaction(activeReaction === post.id ? null : post.id)}>
          <Heart /> {myReaction ? 'Reacted' : 'React'}
        </button>
        {activeReaction === post.id && (
          <div className="reaction-picker">
            {REACTION_OPTIONS.map((option) => (
              <button key={option.label} type="button" title={option.label} onClick={() => react(option)}>
                <span>{option.emoji}</span><small>{option.label}</small>
              </button>
            ))}
          </div>
        )}
      </div>
      <button type="button" disabled><MessageCircle /> Comment</button>
      <button type="button" disabled><Send /> Share</button>
    </div>
  </article>
}

function RightRail() {
  return <aside className="right-rail">
    <div className="rail-card card">
      <div className="rail-title"><span>QUICK NOTES</span><BookOpen /></div>
      <div className="note-row"><span className="note-dot orange" /><p><strong>Quiet hours</strong><small>10:00 PM – 7:00 AM</small></p></div>
      <div className="note-row"><span className="note-dot blue" /><p><strong>Kitchen clean-up</strong><small>Assigned to Room 201</small></p></div>
      <div className="note-row"><span className="note-dot purple" /><p><strong>Wi-Fi password</strong><small>Ask the house admin</small></p></div>
    </div>
    <div className="rail-quote"><span>&ldquo;</span><p>Small house, big stories.</p><small>— The Delbert house rule</small></div>
  </aside>
}
