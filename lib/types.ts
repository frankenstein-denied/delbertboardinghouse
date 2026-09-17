import type { Timestamp } from 'firebase/firestore'

export type ResidentType = 'housemate' | 'outsider' | 'owner'
export const RESIDENT_TYPE_LABELS: Record<ResidentType, string> = {
  housemate: 'Housemate',
  outsider: 'Outsider',
  owner: 'Owner',
}

export interface UserProfile {
  uid: string
  name: string
  program: string
  residentType: ResidentType
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
  authorResidentType: ResidentType
  authorInitials: string
  body: string
  image: string | null
  reactions: Record<string, Reaction>
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

export interface CommentDoc {
  authorId: string
  authorName: string
  authorInitials: string
  body: string
  // Nullable: onSnapshot can deliver this doc (the latency-compensated local
  // write) before the serverTimestamp() round-trip resolves it to a real
  // value — callers deriving a relative/absolute time from this must
  // null-guard rather than assume it's always set.
  createdAt: Timestamp | null
  expiresAt: Timestamp
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'ignored'

export interface FriendRequestDoc {
  fromUid: string
  toUid: string
  status: FriendRequestStatus
  // Nullable: onSnapshot can deliver this doc (the latency-compensated local
  // write) before the serverTimestamp() round-trip resolves it to a real
  // value — callers deriving a relative/absolute time from this must
  // null-guard rather than assume it's always set.
  createdAt: Timestamp | null
}
