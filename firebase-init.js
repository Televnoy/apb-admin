import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDSrWUBYjqYpA6CgG-tn0B2E_h9HN2wgZ8",
  authDomain: "apbapp-862a2.firebaseapp.com",
  projectId: "apbapp-862a2",
  storageBucket: "apbapp-862a2.firebasestorage.app",
  messagingSenderId: "909828829367",
  appId: "1:909828829367:web:64aa085f80b59b95d5dd32",
  measurementId: "G-026CEF7FKV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

const saveFcmToken = async (deviceId, token, userAgent) => {
  await setDoc(doc(db, 'adminFcmTokens', deviceId), {
    fcmToken: token,
    lastUpdated: serverTimestamp(),
    userAgent
  }, { merge: true });
};

export { db, messaging, saveFcmToken };

import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDSrWUBYjqYpA6CgG-tn0B2E_h9HN2wgZ8",
  authDomain: "apbapp-862a2.firebaseapp.com",
  projectId: "apbapp-862a2",
  storageBucket: "apbapp-862a2.firebasestorage.app",
  messagingSenderId: "909828829367",
  appId: "1:909828829367:web:64aa085f80b59b95d5dd32",
  measurementId: "G-026CEF7FKV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

const saveFcmToken = async (deviceId, token, userAgent) => {
  await setDoc(doc(db, 'adminFcmTokens', deviceId), {
    fcmToken: token,
    lastUpdated: serverTimestamp(),
    userAgent
  }, { merge: true });
};

const removeFcmToken = async (deviceId) => {
  await deleteDoc(doc(db, 'adminFcmTokens', deviceId));
};

export { db, messaging, saveFcmToken, removeFcmToken };