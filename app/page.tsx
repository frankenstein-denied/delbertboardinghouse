'use client'

import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Bell,
  BookOpen,
  Check,
  ChevronDown,
  Clock3,
  Coffee,
  FileText,
  Flag,
  Heart,
  Image as ImageIcon,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Plus,
  Search,
  Send,
  Settings,
  SmilePlus,
  Sparkles,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

type View = 'home' | 'chats' | 'friends' | 'requests' | 'reports' | 'profile'
type User = { id: string; name: string; program: string; room: string; initials: string; online?: boolean }
type Reaction = { label: string; emoji: string; count: number }
type Post = { id: string; author: User; body: string; time: string; expiresIn: string; reactions: Reaction[]; comments: number; image?: string }
type Message = { id: string; text: string; from: 'me' | 'them'; time: string; expiresIn: string }

const currentUser: User = { id: 'peter', name: 'Peter Paul', program: 'BS Computer Science', room: 'Room 204', initials: 'PP', online: true }
const residents: User[] = [
  currentUser,
  { id: 'maria', name: 'Maria Santos', program: 'BS Nursing', room: 'Room 203', initials: 'MS', online: true },
  { id: 'juan', name: 'Juan Dela Cruz', program: 'BS Information Technology', room: 'Room 205', initials: 'JD', online: true },
  { id: 'angela', name: 'Angela Reyes', program: 'BS Education', room: 'Room 201', initials: 'AR' },
  { id: 'mark', name: 'Mark Villanueva', program: 'BS Engineering', room: 'Room 206', initials: 'MV', online: true },
  { id: 'bea', name: 'Bea Garcia', program: 'BS Psychology', room: 'Room 202', initials: 'BG' },
]
const posts: Post[] = [
  { id: '1', author: residents[1], body: 'Good morning, housemates! May extra pandesal sa kitchen. Kumuha lang kayo before 9AM hehe 🍞', time: '8m', expiresIn: 'Expires in 21h', reactions: [{ label: 'Hala ka ni Nanay', emoji: '😂', count: 12 }, { label: 'Sana all', emoji: '🥹', count: 4 }], comments: 6 },
  { id: '2', author: residents[2], body: 'Sino may charger for Macbook? Naiwan ko sa library and deadline ko na mamaya. Will return it with snacks!', time: '32m', expiresIn: 'Expires in 18h', reactions: [{ label: 'Sana all', emoji: '🥹', count: 7 }, { label: 'Keri yan', emoji: '💪', count: 3 }], comments: 11 },
  { id: '3', author: residents[4], body: 'Freedom Wall: sino yung nagluto ng sinigang kagabi? Grabe, naging main character yung kanin ko.', time: '1h', expiresIn: 'Expires in 17h', reactions: [{ label: 'Ang Panghe', emoji: '🤢', count: 4 }, { label: 'Hala ka ni Nanay', emoji: '😂', count: 9 }], comments: 14 },
]
const reactionOptions = [
  { label: 'Hala ka ni Nanay', emoji: '😂' },
  { label: 'Ang Panghe', emoji: '🤢' },
  { label: 'Sana all', emoji: '🥹' },
  { label: 'Keri yan', emoji: '💪' },
  { label: 'Pakisuyo', emoji: '🙏' },
]
const conversations = [
  { id: 'maria', user: residents[1], preview: 'Sige, kita tayo sa pantry!', time: '9:42 AM', unread: 2, messages: [{ id: 'a', text: 'Peter, may notes ka sa database?', from: 'them', time: '9:36 AM', expiresIn: 'Message expires in 3h 28m' }, { id: 'b', text: 'Meron! Send ko after lunch.', from: 'me', time: '9:39 AM', expiresIn: 'Message expires in 3h 25m' }, { id: 'c', text: 'Sige, kita tayo sa pantry!', from: 'them', time: '9:42 AM', expiresIn: 'Message expires in 3h 22m' }] as Message[] },
  { id: 'juan', user: residents[2], preview: 'Bro, may extra rice ka?', time: 'Yesterday', unread: 0, messages: [{ id: 'a', text: 'Bro, may extra rice ka?', from: 'them', time: 'Yesterday', expiresIn: 'Message expires in 2h 14m' }] as Message[] },
]

