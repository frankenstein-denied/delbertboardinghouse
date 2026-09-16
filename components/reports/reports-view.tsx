'use client'

import { useState } from 'react'
import { Coffee, Flag, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Expiry } from '@/app/page'
import { db } from '@/lib/firebase'
import { addDoc, collection, serverTimestamp, Timestamp } from 'firebase/firestore'
import type { UserProfile } from '@/lib/types'

const REPORT_TTL_MS = 24 * 60 * 60 * 1000

export function ReportsView({ profile }: { profile: UserProfile }) {
  const [type, setType] = useState('')
  const [reason, setReason] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

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
      <div><span className="eyebrow">KEEPING OUR HOME KIND</span><h1>Reports</h1><p>Let the house admin know if something needs attention.</p></div>
    </div>
    <div className="report-layout">
      <section className="report-card card">
        <div className="report-intro"><div className="report-icon"><Flag /></div><div><strong>Make a report</strong><p>Reports are private and automatically removed after 24 hours.</p></div></div>
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
        {sent && <p className="auth-error" role="status" style={{ color: 'inherit' }}>Report sent to the house admin.</p>}
      </section>
      <div className="report-side">
        <div className="rail-quote"><span>&ldquo;</span><p>A better home starts with looking out for each other.</p></div>
        <div className="help-note"><Coffee /><span>For emergencies, contact the house admin directly.</span></div>
      </div>
    </div>
  </div>
}
