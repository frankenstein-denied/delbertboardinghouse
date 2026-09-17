export function GuideView() {
  return <div className="simple-page narrow-page">
    <div className="page-heading">
      <div><span className="eyebrow">HOW DELBERT WORKS</span><h1>Guide</h1><p>A few things worth knowing about how this app behaves.</p></div>
    </div>
    <div className="guide-list">
      <div className="guide-item card">
        <strong>Install the app</strong>
        <p>Look for an &ldquo;Install App&rdquo; button in the sidebar (or your browser&apos;s install / add-to-home-screen option) to add Delbert to your phone or desktop like a native app.</p>
      </div>
      <div className="guide-item card">
        <strong>Deleting your account</strong>
        <p>Go to your Profile and use the &ldquo;Delete Account&rdquo; option at the bottom. This permanently removes your profile and sign-in — it can&apos;t be undone.</p>
      </div>
      <div className="guide-item card">
        <strong>Reports are anonymous</strong>
        <p>Anything you submit under Reports is posted without your name attached — visible to everyone in the house, but never traced back to you.</p>
      </div>
      <div className="guide-item card">
        <strong>Freedom Wall posts disappear in 24 hours</strong>
        <p>Everything posted to the home feed automatically expires and is removed 24 hours after posting.</p>
      </div>
      <div className="guide-item card">
        <strong>Chats expire in 4 hours</strong>
        <p>Messages in your personal conversations automatically disappear 4 hours after they&apos;re sent.</p>
      </div>
    </div>
  </div>
}
