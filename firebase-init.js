/**
 * Firebase initialization for APB Admin
 * @module firebase-init
 */
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, doc, setDoc, deleteDoc, serverTimestamp, 
  collection, getDocs, updateDoc, getDoc, writeBatch 
} from 'firebase/firestore';
import { getMessaging, getToken as getFirebaseToken } from 'firebase/messaging';

// ⚠️ API ключи Firebase безопасны для клиента, но ограничьте домены в Console → Project Settings
const firebaseConfig = {
  apiKey: "AIzaSyDSrWUBYjqYpA6CgG-tn0B2E_h9HN2wgZ8",
  authDomain: "apbapp-862a2.firebaseapp.com",
  projectId: "apbapp-862a2",
  storageBucket: "apbapp-862a2.firebasestorage.app",
  messagingSenderId: "909828829367",
  appId: "1:909828829367:web:64aa085f80b59b95d5dd32",
  measurementId: "G-026CEF7FKV"
};

// Инициализация
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const messaging = getMessaging(app);

// 🔄 Кэш судей (в памяти, сбрасывается при перезагрузке страницы)
let judgesCache = null;
let judgesCacheTime = 0;
let judgesCachePromise = null; // Защита от параллельных запросов
const CACHE_DURATION = 30000; // 30 секунд

// 📦 Утилиты
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const retry = async (fn, maxAttempts = 3, delay = 1000) => {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      console.warn(`⚠️ Попытка ${attempt}/${maxAttempts} не удалась:`, err?.message);
      if (attempt < maxAttempts) await sleep(delay * attempt);
    }
  }
  throw lastError;
};

const logError = (context, err) => {
  console.error(`❌ ${context}:`, {
    message: err?.message,
    code: err?.code,
    stack: err?.stack
  });
  return err;
};

// 🔐 Push-токены админа
export const saveFcmToken = async (deviceId, token, userAgent) => {
  try {
    await retry(() => setDoc(doc(db, 'adminFcmTokens', deviceId), {
      fcmToken: token,
      lastUpdated: serverTimestamp(),
      userAgent,
      platform: navigator.platform
    }, { merge: true }));
    console.log('✅ FCM token saved:', deviceId);
  } catch (err) {
    throw logError('saveFcmToken', err);
  }
};

export const removeFcmToken = async (deviceId) => {
  try {
    await retry(() => deleteDoc(doc(db, 'adminFcmTokens', deviceId)));
    console.log('✅ FCM token removed:', deviceId);
  } catch (err) {
    throw logError('removeFcmToken', err);
  }
};

// 👨‍⚖️ Судьи
export const getJudges = async (forceRefresh = false) => {
  const now = Date.now();
  
  // Если есть валидный кэш и не форсировано обновление
  if (!forceRefresh && judgesCache && (now - judgesCacheTime) < CACHE_DURATION) {
    return judgesCache;
  }
  
  // Если уже есть запрос в процессе — ждём его (защита от гонки)
  if (judgesCachePromise && !forceRefresh) {
    return judgesCachePromise;
  }
  
  judgesCachePromise = (async () => {
    try {
      const snapshot = await retry(() => getDocs(collection(db, 'judges')));
      judgesCache = snapshot.docs.map(d => ({ 
        key: d.id, 
        ...d.data(),
        // Нормализуем данные
        displayName: d.data().displayName || 'Без имени',
        city: d.data().city || 'Не указан',
        deviceId: d.data().deviceId || null
      }));
      judgesCacheTime = now;
      console.log('✅ Judges loaded:', judgesCache.length);
      return judgesCache;
    } catch (err) {
      logError('getJudges', err);
      // Возвращаем старый кэш при ошибке, если есть
      if (judgesCache) {
        console.warn('⚠️ Returning stale cache');
        return judgesCache;
      }
      throw err;
    } finally {
      judgesCachePromise = null;
    }
  })();
  
  return judgesCachePromise;
};