function Avatar({ user, size = 'md' }: { user: User; size?: 'sm' | 'md' | 'lg' }) {
  return <div className={`avatar avatar-${size}`} aria-label={user.name}>{user.initials}</div>
}
function Expiry({ children }: { children: string }) { return <span className="expiry"><Clock3 /> {children}</span> }

export default function Page() {
  const [user, setUser] = useState<User | null>(null)
  const [view, setView] = useState<View>('home')
  const [mobileMenu, setMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState(false)
  const [composer, setComposer] = useState('')
  const [activeReaction, setActiveReaction] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState(conversations[0])
  const [message, setMessage] = useState('')
  const [friendSearch, setFriendSearch] = useState('')

  if (!user) return <Onboarding onContinue={(name, program, room) => setUser({ ...currentUser, name, program, room, initials: name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() })} />
  const nav = (next: View) => { setView(next); setMobileMenu(false) }
  return <div className="app-shell">
    <Sidebar view={view} onNavigate={nav} user={user} />
    <div className="main-column">
      <header className="topbar">
        <button className="mobile-icon" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Open menu"><Menu /></button>
        <div className="mobile-brand"><span className="logo-mark">D</span><strong>delbert</strong></div>
        <div className="topbar-spacer" />
        <button className="icon-button notification-trigger" onClick={() => setNotifications(!notifications)} aria-label="Notifications"><Bell /><span className="notification-dot" /></button>
        <button className="top-profile" onClick={() => nav('profile')}><Avatar user={user} size="sm" /><ChevronDown /></button>
        {notifications && <NotificationPopover onClose={() => setNotifications(false)} />}
      </header>
      {mobileMenu && <MobileMenu view={view} onNavigate={nav} />}
      <main className="content-area">
        {view === 'home' && <HomeView user={user} composer={composer} setComposer={setComposer} activeReaction={activeReaction} setActiveReaction={setActiveReaction} />}
        {view === 'chats' && <ChatsView selectedChat={selectedChat} setSelectedChat={setSelectedChat} message={message} setMessage={setMessage} />}
        {view === 'friends' && <FriendsView search={friendSearch} setSearch={setFriendSearch} />}
        {view === 'requests' && <RequestsView />}
        {view === 'reports' && <ReportsView />}
        {view === 'profile' && <ProfileView user={user} />}
      </main>
    </div>
    <MobileNav view={view} onNavigate={nav} />
  </div>
}

function Onboarding({ onContinue }: { onContinue: (name: string, program: string, room: string) => void }) {
  const [name, setName] = useState('Peter Paul'); const [program, setProgram] = useState('BS Computer Science'); const [room, setRoom] = useState('Room 204')
  return <main className="onboarding"><div className="onboarding-art"><div className="sun-circle" /><div className="house-card"><span>DELBERT</span><div className="window-grid"><i /><i /><i /><i /></div><div className="house-door" /></div><div className="floating-note note-one">🍞 extra pandesal</div><div className="floating-note note-two">study buddy?</div></div><section className="welcome-card"><div className="brand-lockup"><span className="logo-mark">D</span><strong>delbert</strong></div><div className="welcome-copy"><span className="eyebrow">YOUR HOUSE, YOUR PEOPLE</span><h1>Welcome to Delbert <span>👋</span></h1><p>Your boarding house community, all in one place.</p></div><div className="onboarding-form"><label>Name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Juan Dela Cruz" /></label><label>Program<input value={program} onChange={(e) => setProgram(e.target.value)} placeholder="BS Computer Science" /></label><label>Room<input value={room} onChange={(e) => setRoom(e.target.value)} placeholder="Room 204" /></label><Button className="continue-button" onClick={() => onContinue(name, program, room)}>Enter Delbert <span>→</span></Button></div><p className="privacy-note"><Sparkles /> A cozy, private space for your boarding-house community.</p></section></main>
}

function Sidebar({ view, onNavigate, user }: { view: View; onNavigate: (view: View) => void; user: User }) {
  const items: { id: View; label: string; icon: typeof Bell; badge?: string }[] = [{ id: 'home', label: 'Home', icon: BookOpen }, { id: 'chats', label: 'Chats', icon: MessageCircle }, { id: 'friends', label: 'Friends', icon: Users }, { id: 'requests', label: 'Friend Requests', icon: UserPlus, badge: '3' }, { id: 'reports', label: 'Reports', icon: Flag }]
  return <aside className="sidebar"><div className="brand-lockup sidebar-brand"><span className="logo-mark">D</span><strong>delbert</strong></div><p className="sidebar-kicker">THE BOARDING HOUSE COMMUNITY</p><nav className="sidebar-nav">{items.map(({ id, label, icon: Icon, badge }) => <button key={id} className={view === id ? 'nav-item active' : 'nav-item'} onClick={() => onNavigate(id)}><Icon /> <span>{label}</span>{badge && <b>{badge}</b>}</button>)}</nav><div className="sidebar-bottom"><button className="nav-item"><Settings /> <span>Settings</span></button><button className="side-user" onClick={() => onNavigate('profile')}><Avatar user={user} /><span><strong>{user.name}</strong><small>{user.program} · {user.room}</small></span><MoreHorizontal /></button></div></aside>
}
function MobileMenu({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) { return <div className="mobile-menu">{[['requests', 'Friend Requests', UserPlus], ['reports', 'Reports', Flag]].map(([id, label, Icon]) => <button className={view === id ? 'active' : ''} key={id as string} onClick={() => onNavigate(id as View)}>{Icon && <Icon />} {label as string}</button>)}</div> }
function MobileNav({ view, onNavigate }: { view: View; onNavigate: (view: View) => void }) { return <nav className="mobile-nav">{[['home', 'Home', BookOpen], ['chats', 'Chats', MessageCircle], ['friends', 'Friends', Users], ['profile', 'Profile', UserPlus]].map(([id, label, Icon]) => <button className={view === id ? 'active' : ''} key={id as string} onClick={() => onNavigate(id as View)}>{Icon && <Icon />}<span>{label as string}</span></button>)}</nav> }
function NotificationPopover({ onClose }: { onClose: () => void }) { return <div className="notification-popover"><div className="popover-heading"><strong>Notifications</strong><button onClick={onClose}><X /></button></div><div className="notification-item"><Avatar user={residents[1]} size="sm" /><p><strong>Maria</strong> reacted “😂 Hala ka ni Nanay” to your post.<small>12 minutes ago</small></p></div><div className="notification-item"><Avatar user={residents[3]} size="sm" /><p><strong>Angela</strong> sent you a friend request.<small>1 hour ago</small></p></div></div> }

function HomeView({ user, composer, setComposer, activeReaction, setActiveReaction }: { user: User; composer: string; setComposer: (v: string) => void; activeReaction: string | null; setActiveReaction: (v: string | null) => void }) { return <div className="page-grid"><div className="feed-column"><div className="page-heading"><div><span className="eyebrow">TUESDAY, SEPTEMBER 16</span><h1>Good morning, {user.name.split(' ')[0]}.</h1><p>Here’s what’s happening around the house.</p></div><div className="heading-sparkle">✦</div></div><div className="composer-card card"><div className="composer-top"><Avatar user={user} /><textarea value={composer} onChange={(e) => setComposer(e.target.value)} placeholder={`What's happening, ${user.name.split(' ')[0]}?`} /></div><div className="composer-actions"><button><ImageIcon /> Photo</button><button><SmilePlus /> Feeling</button><button><Paperclip /> Add file</button><Button size="sm" disabled={!composer.trim()} onClick={() => setComposer('')}>Post</Button></div></div><div className="freedom-wall"><div className="wall-icon">✎</div><div><strong>Freedom Wall</strong><p>Your casual corner for random thoughts, shoutouts, and house tea.</p></div><Sparkles /></div>{posts.map((post) => <PostCard key={post.id} post={post} activeReaction={activeReaction} setActiveReaction={setActiveReaction} />)}<button className="load-more">Scroll for more house happenings <ChevronDown /></button></div><RightRail /></div> }
function PostCard({ post, activeReaction, setActiveReaction }: { post: Post; activeReaction: string | null; setActiveReaction: (v: string | null) => void }) { const [reacted, setReacted] = useState<string | null>(null); const reactions = reacted ? post.reactions.map((r) => r.label === reacted ? { ...r, count: r.count + 1 } : r) : post.reactions; return <article className="post-card card"><div className="post-header"><Avatar user={post.author} /><div className="post-byline"><strong>{post.author.name}</strong><span>{post.author.program} · {post.author.room}</span><small>{post.time} · <span className="public-dot">●</span> Housemates</small></div><button className="more-button"><MoreHorizontal /></button></div><p className="post-body">{post.body}</p><div className="post-footer-meta"><Expiry>{post.expiresIn}</Expiry><span>{post.comments} comments</span></div><div className="reaction-summary">{reactions.map((reaction) => <button key={reaction.label} onClick={() => setReacted(reaction.label)}>{reaction.emoji} {reaction.count}</button>)}</div><div className="post-actions"><div className="reaction-wrap"><button className={reacted ? 'reacted' : ''} onClick={() => setActiveReaction(activeReaction === post.id ? null : post.id)}><Heart /> {reacted ? 'Reacted' : 'React'}</button>{activeReaction === post.id && <div className="reaction-picker">{reactionOptions.map((option) => <button key={option.label} title={option.label} onClick={() => { setReacted(option.label); setActiveReaction(null) }}><span>{option.emoji}</span><small>{option.label}</small></button>)}</div>}</div><button><MessageCircle /> Comment</button><button><Send /> Share</button></div></article> }
function RightRail() { return <aside className="right-rail"><div className="rail-card card"><div className="rail-title"><span>HOUSE PULSE</span><span className="live-dot">● LIVE</span></div><div className="pulse-row"><span className="pulse-number">12</span><span>residents online<br /><small>Someone’s always around</small></span></div><div className="online-avatars">{residents.filter(r => r.online).map(r => <Avatar key={r.id} user={r} size="sm" />)}<span>+8</span></div></div><div className="rail-card card"><div className="rail-title"><span>QUICK NOTES</span><BookOpen /></div><div className="note-row"><span className="note-dot orange" /><p><strong>Quiet hours</strong><small>10:00 PM – 7:00 AM</small></p></div><div className="note-row"><span className="note-dot blue" /><p><strong>Kitchen clean-up</strong><small>Assigned to Room 201</small></p></div><div className="note-row"><span className="note-dot purple" /><p><strong>Wi-Fi password</strong><small>Ask the house admin</small></p></div></div><div className="rail-quote"><span>“</span><p>Small house, big stories.</p><small>— The Delbert house rule</small></div></aside> }

function ChatsView({ selectedChat, setSelectedChat, message, setMessage }: { selectedChat: typeof conversations[number]; setSelectedChat: (chat: typeof conversations[number]) => void; message: string; setMessage: (v: string) => void }) { return <div className="chat-layout"><section className="conversation-list card"><div className="section-heading"><div><span className="eyebrow">YOUR INBOX</span><h1>Chats</h1></div><button className="icon-button"><Plus /></button></div><div className="search-box"><Search /><input placeholder="Search chats" /></div>{conversations.map(chat => <button className={selectedChat.id === chat.id ? 'conversation active' : 'conversation'} key={chat.id} onClick={() => setSelectedChat(chat)}><Avatar user={chat.user} /><span><strong>{chat.user.name}</strong><small>{chat.preview}</small></span><time>{chat.time}{chat.unread > 0 && <b>{chat.unread}</b>}</time></button>)}</section><section className="chat-panel card"><div className="chat-header"><Avatar user={selectedChat.user} /><div><strong>{selectedChat.user.name}</strong><small><span className="online-dot" /> {selectedChat.user.online ? 'Online now' : 'Away'}</small></div><button className="icon-button"><MoreHorizontal /></button></div><div className="messages"><div className="chat-day">TODAY</div>{selectedChat.messages.map(msg => <div key={msg.id} className={`message-row ${msg.from === 'me' ? 'mine' : ''}`}><div className="message-bubble"><p>{msg.text}</p><small>{msg.time}</small></div><Expiry>{msg.expiresIn}</Expiry></div>)}</div><div className="message-composer"><button className="icon-button"><Plus /></button><input value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') setMessage('') }} placeholder="Type a message..." /><button className="send-button" onClick={() => setMessage('')}><Send /></button></div></section></div> }
function FriendsView({ search, setSearch }: { search: string; setSearch: (v: string) => void }) { const filtered = useMemo(() => residents.filter(r => r.name.toLowerCase().includes(search.toLowerCase()) || r.program.toLowerCase().includes(search.toLowerCase()) || r.room.toLowerCase().includes(search.toLowerCase())), [search]); return <div className="simple-page"><div className="page-heading"><div><span className="eyebrow">THE HOUSE ROLL CALL</span><h1>Friends</h1><p>Connect with the people who make this place feel like home.</p></div><Button><UserPlus /> Find friends</Button></div><div className="friends-toolbar"><div className="search-box"><Search /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, program, or room" /></div><span>{filtered.length} residents</span></div><div className="friends-grid">{filtered.filter(r => r.id !== 'peter').map(friend => <div className="friend-card card" key={friend.id}><div className="friend-card-top"><Avatar user={friend} size="lg" />{friend.online && <span className="profile-online" />}</div><strong>{friend.name}</strong><span>{friend.program}</span><small>{friend.room}</small><Button variant="outline" size="sm"><UserPlus /> Add Friend</Button></div>)}</div></div> }
function RequestsView() { const [requests, setRequests] = useState(residents.slice(3, 6)); return <div className="simple-page narrow-page"><div className="page-heading"><div><span className="eyebrow">PEOPLE WHO FOUND YOU</span><h1>Friend Requests <span className="heading-count">{requests.length}</span></h1><p>Say hello to a new housemate.</p></div></div>{requests.length ? <div className="request-list">{requests.map(person => <div className="request-card card" key={person.id}><Avatar user={person} size="lg" /><div className="request-info"><strong>{person.name}</strong><span>{person.program} · {person.room}</span><small>2 mutual housemates</small></div><div className="request-actions"><Button size="sm" onClick={() => setRequests(requests.filter(r => r.id !== person.id))}><Check /> Accept</Button><Button variant="outline" size="sm" onClick={() => setRequests(requests.filter(r => r.id !== person.id))}>Ignore</Button></div></div>)}</div> : <EmptyState icon={<UserPlus />} title="No new requests" body="You’re all caught up for now." />}</div> }
function ReportsView() { return <div className="simple-page narrow-page"><div className="page-heading"><div><span className="eyebrow">KEEPING OUR HOME KIND</span><h1>Reports</h1><p>Let the house admin know if something needs attention.</p></div></div><div className="report-layout"><section className="report-card card"><div className="report-intro"><div className="report-icon"><Flag /></div><div><strong>Make a report</strong><p>Reports are private and automatically removed after 24 hours.</p></div></div><label>Type<select defaultValue=""><option value="" disabled>Select a report type</option><option>House maintenance</option><option>Noise concern</option><option>Safety concern</option><option>Other</option></select></label><label>Reason<input placeholder="Give your report a short title" /></label><label>Description<textarea placeholder="Tell us what happened..." rows={5} /></label><div className="report-submit"><Expiry>Reports expire in 24h</Expiry><Button>Submit Report <Send /></Button></div></section><div className="report-side"><div className="rail-quote"><span>“</span><p>A better home starts with looking out for each other.</p></div><div className="help-note"><Coffee /><span>For emergencies, contact the house admin directly.</span></div></div></div></div> }
function ProfileView({ user }: { user: User }) { return <div className="simple-page profile-page"><div className="profile-cover"><div className="profile-pattern" /><Avatar user={user} size="lg" /><Button variant="outline"><Settings /> Edit Profile</Button></div><div className="profile-details card"><div><span className="eyebrow">ABOUT THIS RESIDENT</span><h1>{user.name}</h1><p>{user.program} · {user.room}</p></div><div className="profile-stats"><span><strong>18</strong> posts</span><span><strong>24</strong> friends</span><span><strong>Room 204</strong> home base</span></div></div><div className="profile-note card"><Sparkles /><div><strong>Welcome to your Delbert profile.</strong><p>Your profile is visible to fellow residents so housemates can find and connect with you.</p></div></div></div> }
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) { return <div className="empty-state card"><div>{icon}</div><h2>{title}</h2><p>{body}</p></div> }
function classNames(...classes: (string | false | undefined)[]) { return classes.filter(Boolean).join(' ') }

void classNames
void FileText
void classNames
