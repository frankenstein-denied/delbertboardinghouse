// Handles push notifications while the app is closed or in the background.
// Registered by components/pwa/push-notifications.tsx under its own scope
// (/firebase-cloud-messaging-push-scope) so it never competes with sw.js for
// the root scope. The Firebase web config arrives as query params on this
// script's URL (public values) so it isn't duplicated here.
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.14.1/firebase-messaging-compat.js')

const params = new URL(self.location.href).searchParams
firebase.initializeApp({
  apiKey: params.get('apiKey'),
  projectId: params.get('projectId'),
  messagingSenderId: params.get('messagingSenderId'),
  appId: params.get('appId'),
})

// Messages sent with a `notification` payload are displayed by the browser
// automatically; the SDK just needs to be initialised. Clicking one opens the
// app via the `link` set server-side (webpush.fcmOptions.link).
firebase.messaging()
