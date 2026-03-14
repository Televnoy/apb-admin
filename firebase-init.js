import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, deleteDoc, serverTimestamp, collection, getDocs, updateDoc, getDoc } from 'firebase/firestore';
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

// Для adminFcmTokens
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

// Для judges
const getJudges = async () => {
  const snapshot = await getDocs(collection(db, 'judges'));
  const judges = [];
  snapshot.forEach(doc => {
    judges.push({ key: doc.id, ...doc.data() });
  });
  // сортируем по lastLogin (от новых к старым)
  judges.sort((a, b) => (b.lastLogin?.toDate() || 0) - (a.lastLogin?.toDate() || 0));
  return judges.slice(0, 5); // последние 5 активных
};

const updateJudgeDevice = async (judgeKey, deviceId) => {
  const updateData = deviceId === null 
    ? { deviceId: null, unboundAt: serverTimestamp() }
    : { deviceId, lastLogin: serverTimestamp() };
  await updateDoc(doc(db, 'judges', judgeKey), updateData);
};

const createJudgeKey = async () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = '';
  for (let i = 0; i < 6; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const docRef = doc(db, 'judges', key);
  const snap = await getDoc(docRef);
  if (snap.exists()) {
    return createJudgeKey(); // рекурсивный повтор при коллизии
  }
  await setDoc(docRef, {
    displayName: 'Новый судья',
    city: 'Не указан',
    createdAt: serverTimestamp()
  });
  return key;
};

export { db, messaging, saveFcmToken, removeFcmToken, getJudges, updateJudgeDevice, createJudgeKey };
