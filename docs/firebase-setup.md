# Firebase project setup

One-time steps after creating the real Firebase project (Console → Add project).

## 1. Register a web app and get config

Console → Project settings → General → "Your apps" → Add app → Web.
Copy the six config values into `.env.local` (see `.env.local.example`).

## 2. Enable Auth

Console → Build → Authentication → Sign-in method → enable "Email/Password".

## 3. Create Firestore in production mode

Console → Build → Firestore Database → Create database → Production mode
(the rules in `firestore.rules` are the real access control — production
mode just means "start locked down," which these rules then open up
correctly).

## 4. Deploy the security rules

Either paste `firestore.rules`'s contents into Console → Firestore Database
→ Rules → publish, or with the Firebase CLI:

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # point it at this repo's firestore.rules
firebase deploy --only firestore:rules
```

## 5. Enable TTL policies (does the actual 24h/4h deletion)

TTL can only be configured against a real, existing collection group, so this
is a `gcloud` (or Console) step, not something this repo's code can do:

```bash
gcloud firestore fields ttls update expiresAt \
  --collection-group=posts --enable-ttl --project=YOUR_PROJECT_ID

gcloud firestore fields ttls update expiresAt \
  --collection-group=reports --enable-ttl --project=YOUR_PROJECT_ID

gcloud firestore fields ttls update expiresAt \
  --collection-group=messages --enable-ttl --project=YOUR_PROJECT_ID
```

(Console equivalent: Firestore Database → each collection → the `expiresAt`
field → "Enable TTL".) Firestore describes TTL deletion as happening
"within 24 hours" of the timestamp, not instantly — the app's own queries
already filter out expired documents immediately, so this step is only
about eventually reclaiming storage, not about what residents see.

## 6. (Optional) Promote an admin

Reports are readable by their author and by `role == 'admin'` users only.
To make a resident an admin after they've signed up once (so their `users/{uid}`
doc exists): Console → Firestore Database → `users` → their doc → edit the
`role` field from `resident` to `admin`. There is no in-app UI for this
(not requested) — it's a one-off manual edit.

## 7. Composite index for the chats list

Every query in this app filters/sorts on a single field except one: the
conversation list (`components/chats/chats-view.tsx`) filters by
`array-contains` on `participantIds` *and* sorts by `lastMessageAt` — two
different fields, which Firestore can't serve from automatic single-field
indexes alone. The first time that query runs against your real project,
Firestore throws an error containing a console link that creates the exact
composite index needed — click it once, wait ~a minute for the index to
build, and it never comes up again. This is normal Firestore behavior, not
a bug: every other query in the app (posts, messages, friend requests) only
combines a filter/sort on the *same* field, so none of them need this.
