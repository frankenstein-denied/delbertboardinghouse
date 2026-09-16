import type { Timestamp } from 'firebase/firestore'

export interface UserProfile {
  uid: string
  name: string
  program: string
  room: string
  initials: string
  online: boolean
  createdAt: Timestamp
}

export interface Reaction {
  label: string
  emoji: string
}

export interface PostDoc {
  authorId: string
  authorName: string
  authorProgram: string
  authorRoom: string
  authorInitials: string
  body: string
  image: string | null
  reactions: Record<string, Reaction>
  commentsCount: number
  // Nullable: onSnapshot can deliver this doc (the latency-compensated local
  // write) before the serverTimestamp() round-trip resolves it to a real
  // value — callers deriving a relative/absolute time from this must
  // null-guard rather than assume it's always set.
  createdAt: Timestamp | null
  expiresAt: Timestamp
}

export interface ReportDoc {
  authorId: string
  type: string
  reason: string
  description: string
  // Nullable: onSnapshot can deliver this doc (the latency-compensated local
  // write) before the serverTimestamp() round-trip resolves it to a real
  // value — callers deriving a relative/absolute time from this must
  // null-guard rather than assume it's always set.
  createdAt: Timestamp | null
  expiresAt: Timestamp
}

export interface ConversationDoc {
  participantIds: string[]
  participantNames: Record<string, string>
  lastMessage: string
  // Nullable: onSnapshot can deliver this doc (the latency-compensated local
  // write) before the serverTimestamp() round-trip resolves it to a real
  // value — callers deriving a relative/absolute time from this must
  // null-guard rather than assume it's always set.
  lastMessageAt: Timestamp | null
  // Per-participant "read up to" cursor, keyed by uid. A participant with no
  // entry yet (never opened the chat, never sent a message) is treated as
  // having read nothing.
  lastReadAt: Record<string, Timestamp>
}

export interface MessageDoc {
  senderId: string
  text: string
  // Same nullability reasoning as PostDoc.createdAt above.
  createdAt: Timestamp | null
  expiresAt: Timestamp
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'ignored'

export interface FriendRequestDoc {
  fromUid: string
  toUid: string
  status: FriendRequestStatus
  createdAt: Timestamp
}
