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
  createdAt: Timestamp
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
  createdAt: Timestamp
  expiresAt: Timestamp
}

export type FriendRequestStatus = 'pending' | 'accepted' | 'ignored'

export interface FriendRequestDoc {
  fromUid: string
  toUid: string
  status: FriendRequestStatus
  createdAt: Timestamp
}
