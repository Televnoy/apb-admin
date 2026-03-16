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

// ----- FCM токены -----
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

// ----- Работа с ключами судей (коллекция judges) -----
const getJudges = async () => {
  const snapshot = await getDocs(collection(db, 'judges'));
  return snapshot.docs.map(doc => ({ key: doc.id, ...doc.data() }));
};

const updateJudgeDevice = async (judgeKey, deviceId) => {
  const docRef = doc(db, 'judges', judgeKey);
  await updateDoc(docRef, { 
    deviceId: deviceId || null,
    unboundAt: deviceId ? null : serverTimestamp()
  });
};

const createJudgeKey = async (initialData = {}) => {
  // Генерируем 6-символьный ключ
  let newKey;
  let exists = true;
  let attempts = 0;
  while (exists && attempts < 10) {
    newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
    const docRef = doc(db, 'judges', newKey);
    const snap = await getDoc(docRef);
    exists = snap.exists();
    attempts++;
  }
  if (exists) throw new Error('Не удалось сгенерировать уникальный ключ');

  const docRef = doc(db, 'judges', newKey);
  await setDoc(docRef, {
    displayName: initialData.displayName || 'Новый судья',
    city: initialData.city || 'Не указан',
    deviceId: null,
    createdAt: serverTimestamp()
  });
  return newKey;
};

const deleteJudgeKey = async (judgeKey) => {
  await deleteDoc(doc(db, 'judges', judgeKey));
};

export { 
  db, 
  messaging, 
  saveFcmToken, 
  removeFcmToken,
  getJudges,
  updateJudgeDevice,
  createJudgeKey,
  deleteJudgeKey
};
