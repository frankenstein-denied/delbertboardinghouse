'use client'

import { useState } from 'react'
import {
  Bell,
  BookOpen,
  ChevronDown,
  Flag,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Settings,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { InstallButton } from '@/components/pwa/install-button'
import { UnreadBadge } from '@/components/pwa/unread-badge'
import { AuthProvider, useAuth } from '@/lib/auth-context'
import { LoginView } from '@/components/auth/login-view'
import { HomeView } from '@/components/home/home-view'
import { ChatsView } from '@/components/chats/chats-view'
import { FriendsView } from '@/components/friends/friends-view'
import { RequestsView } from '@/components/friends/requests-view'
import { ReportsView } from '@/components/reports/reports-view'
import { ProfileView } from '@/components/profile/profile-view'
import { Avatar } from '@/components/ui/avatar'
import type { UserProfile } from '@/lib/types'

type View = 'home' | 'chats' | 'friends' | 'requests' | 'reports' | 'profile'

export default function Page() {
  return (
    <AuthProvider>
      <PageShell />
    </AuthProvider>
  )
}

function PageShell() {
  const { profile, loading } = useAuth()
  const [view, setView] = useState<View>('home')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState(false)

  if (loading) return <main className="onboarding"><p>Loading…</p></main>
  if (!profile) return <LoginView />

  const nav = (next: View) => { setView(next); setMobileMenu(false) }
  return <div className="app-shell">
    <UnreadBadge profile={profile} />
    <Sidebar view={view} onNavigate={nav} profile={profile} />
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-icon" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></button>
        <div className="mobile-brand"><span className="logo-mark">D</span><strong>delbert</strong></div>
        <div className="topbar-spacer" />
        <button className="icon-button notification-trigger" onClick={() => setNotifications(!notifications)} aria-label="Notifications"><Bell /><span className="notification-dot" /></button>
        <button className="top-profile" onClick={() => nav('profile')}><Avatar profile={profile} size="sm" /><ChevronDown /></button>
        {notifications && <NotificationPopover onClose={() => setNotifications(false)} />}
      </header>
      {mobileMenu && <MobileMenu view={view} onNavigate={nav} />}
      <main className="content-area">
        {view === 'home' && <HomeView profile={profile} />}
        {view === 'chats' && <ChatsView profile={profile} />}
        {view === 'friends' && <FriendsView profile={profile} />}
        {view === 'requests' && <RequestsView profile={profile} />}
        {view === 'reports' && <ReportsView profile={profile} />}
        {view === 'profile' && <ProfileView profile={profile} />}
      </main>
    </div>
    <MobileNav view={view} onNavigate={nav} />
  </div>
}

function Sidebar({ view, onNavigate, profile }: { view: View; onNavigate: (view: View) => void; profile: UserProfile }) {
  const items: { id: View; label: string; icon: typeof Bell; badge?: string }[] = [{ id: 'home', label: 'Home', icon: BookOpen }, { id: 'chats', label: 'Chats', icon: MessageCircle }, { id: 'friends', label: 'Friends', icon: Users }, { id: 'requests', label: 'Friend Requests', icon: UserPlus }, { id: 'reports', label: 'Reports', icon: Flag }]
  return <aside className="sidebar">
    <div className="brand-lockup sidebar-brand"><span className="logo-mark">D</span><strong>delbert</strong></div>
    <p className="sidebar-kicker">THE BOARDING HOUSE COMMUNITY</p>
    <nav className="sidebar-nav">{items.map(({ id, label, icon: Icon, badge }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(id)}><Icon /> <span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav>
    <div className="sidebar-bottom">
      <InstallButton />
      <button className="nav-item"><Settings /> <span>Settings</span></button>
      <button className="side-user" onClick={() => onNavigate('profile')}><Avatar profile={profile} /><span><strong>{profile.name}</strong><small>{profile.program} · {profile.room}</small></span><MoreHorizontal /></button>
    </div>
  </aside>
}
function MobileMenu({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) { return <div className="mobile-menu">{[['requests', 'Friend Requests', UserPlus], ['reports', 'Reports', Flag]].map(([id, label, Icon]) => <button className={view === id ? 'active' : ''} key={id as string} onClick={() => onNavigate(id as View)}>{Icon && <Icon />} {label as string}</button>)}</div> }
function MobileNav({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) { return <nav className="mobile-nav">{[['home', 'Home', BookOpen], ['chats', 'Chats', MessageCircle], ['friends', 'Friends', Users], ['profile', 'Profile', UserPlus]].map(([id, label, Icon]) => <button className={view === id ? 'active' : ''} key={id as string} onClick={() => onNavigate(id as View)}>{Icon && <Icon />}<span>{label as string}</span></button>)}</nav> }
function NotificationPopover({ onClose }: { onClose: () => void }) {
  return <div className="notification-popover">
    <div className="popover-heading"><strong>Notifications</strong><button onClick={onClose}><X /></button></div>
    <div className="notification-item"><div className="avatar avatar-sm">MS</div><p><strong>Maria</strong> reacted &ldquo;😂 Hala ka ni Nanay&rdquo; to your post.<small>12 minutes ago</small></p></div>
    <div className="notification-item"><div className="avatar avatar-sm">AR</div><p><strong>Angela</strong> sent you a friend request.<small>1 hour ago</small></p></div>
  </div>
}
