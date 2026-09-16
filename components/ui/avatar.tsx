import { Clock3 } from 'lucide-react'
import type { UserProfile } from '@/lib/types'

// Moved verbatim out of app/page.tsx: every view file (home/chats/friends/
// requests/reports/profile) imported these two from '@/app/page', while
// page.tsx imported all six view components — a circular import that only
// worked because these were hoisted function declarations. Living here
// instead breaks the cycle and keeps a route module out of every view's
// import graph.
export function Avatar({ profile, size = 'md' }: { profile: Pick<UserProfile, 'name' | 'initials'>; size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`avatar avatar-${size}`} aria-label={profile.name}>{profile.initials}</div>
}
export function Expiry({ children }: { children: string }) { return <span className="expiry"><Clock3 /> {children}</span> }
