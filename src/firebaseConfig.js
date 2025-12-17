import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo-auth-domain',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project-id',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-storage-bucket',
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'demo-messaging-sender',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app-id',
}

const app = initializeApp(firebaseConfig)

export const db = getFirestore(app)
