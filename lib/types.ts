import type { Timestamp } from 'firebase/firestore'

export type Role = 'resident' | 'admin'

export interface UserProfile {
  uid: string
  name: string
  program: string
  room: string
  initials: string
  role: Role
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
  createdAt: Timestamp
  expiresAt: Timestamp
}

export interface ConversationDoc {
  participantIds: string[]
  participantNames: Record<string, string>
  lastMessage: string
  lastMessageAt: Timestamp
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