export const invalidateJudgesCache = () => {
  judgesCache = null;
  judgesCacheTime = 0;
  judgesCachePromise = null;
  console.log('🔄 Judges cache invalidated');
};

export const updateJudgeDevice = async (judgeKey, deviceId) => {
  try {
    const docRef = doc(db, 'judges', judgeKey);
    await retry(() => updateDoc(docRef, {
      deviceId: deviceId || null,
      unboundAt: deviceId ? null : serverTimestamp(),
      lastModified: serverTimestamp()
    }));
    invalidateJudgesCache();
    console.log('✅ Judge device updated:', judgeKey);
  } catch (err) {
    throw logError('updateJudgeDevice', err);
  }
};

export const createJudgeKey = async (initialData = {}) => {
  try {
    let newKey;
    let exists = true;
    
    // Генерация уникального ключа (6 символов A-Z0-9)
    for (let attempts = 0; attempts < 10; attempts++) {
      newKey = Math.random().toString(36).substring(2, 8).toUpperCase();
      const snap = await getDoc(doc(db, 'judges', newKey));
      if (!snap.exists()) {
        exists = false;
        break;
      }
    }
    
    if (exists) {
      throw new Error('Не удалось сгенерировать уникальный ключ после 10 попыток');
    }
    
    const docRef = doc(db, 'judges', newKey);
    await retry(() => setDoc(docRef, {
      displayName: initialData.displayName || 'Новый судья',
      city: initialData.city || 'Не указан',
      deviceId: null,
      createdAt: serverTimestamp(),
      createdBy: 'admin', // Можно добавить ID текущего админа
      isActive: true
    }));
    
    invalidateJudgesCache();
    console.log('✅ Judge key created:', newKey);
    return newKey;
  } catch (err) {
    throw logError('createJudgeKey', err);
  }
};

export const deleteJudgeKey = async (judgeKey) => {
  try {
    // Проверка существования перед удалением (опционально)
    const snap = await getDoc(doc(db, 'judges', judgeKey));
    if (!snap.exists()) {
      console.warn('⚠️ Key not found for deletion:', judgeKey);
      return;
    }
    
    await retry(() => deleteDoc(doc(db, 'judges', judgeKey)));
    invalidateJudgesCache();
    console.log('✅ Judge key deleted:', judgeKey);
  } catch (err) {
    throw logError('deleteJudgeKey', err);
  }
};

// 🔍 Дополнительные утилиты (опционально)

/**
 * Получить одного судью по ключу (без кэша, всегда свежий)
 */
export const getJudgeByKey = async (judgeKey) => {
  try {
    const snap = await retry(() => getDoc(doc(db, 'judges', judgeKey)));
    if (!snap.exists()) return null;
    return { key: snap.id, ...snap.data() };
  } catch (err) {
    throw logError('getJudgeByKey', err);
  }
};

/**
 * Массовое обновление судей (батч-операция)
 */
export const updateJudgesBatch = async (updates) => {
  // updates: [{ key: 'ABC123', data: { displayName: 'New Name' } }, ...]
  try {
    const batch = writeBatch(db);
    updates.forEach(({ key, data }) => {
      const ref = doc(db, 'judges', key);
      batch.update(ref, { ...data, lastModified: serverTimestamp() });
    });
    await retry(() => batch.commit());
    invalidateJudgesCache();
    console.log('✅ Batch update completed:', updates.length, 'judges');
  } catch (err) {
    throw logError('updateJudgesBatch', err);
  }
};

/**
 * Поиск судей по городу или имени
 */
export const searchJudges = async (query) => {
  try {
    const all = await getJudges(true); // force refresh для актуальности
    const q = query.toLowerCase();
    return all.filter(j => 
      (j.displayName?.toLowerCase().includes(q)) || 
      (j.city?.toLowerCase().includes(q)) ||
      (j.key?.toLowerCase().includes(q))
    );
  } catch (err) {
    throw logError('searchJudges', err);
  }
};

// 🎯 Экспорт
export { db, messaging };
