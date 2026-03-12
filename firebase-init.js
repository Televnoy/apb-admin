import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

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

// Ссылка на коллекцию для токенов админок
const adminFcmTokensRef = collection(db, 'adminFcmTokens');

// Функция для сохранения токена
const saveFcmToken = async (deviceId, token, userAgent) => {
  await setDoc(doc(adminFcmTokensRef, deviceId), {
    fcmToken: token,
    lastUpdated: serverTimestamp(),
    userAgent
  }, { merge: true });
};

export { db, messaging, adminFcmTokensRef, saveFcmToken };
