'use client'

import { useEffect, useMemo, useState } from 'react'
import { Coffee, Flag, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Expiry } from '@/components/ui/avatar'
import { useCollection } from '@/lib/firestore-hooks'
import { db } from '@/lib/firebase'
import { addDoc, collection, orderBy, query, serverTimestamp, Timestamp, where } from 'firebase/firestore'
import type { ReportDoc, UserProfile } from '@/lib/types'

const REPORT_TTL_MS = 24 * 60 * 60 * 1000

function timeAgo(createdAt: Timestamp | null) {
  // Belt-and-braces null guard: useCollection resolves a pending
  // serverTimestamp() to a local estimate (see lib/firestore-hooks.ts), but
  // any future call site that reads a doc some other way could still hand
  // this a genuinely-null createdAt — fail soft instead of crashing.
  if (!createdAt) return 'just now'
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

export function ReportsView({ profile }: { profile: UserProfile }) {
  const [type, setType] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  // `expiresAt` is createdAt + a fixed 24h for every report, so ordering by
  // it is exactly equivalent to ordering by createdAt (constant offset) —
  // one orderBy does both "newest first" and "same field as the inequality
  // filter" (the latter is what keeps this off the composite-index list).
  //
  // The `>` bound is refreshed every 60s (not just captured once at mount):
  // a report that ages past 24h shouldn't linger visible in an open tab
  // waiting on the (slow, "within 24h") TTL sweep to actually delete it.
  const [nowTick, setNowTick] = useState(() => Date.now())
  useEffect(() => {
    const interval = setInterval(() => setNowTick(Date.now()), 60000)
    return () => clearInterval(interval)
  }, [])

  const reportsQuery = useMemo(
    () => query(collection(db, 'reports'), where('expiresAt', '>', Timestamp.fromMillis(nowTick)), orderBy('expiresAt', 'desc')),
    [nowTick],
  )
  const { data: reports, loading: reportsLoading } = useCollection<ReportDoc>(reportsQuery, 'reports', { persist: true })

  async function submit() {
    if (!type || !reason.trim() || submitting) return
    setSubmitting(true)
    try {
      await addDoc(collection(db, 'reports'), {
        authorId: profile.uid,
        type,
        reason: reason.trim(),
        description: description.trim(),
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + REPORT_TTL_MS),
      })
      setType(''); setReason(''); setDescription(''); setSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  return <div className="simple-page narrow-page">
    <div className="page-heading">
      <div><span className="eyebrow">KEEPING OUR HOME KIND</span><h1>Reports</h1><p>Anonymous reports, visible to everyone in the house.</p></div>
    </div>
    <div className="report-layout">
      <section className="report-card card">
        <div className="report-intro"><div className="report-icon"><Flag /></div><div><strong>Make a report</strong><p>Reports are posted anonymously and automatically removed after 24 hours.</p></div></div>
        <label>Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="" disabled>Select a report type</option>
            <option>House maintenance</option>
            <option>Noise concern</option>
            <option>Safety concern</option>
            <option>Other</option>
          </select>
        </label>
        <label>Reason<input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Give your report a short title" /></label>
        <label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell us what happened..." rows={5} /></label>
        <div className="report-submit">
          <Expiry>Reports expire in 24h</Expiry>
          <Button onClick={submit} disabled={!type || !reason.trim() || submitting}>{submitting ? 'Sending…' : 'Submit Report'} <Send /></Button>
        </div>
        {sent && <p className="auth-error" role="status" style={{ color: 'inherit' }}>Report posted anonymously.</p>}
      </section>
      <div className="report-side">
        <div className="rail-quote"><span>&ldquo;</span><p>A better home starts with looking out for each other.</p></div>
        <div className="help-note"><Coffee /><span>For emergencies, reach out to a housemate directly — this board isn&apos;t monitored in real time.</span></div>
      </div>
    </div>
    {reportsLoading && <p className="load-more">Loading reports…</p>}
    {!reportsLoading && reports.map((report) => <ReportCard key={report.id} report={report} />)}
    {!reportsLoading && reports.length === 0 && <p className="load-more">No active reports right now.</p>}
  </div>
}

function ReportCard({ report }: { report: ReportDoc & { id: string } }) {
  return <article className="post-card card">
    <div className="post-header">
      <div className="avatar avatar-md">🏠</div>
      <div className="post-byline"><strong>{report.type}</strong><small>{timeAgo(report.createdAt)} · <span className="public-dot">●</span> Housemates</small></div>
    </div>
    <p className="post-body"><strong>{report.reason}</strong>{report.description && <><br />{report.description}</>}</p>
    <div className="post-footer-meta"><Expiry>{expiresLabel(report.expiresAt)}</Expiry></div>
  </article>
}
