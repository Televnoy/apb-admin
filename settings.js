// --- УДАЛИТЬ ЭТИ СТРОКИ ---
    // import { db, messaging, saveFcmToken, removeFcmToken, getJudges, updateJudgeDevice, createJudgeKey, deleteJudgeKey } from '/apb-admin/firebase-init.js';
    // import { getToken } from 'firebase/messaging';
    // export function Settings({ show, onClose, adminDeviceId }) { ... }
    // export { ... }; // если есть
    // --- КОНЕЦ УДАЛЁННЫХ СТРОК ---

    // --- ДОБАВИТЬ ПРОВЕРКУ ЗАВИСИМОСТЕЙ ---
    if (typeof React === 'undefined') {
        console.error('React is not defined globally!');
        throw new Error('React must be loaded before settings.js');
    }
    if (typeof lucide === 'undefined') {
        console.error('lucide is not defined globally!');
        throw new Error('lucide must be loaded before settings.js');
    }
    if (typeof db === 'undefined' || typeof messaging === 'undefined') {
        console.error('Firebase (db, messaging) is not defined globally! Check firebase-init.js');
        throw new Error('Firebase must be initialized before settings.js');
    }
    // Предполагаем, что getToken доступен через messaging или другой способ,
    // или импортируем его внутри функций, если это возможно в модульной системе.
    // Но поскольку весь файл теперь не модуль, импорт в начале невозможен.
    // Попробуем получить его как часть messaging или глобально, если возможно.
    // Иначе, нужно будет переписать функцию, которая его использует.
    // const { getToken } = await import('firebase/messaging'); // Это не сработает в обычном скрипте так же.
    // Для упрощения, предположим, что firebase-init.js экспортирует getToken как глобальную функцию.
    // Проверим:
    if (typeof saveFcmToken === 'undefined' || typeof removeFcmToken === 'undefined' || typeof getJudges === 'undefined' || typeof updateJudgeDevice === 'undefined' || typeof createJudgeKey === 'undefined' || typeof deleteJudgeKey === 'undefined') {
        console.error('Firebase helper functions are not defined globally! Check firebase-init.js exports.');
        // Попробуем получить их из глобального объекта, если firebase-init.js их туда положил
        if (typeof window.firebaseHelpers !== 'object') {
            console.error('Firebase helpers not found globally and not exported by firebase-init.js as expected.');
            throw new Error('Firebase helpers not available.');
        }
        // Пример: window.firebaseHelpers = { saveFcmToken, removeFcmToken, ... };
        // Тогда используем window.firebaseHelpers.saveFcmToken и т.д.
        // Для простоты, предположим, что firebase-init.js делает что-то вроде:
        // window.mySaveFcmToken = saveFcmToken;
        // window.myRemoveFcmToken = removeFcmToken;
        // и т.д.
        // Проверим наличие таких глобальных функций.
        // Актуальные имена зависят от того, как firebase-init.js экспортирует функции.
        // Если firebase-init.js просто использует importmap и модули, то они не станут глобальными автоматически.
        // Нам нужно, чтобы firebase-init.js, когда он подключается как модуль, экспортировал свои функции,
        // и затем index.html как-то передавал их в settings.js.
        // Но это сложно с текущей архитектурой Babel Standalone + модули.
        // --- КРИТИЧЕСКОЕ ЗАМЕЧАНИЕ ---
        // Подключение модулей (firebase-init.js) и использование их в обычном скрипте (settings.js)
        // через глобальные переменные - это хрупкий способ.        // Лучше бы перейти на полноценную сборку.
        // --- ПОПЫТКА ПОЛУЧИТЬ ИЗ ГЛОБАЛЬНОГО ОБЪЕКТА ---
        // Допустим, firebase-init.js добавляет функции в глобальный объект window.
        // Проверим, есть ли они там.
        // Проверим, есть ли объект, содержащий наши функции, например, window.apbFirebase или window.fbHelpers
        // или просто надеемся, что они стали глобальными, если firebase-init.js был изменён соответственно.
        // ВАЖНО: firebase-init.js подключается как модуль. Его экспорты НЕ становятся глобальными автоматически.
        // Нам нужно, чтобы firebase-init.js делал что-то вроде:
        // window.apbDb = db;
        // window.apbMessaging = messaging;
        // window.apbSaveFcmToken = saveFcmToken;
        // window.apbRemoveFcmToken = removeFcmToken;
        // window.apbGetJudges = getJudges;
        // window.apbUpdateJudgeDevice = updateJudgeDevice;
        // window.apbCreateJudgeKey = createJudgeKey;
        // window.apbDeleteJudgeKey = deleteJudgeKey;
        // window.apbGetToken = getToken; // getToken не экспортируется, его нужно импортировать внутри функции, если settings.js будет модулем.
        // Проверим наличие такого глобального объекта или переменных.
        // ПОКА НЕ БУДЕМ БРОСАТЬ ОШИБКУ, А ПОПРОБУЕМ ПОЛУЧИТЬ ИХ НАПРЯМУЮ ИЗ window, если они там есть.
        // Проверим, есть ли они в window как отдельные переменные или в объекте.
        // Допустим, firebase-init.js делает window.apb = { db, messaging, saveFcmToken, ... }
        // Тогда:
        if (typeof window.apb === 'object') {
            window.db = window.apb.db;
            window.messaging = window.apb.messaging;
            window.saveFcmToken = window.apb.saveFcmToken;
            window.removeFcmToken = window.apb.removeFcmToken;
            window.getJudges = window.apb.getJudges;
            window.updateJudgeDevice = window.apb.updateJudgeDevice;
            window.createJudgeKey = window.apb.createJudgeKey;
            window.deleteJudgeKey = window.apb.deleteJudgeKey;
            // getToken нужно импортировать в функции, если settings.js модуль.
            // Но если settings.js не модуль, getToken не импортируется глобально.
            // Это становится сложной проблемой совместимости.
            // Лучший способ - модифицировать firebase-init.js, чтобы он делал глобальные присвоения.
            // Пока предположим, что firebase-init.js НЕ был изменён, и его экспорт недоступен.
            // Тогда settings.js как обычный скрипт не может получить доступ к его функциям через import.
            // НО! В вашем index.html firebase-init.js подключается как <script type="module">.
            // Это означает, что его переменные НЕ попадают в глобальный scope.
            // И settings.js подключается как обычный <script>.
            // settings.js НЕ может использовать import/export.
            // index.html использует Babel Standalone, который может обрабатывать import/export внутри <script type="text/babel" data-type="module">.
            // Но settings.js - это отдельный файл.
            // ВЫВОД: Единственный способ, чтобы settings.js (обычный скрипт) использовал функции из firebase-init.js (модуля) -
            // это чтобы firebase-init.js экспортировал их в глобальный объект window.
            // ПОЭТОМУ НУЖНО ИЗМЕНИТЬ firebase-init.js, чтобы он делал window.apb = { db, messaging, ... }.
            // Но пока мы не можем менять firebase-init.js, давайте предположим, что он это сделал.
            // Проверим window.apb
            if (typeof window.apb === 'undefined') {
                console.error('firebase-init.js did not expose its exports globally (e.g., window.apb). Cannot access helpers in settings.js.');                throw new Error('Firebase init did not provide global access to helpers.');
            }
            // Присваиваем глобальные переменные из apb
            window.db = window.apb.db;
            window.messaging = window.apb.messaging;
            window.saveFcmToken = window.apb.saveFcmToken;
            window.removeFcmToken = window.apb.removeFcmToken;
            window.getJudges = window.apb.getJudges;
            window.updateJudgeDevice = window.apb.updateJudgeDevice;
            window.createJudgeKey = window.apb.createJudgeKey;
            window.deleteJudgeKey = window.apb.deleteJudgeKey;
        } else {
             // Если window.apb нет, проверим, может быть, они напрямую в window?
             // Это менее вероятно и грязно, но если firebase-init.js делает window.db = ..., window.saveFcmToken = ...
             // Проверим:
             if (typeof window.db === 'undefined' || typeof window.saveFcmToken === 'undefined') {
                 console.error('Firebase exports (db, saveFcmToken, etc.) are not available globally. Check how firebase-init.js exposes them.');
                 throw new Error('Firebase exports not available.');
             }
             // Если они есть, используем как есть.
        }
    }


    // 🔧 Авто-инъекция стилей
    const injectCriticalStyles = () => {
        if (document.getElementById('settings-inline-styles')) return;
        const style = document.createElement('style');
        style.id = 'settings-inline-styles';
        style.textContent = `@keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes spin { to { transform: rotate(360deg); } } .animate-fade-in { animation: fade-in 0.2s ease-out; } .animate-pulse { animation: pulse 1.5s ease-in-out infinite; } .animate-spin { animation: spin 1s linear infinite; }`;
        document.head.appendChild(style);
    };

    // --- ОБЪЯВЛЯЕМ КОМПОНЕНТ Settings КАК ОБЫЧНУЮ ФУНКЦИЮ ---
    //window.Settings = function({ show, onClose, adminDeviceId }) { // Или просто function Settings(...)
    function SettingsComponent({ show, onClose, adminDeviceId }) { // Назовём её иначе внутри файла
        React.useEffect(() => { injectCriticalStyles(); }, []);

        const [pushEnabled, setPushEnabled] = React.useState(() => {
            const saved = localStorage.getItem('pushEnabled');
            return saved === null ? true : saved === 'true';
        });
        const [judges, setJudges] = React.useState([]);
        const [loadingJudges, setLoadingJudges] = React.useState(false);
        const [generating, setGenerating] = React.useState(false);
        const [toast, setToast] = React.useState({ show: false, message: '' });
        const [confirmDelete, setConfirmDelete] = React.useState(null);
        // ✅ Состояния для проверки обновлений
        const [updateStatus, setUpdateStatus] = React.useState('idle'); // idle, checking, available, current
        const [updateMessage, setUpdateMessage] = React.useState('');
        const copyToClipboard = async (text, label = 'Ключ') => {
            try {
                await navigator.clipboard.writeText(text);
                setToast({ show: true, message: `${label} скопирован!` });
                setTimeout(() => setToast({ show: false, message: '' }), 1500);
            } catch (err) {
                console.error('Ошибка копирования:', err);
                setToast({ show: true, message: 'Не удалось скопировать' });
                setTimeout(() => setToast({ show: false, message: '' }), 2000);
            }
        };

        const loadJudges = async () => {
            setLoadingJudges(true);
            try {
                const cached = localStorage.getItem('judgesCache');
                const cachedTime = localStorage.getItem('judgesCacheTime');
                const now = Date.now();
                if (cached && cachedTime && (now - parseInt(cachedTime)) < 5 * 60 * 1000) {
                    setJudges(JSON.parse(cached));
                } else {
                    // Используем глобальную функцию
                    const judgesList = await getJudges(); // window.getJudges если она глобальная
                    setJudges(judgesList);
                    localStorage.setItem('judgesCache', JSON.stringify(judgesList));
                    localStorage.setItem('judgesCacheTime', now.toString());
                }
            } catch (err) {
                console.error('Ошибка загрузки ключей:', err);
                const cached = localStorage.getItem('judgesCache');
                if (cached) setJudges(JSON.parse(cached));
            } finally {
                setLoadingJudges(false);
            }
        };

        React.useEffect(() => { if (show) loadJudges(); }, [show]);

        React.useEffect(() => {
            if (show && window.lucide) setTimeout(() => lucide.createIcons(), 50);
        }, [show, judges, loadingJudges]);

        const handleDeviceToggle = async (judgeKey, currentDeviceId, checked) => {
            if (!checked) {
                try {
                    // Используем глобальную функцию
                    await updateJudgeDevice(judgeKey, null); // window.updateJudgeDevice
                    setJudges(prev => prev.map(j => j.key === judgeKey ? { ...j, deviceId: null } : j));
                    setToast({ show: true, message: 'Устройство отвязано' });                    setTimeout(() => setToast({ show: false, message: '' }), 1500);
                } catch (err) {
                    console.error('Ошибка отвязки:', err);
                    setToast({ show: true, message: 'Ошибка отвязки' });
                    setTimeout(() => setToast({ show: false, message: '' }), 2000);
                }
            } else {
                setToast({ show: true, message: 'Войдите с ключом судьи для привязки' });
                setTimeout(() => setToast({ show: false, message: '' }), 2500);
            }
        };

        const handleDeleteKey = async (judge) => {
            try {
                 // Используем глобальную функцию
                 await deleteJudgeKey(judge.key); // window.deleteJudgeKey
                setJudges(prev => prev.filter(j => j.key !== judge.key));
                setToast({ show: true, message: 'Ключ удалён' });
                setTimeout(() => setToast({ show: false, message: '' }), 1500);
            } catch (err) {
                console.error('Ошибка удаления ключа:', err);
                setToast({ show: true, message: 'Ошибка удаления' });
                setTimeout(() => setToast({ show: false, message: '' }), 2000);
            }
            setConfirmDelete(null);
        };

        const handleGenerateKey = async () => {
            setGenerating(true);
            try {
                // Используем глобальную функцию
                await createJudgeKey(); // window.createJudgeKey
                await loadJudges();
                setToast({ show: true, message: 'Ключ сгенерирован!' });
                setTimeout(() => setToast({ show: false, message: '' }), 1500);
            } catch (err) {
                console.error('Ошибка генерации:', err);
                setToast({ show: true, message: 'Ошибка генерации' });
                setTimeout(() => setToast({ show: false, message: '' }), 2000);
            } finally {
                setGenerating(false);
            }
        };

        // ✅ Проверка обновлений - сравнение кэшированных файлов с сервером
        const checkForUpdates = async () => {
            setUpdateStatus('checking');
            setUpdateMessage('Проверка...');
            try {
              const CACHE_NAME = 'apb-admin-v1';              // Проверяем только основной HTML и манифест
              const urlsToCheck = ['/apb-admin/index.html'];

              let hasUpdates = false;
              const cache = await caches.open(CACHE_NAME);

              for (const url of urlsToCheck) {
                try {
                  // Пробуем получить кэшированную версию
                  const cachedResponse = await cache.match(url);
                  // Пробуем получить свежую версию с сервера, обходя кэш
                  const networkResponse = await fetch(url, { cache: 'reload' });

                  if (!cachedResponse) {
                    // Если в кэше нет файла - это обновление
                    hasUpdates = true;
                    break;
                  }

                  // Сравниваем содержимое
                  const cachedText = await cachedResponse.text();
                  const networkText = await networkResponse.text();

                  if (cachedText !== networkText) {
                    hasUpdates = true;
                    break;
                  }
                } catch (err) {
                  // Если не удалось проверить один из файлов, продолжаем
                  console.warn(`Не удалось проверить ${url}:`, err);
                }
              }

              if (hasUpdates) {
                setUpdateStatus('available');
                setUpdateMessage('Есть обновление');
              } else {
                setUpdateStatus('current');
                setUpdateMessage('Актуальная версия');
              }
            } catch (err) {
              console.error('Ошибка проверки обновлений:', err);
              setUpdateStatus('current'); // В случае ошибки считаем, что всё ок
              setUpdateMessage('Актуальная версия');
            }
        };

        // ✅ Очистка кэша и перезагрузка
        const clearCacheAndReload = async () => {
            try {                // Удаляем все кэши, начинающиеся с 'apb-admin'
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('apb-admin'))
                        .map(name => caches.delete(name))
                );

                  // Сообщаем Service Worker, чтобы он пропустил ожидание
                  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                    navigator.serviceWorker.controller.postMessage({ action: 'skipWaiting' });
                  }

                  setToast({ show: true, message: 'Кэш очищен, перезагрузка...' });
                  setTimeout(() => {
                    window.location.reload(true);
                  }, 1000);
            } catch (err) {
                console.error('Ошибка очистки кэша:', err);
                setToast({ show: true, message: 'Ошибка обновления' });
                setTimeout(() => setToast({ show: false, message: '' }), 2000);
            }
        };

        React.useEffect(() => {
            if (!adminDeviceId) return;
            const handlePushToggle = async () => {
                if (pushEnabled) {
                    try {
                        const registration = await navigator.serviceWorker.ready;
                        if (Notification.permission !== 'granted') await Notification.requestPermission();
                        if (Notification.permission === 'granted') {
                            // getToken нужно получить. Поскольку settings.js не модуль, мы не можем использовать import.
                            // getToken - это функция из 'firebase/messaging'.
                            // В идеале, firebase-init.js должен был экспортировать getToken как глобальную функцию.
                            // Допустим, он экспортировал как window.apbGetToken
                            // Проверим наличие такой функции или попробуем получить напрямую из messaging, если поддерживается.
                            // messaging из firebase-init.js может иметь метод getToken.
                            // const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
                            // getToken - это отдельная функция, её нужно импортировать.
                            // В модуле firebase-init.js: import { getToken } from 'firebase/messaging';
                            // export { getToken };
                            // Тогда в index.html: import { getToken } from '/apb-admin/firebase-init.js' в основном скрипте.
                            // Или firebase-init.js делает window.apbGetToken = getToken;
                            // Поскольку settings.js не модуль, мы не можем здесь напрямую импортировать getToken.
                            // Единственный способ - если firebase-init.js положил её в window.
                            // Проверим window.getToken или window.apbGetToken или window.apb.getToken
                            const getTokenFunc = window.apbGetToken || window.apb?.getToken || (window.apbMessaging ? (await import('firebase/messaging')).getToken : null);
                            if (!getTokenFunc) {
                                console.error('getToken function is not available globally.');                                return;
                            }
                            const vapidKey = 'BHZoy1QJ4PkloCIRFeKQ2UwYr44eziDY8C8wXqL4bSG6mbRGxQ03-v6vGJCmITc3jPWKfcq3Au3gVT860yIwNLg';
                            // Используем глобальную функцию getToken
                            const token = await getTokenFunc(messaging, { vapidKey, serviceWorkerRegistration: registration });
                            if (token) {
                                // Используем глобальную функцию saveFcmToken
                                await saveFcmToken(adminDeviceId, token, navigator.userAgent); // window.saveFcmToken
                            }
                        }
                    } catch (err) {
                        console.error('Push error:', err);
                        setToast({ show: true, message: 'Ошибка push' });
                        setTimeout(() => setToast({ show: false, message: '' }), 2000);
                    }
                } else {
                    try {
                        // Используем глобальную функцию removeFcmToken
                         await removeFcmToken(adminDeviceId); // window.removeFcmToken
                     } catch (err) { console.error(err); }
                }
            };
            handlePushToggle();
        }, [pushEnabled, adminDeviceId]);

        if (!show) return null;

        const toastElement = toast.show ? React.createElement(
            'div',
            { className: 'fixed inset-0 z-[300] flex items-center justify-center pointer-events-none' },
            React.createElement('div', {
                className: 'bg-black/90 text-white px-8 py-4 rounded-2xl text-sm font-medium animate-fade-in shadow-2xl backdrop-blur-sm'
            }, toast.message)
        ) : null;

        const confirmModal = confirmDelete ? React.createElement(
            'div',
            {
                className: 'fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/60',
                onClick: () => setConfirmDelete(null)
            },
            React.createElement(
                'div',
                {
                    className: 'bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl',
                    onClick: e => e.stopPropagation()
                },
                React.createElement('h3', { className: 'text-lg font-medium mb-2' }, 'Подтвердите удаление'),
                React.createElement('p', { className: 'text-sm text-gray-600 mb-4' },
                    `Вы действительно хотите удалить ключ "${confirmDelete.name || confirmDelete.key}"?`                ),
                React.createElement('div', { className: 'flex gap-3 justify-end' },
                    React.createElement('button', {
                        className: 'px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition',
                        onClick: () => setConfirmDelete(null)
                    }, 'Отмена'),
                   ', {
                        className: 'px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition',
                        onClick: () => handleDeleteKey(confirmDelete)
                    }, 'Удалить')
                )
            )
        ) : null;

        const renderSkeletonRow = (key) => React.createElement(
            'tr', { key, className: 'animate-pulse' },
            React.createElement('td', { className: 'px-4 py-3' }, React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' })),
            React.createElement('td', { className: 'px-4 py-3' }, React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' })),
            React.createElement('td', { className: 'px-4 py-3' }, React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' })),
            React.createElement('td', { className: 'px-4 py-3' }, React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' })),
            React.createElement('td', { className: 'px-4 py-3' }, React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' }))
        );

        return React.createElement(
            'div',
            { className: 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80', onClick: onClose },
            React.createElement(
                'div',
                { className: 'bg-white w-full max-w-4xl rounded-[32px] p-8 shadow-2xl space-y-6 border border-gray-100 max-h-[90vh] overflow-y-auto', onClick: e => e.stopPropagation() },
                  React.createElement('div', { className: 'flex justify-between items-center sticky top-0 bg-white pb-4 border-b border-gray-100 z-10' },
                    React.createElement('h2', { className:  'text-xl font-light tracking-tight' }, 'Настройки'),
                    React.createElement('button', { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 transition' },
                      React .createElement('i', { 'data-lucide': 'x', width: '24', height: '24' })
                    )
                  ),

                  React.createElement('div', { className: 'space-y-4' },
                    React.createElement('div', { classNa me: 'flex items-center justify-between' },
                      React.createElement('span', { className: 'text-[13px] font-medium uppercase tracking-widest' }, 'Push-уведомления'),
                      React.cr eateElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
                        React.createElement('input', {
                          type: 'checkbox', className: 'sr-only peer' , checked: pushEnabled,
                          onChange: e = > { const v = e.target.checked; setPushEnabled(v); localStorage.setItem('pushEnabled', v); }
                        }),
                        React.createElement('div', { className: 'w-11 h-6 bg-gray-200 round ed-full peer peer-checked:bg-black transition' }),
                        React.createElement('div', { className: 'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:tran slate-x-5' })
                      )
                    ),
                    React.createElement('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider' },
                      'Включите, чтобы получать уведомления о новы х оценках даже когда приложение закрыто.'                    )
                  ),

                  React.createElement('hr', { className: 'border-gray-100' }),

                  React.createElement('div', { className: 'space-y-4' },
                    R eact.createElement('h3', { className: 'text-[11px] font-medium uppercase tracking-widest text-gray-500' }, 'Управление ключами судей'),
                    React.createElement('div', { className:  'overflow-x-auto' },
                      React.createElement('table', { className: 'min-w-full text-[11px]' },
                        React.createElement('thead', { className: 'bg-gray-50 border-b border-gray-100' },
                          React.createElement('tr', null,
                            React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Ключ'),
                            React.c reateElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Имя'),
                            React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Город'),
                            React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'ID устройства'),
                            React.createElement('th',  { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Действия')
                          )
                        ),
                        React.createElement('tbody', { className: 'divide-y divide-gray-50' },
                           loadingJudges
                            ? Array.from({ length: 3 }).map((_, i) = > renderSkeletonRow(i))
                            : judges.length === 0
                              ? React.createElement('tr', { key: 'empty' },
                                  React.createElement('td', { colSpan: 5, clas sName: 'px-4 py-8 text-center text-gray-400' }, 'Нет ключей')
                                )
                              : judges.map((judge) = > React.createElement(
                                  'tr', { key: judge.key, className: 'hover:bg-gray-50 transition' },
                                  React.createElement('td', {
                                    class Name: 'px-4 py-3 font-mono text-[10px] cursor-pointer hover:text-blue-600 transition flex items-center gap-1',
                                    onClick: () = > copyToClipboard(judge.key, 'Ключ'),
                                    title: 'Нажмите для копирования'
                                  },
                                    judge.key,
                                    React.createEleme nt('i', { 'data-lucide': 'copy', className: 'w-3 h-3 opacity-40 hover:opacity-100 transition', width: '12', height: '12' })
                                  ),
                                  React.createEleme nt('td', { className: 'px-4 py-3' }, judge.displayName || '—'),
                                  React.createElement('td', { className: 'px-4 py-3' }, judge.city || '—'),
                                  React. createElement('td', { className: 'px-4 py-3 text-[10px]' }, judge.deviceId ? judge.deviceId.substring(0, 12) + '…' : '—'),
                                  React.createElement('td', { className:  'px-4 py-3' },
                                    React.createElement('div', { className: 'flex items-center gap-3' },
                                      React.createElement('label', { className: 'relative in line-flex items-center cursor-pointer', title: 'Отвязать устройство' },
                                        React.createElement('input', {
                                          type: 'checkbox', className : 'sr-only peer', checked: !!judge.deviceId,
                                          onChange: e = > handleDeviceToggle(judge.key, judge.deviceId, e.target.checked)
                                        }),
                                        React.createElement('div', { className: 'w-9 h-5 bg-gray-200 r ounded-full peer peer-checked:bg-black transition' }),
                                        React.createElement('div', { className: 'absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full t ransition peer-checked:translate-x-4' })
                                      ),
                                      React.createElement('button', {
                                        className: 'text-gray-400 hover:text -red-600 transition p-1',                                        onClick: (e) = > { e.stopPropagation(); setConfirmDelete(judge); },
                                        title: 'Удалить ключ'
                                      },
                                        React.createElement('i', { 'data -lucide': 'trash-2', width: '16', height: '16' })
                                      )
                                    )
                                  )
                                ))
                        )
                      )
                    ),

                    React.createEle ment('div', { className: 'flex justify-end mt-4' },
                      React.createElement('button', {
                        onClick: handleGenerateKey, disabled: generating,
                        className: 'bg-black tex t-white px-4 py-2 rounded-full text-[10px] font-medium uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2 '
                      },
                        generating
                          ? React.createElement(React.Fragment, null,
                              React.createElement('div', { className: 'w-3 h-3 border-2 border-white/30 border-t -white rounded-full animate-spin' }),
                              'Генерация...'
                            )
                          : 'Сгенерировать ключ'
                      )
                    ),

                    // ✅ Блок проверки обновлений - чёрная надпись  ниже кнопки
                    React.createElement('div', { className: 'flex flex-col items-end mt-3 space-y-1' },
                      // Кнопка  "Проверить обновление "
                      React.createElement('button', {
                        onClick: checkForUpdates,
                        disabled: updateStatus === 'checking',
                        className: 'text-black text-[10px] font-medium uppe rcase tracking-wider hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition'
                      },
                        updateStatus === 'checking' ? 'Проверка...' : 'Проверить обнов ление'
                      ),
                      // Надпись с результатом проверки
                      updateStatus !== 'idle'  & & updateStatus !== 'checking'  & & React.createElement(
                        'button', {
                          onClick: updateStatus === 'available' ? clearCacheAndReload : undefined,
                          className: `text-[10px] font-medium tracking -wider transition ${
                            updateStatus === 'available'
                              ? 'text-green-600 hover:text-green-700 cursor-pointer'
                              : 'text-gray-400 cursor-default'
                           }`
                        },
                        updateStatus === 'available'  & & React.createElement('span', { className: 'mr-1' }, '●'),
                        updateMessage
                      )
                    )                  )
                )

        );
    } // Конец функции SettingsComponent

    // --- СДЕЛАТЬ КОМПОНЕНТ ГЛОБАЛЬНЫМ ---
    window.Settings = SettingsComponent; // Присваиваем функцию компонента глобальной переменной

    // --- КОНЕЦ ФАЙЛА /apb-admin/settings.js ---
