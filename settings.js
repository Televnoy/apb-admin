import React, { useState, useEffect } from 'react';
import { db, messaging, saveFcmToken, removeFcmToken, getJudges, updateJudgeDevice, createJudgeKey, deleteJudgeKey } from '/apb-admin/firebase-init.js';
import { getToken } from 'firebase/messaging';

// 🔧 Авто-инъекция стилей
const injectCriticalStyles = () => {
  if (document.getElementById('settings-inline-styles')) return;
  const style = document.createElement('style');
  style.id = 'settings-inline-styles';
  style.textContent = `
    @keyframes fade-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    @keyframes spin { to { transform: rotate(360deg); } }
    .animate-fade-in { animation: fade-in 0.2s ease-out; }
    .animate-pulse { animation: pulse 1.5s ease-in-out infinite; }
    .animate-spin { animation: spin 1s linear infinite; }
  `;
  document.head.appendChild(style);
};

export function Settings({ show, onClose, adminDeviceId }) {
  useEffect(() => { injectCriticalStyles(); }, []);
  
  const [pushEnabled, setPushEnabled] = useState(() => {
    const saved = localStorage.getItem('pushEnabled');
    return saved === null ? true : saved === 'true';
  });
  const [judges, setJudges] = useState([]);
  const [loadingJudges, setLoadingJudges] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // ✅ Состояние для проверки обновлений
  const [updateStatus, setUpdateStatus] = useState('idle'); // idle, checking, available, current, error
  const [updateMessage, setUpdateMessage] = useState('');

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
      }
      const judgesList = await getJudges();
      setJudges(judgesList);
      localStorage.setItem('judgesCache', JSON.stringify(judgesList));
      localStorage.setItem('judgesCacheTime', now.toString());
    } catch (err) {
      console.error('Ошибка загрузки ключей:', err);
      const cached = localStorage.getItem('judgesCache');
      if (cached) setJudges(JSON.parse(cached));
    } finally {
      setLoadingJudges(false);
    }
  };

  useEffect(() => { if (show) loadJudges(); }, [show]);
  
  useEffect(() => {
    if (show && window.lucide) setTimeout(() => lucide.createIcons(), 50);
  }, [show, judges, loadingJudges]);

  const handleDeviceToggle = async (judgeKey, currentDeviceId, checked) => {
    if (!checked) {
      try {
        await updateJudgeDevice(judgeKey, null);
        setJudges(prev => prev.map(j => j.key === judgeKey ? { ...j, deviceId: null } : j));
        setToast({ show: true, message: 'Устройство отвязано' });
        setTimeout(() => setToast({ show: false, message: '' }), 1500);
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
      if (typeof deleteJudgeKey === 'function') {
        await deleteJudgeKey(judge.key);
      } else {
        import('firebase/firestore').then(({ doc, deleteDoc }) => {
          deleteDoc(doc(db, 'judges', judge.key));
        });
      }
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
      await createJudgeKey();
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
      const CACHE_NAME = 'apb-admin-v1';
      const urlsToCheck = [
        '/apb-admin/index.html',
        '/apb-admin/a-manifest.json',
        '/apb-admin/aicon-72.png',
        '/apb-admin/aicon-192.png',
        '/apb-admin/aicon-512.png'
      ];
      
      let hasUpdates = false;
      const cache = await caches.open(CACHE_NAME);
      
      for (const url of urlsToCheck) {
        try {
          // Получаем кэшированную версию
          const cachedResponse = await cache.match(url);
          // Получаем актуальную версию с сервера (с bypass кэша)
          const networkResponse = await fetch(url, { cache: 'no-cache' });
          
          if (!cachedResponse) {
            // Файла нет в кэше - значит есть обновление
            hasUpdates = true;
            break;
          }
          
          // Сравниваем заголовки Last-Modified или ETag
          const cachedLastModified = cachedResponse.headers.get('Last-Modified');
          const networkLastModified = networkResponse.headers.get('Last-Modified');
          const cachedETag = cachedResponse.headers.get('ETag');
          const networkETag = networkResponse.headers.get('ETag');
          
          // Если есть ETag - сравниваем его
          if (cachedETag && networkETag && cachedETag !== networkETag) {
            hasUpdates = true;
            break;
          }
          
          // Если есть Last-Modified - сравниваем его
          if (cachedLastModified && networkLastModified && cachedLastModified !== networkLastModified) {
            hasUpdates = true;
            break;
          }
          
          // Если нет заголовков - сравниваем размер контента
          const cachedText = await cachedResponse.text();
          const networkText = await networkResponse.text();
          if (cachedText !== networkText) {
            hasUpdates = true;
            break;
          }
        } catch (err) {
          console.warn('Не удалось проверить файл:', url, err);
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
      setUpdateStatus('error');
      setUpdateMessage('Ошибка проверки');
    }
  };

  // ✅ Очистка кэша и перезагрузка
  const clearCacheAndReload = async () => {
    try {
      const CACHE_NAME = 'apb-admin-v1';
      const cacheKeys = await caches.keys();
      for (const key of cacheKeys) {
        if (key === CACHE_NAME) {
          await caches.delete(key);
        }
      }
      
      // Отправляем сообщение сервис-воркеру
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
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

  useEffect(() => {
    if (!adminDeviceId) return;
    const handlePushToggle = async () => {
      if (pushEnabled) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (Notification.permission !== 'granted') await Notification.requestPermission();
          if (Notification.permission === 'granted') {
            const vapidKey = 'BHZoy1QJ4PkloCIRFeKQ2UwYr44eziDY8C8wXqL4bSG6mbRGxQ03-v6vGJCmITc3jPWKfcq3Au3gVT860yIwNLg';
            const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
            if (token) await saveFcmToken(adminDeviceId, token, navigator.userAgent);
          }
        } catch (err) {
          console.error('Push error:', err);
          setToast({ show: true, message: 'Ошибка push' });
          setTimeout(() => setToast({ show: false, message: '' }), 2000);
        }
      } else {
        try { await removeFcmToken(adminDeviceId); } catch (err) { console.error(err); }
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
        `Вы действительно хотите удалить ключ "${confirmDelete.name || confirmDelete.key}"?`
      ),
      React.createElement('div', { className: 'flex gap-3 justify-end' },
        React.createElement('button', {
          className: 'px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition',
          onClick: () => setConfirmDelete(null)
        }, 'Отмена'),
        React.createElement('button', {
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
      
      // Заголовок
      React.createElement('div', { className: 'flex justify-between items-center sticky top-0 bg-white pb-4 border-b border-gray-100 z-10' },
        React.createElement('h2', { className: 'text-xl font-light tracking-tight' }, 'Настройки'),
        React.createElement('button', { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 transition' },
          React.createElement('i', { 'data-lucide': 'x', width: '24', height: '24' })
        )
      ),

      // Push-уведомления
      React.createElement('div', { className: 'space-y-4' },
        React.createElement('div', { className: 'flex items-center justify-between' },
          React.createElement('span', { className: 'text-[13px] font-medium uppercase tracking-widest' }, 'Push-уведомления'),
          React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
            React.createElement('input', {
              type: 'checkbox', className: 'sr-only peer', checked: pushEnabled,
              onChange: e => { const v = e.target.checked; setPushEnabled(v); localStorage.setItem('pushEnabled', v); }
            }),
            React.createElement('div', { className: 'w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition' }),
            React.createElement('div', { className: 'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5' })
          )
        ),
        React.createElement('p', { className: 'text-[10px] text-gray-400 uppercase tracking-wider' },
          'Включите, чтобы получать уведомления о новых оценках даже когда приложение закрыто.'
        )
      ),

      React.createElement('hr', { className: 'border-gray-100' }),

      // Таблица ключей
      React.createElement('div', { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-[11px] font-medium uppercase tracking-widest text-gray-500' }, 'Управление ключами судей'),
        React.createElement('div', { className: 'overflow-x-auto' },
          React.createElement('table', { className: 'min-w-full text-[11px]' },
            React.createElement('thead', { className: 'bg-gray-50 border-b border-gray-100' },
              React.createElement('tr', null,
                React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Ключ'),
                React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Имя'),
                React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Город'),
                React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'ID устройства'),
                React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Действия')
              )
            ),
            React.createElement('tbody', { className: 'divide-y divide-gray-50' },
              loadingJudges
                ? Array.from({ length: 3 }).map((_, i) => renderSkeletonRow(i))
                : judges.length === 0
                  ? React.createElement('tr', { key: 'empty' },
                      React.createElement('td', { colSpan: 5, className: 'px-4 py-8 text-center text-gray-400' }, 'Нет ключей')
                    )
                  : judges.map((judge) => React.createElement(
                      'tr', { key: judge.key, className: 'hover:bg-gray-50 transition' },
                      
                      React.createElement('td', {
                        className: 'px-4 py-3 font-mono text-[10px] cursor-pointer hover:text-blue-600 transition flex items-center gap-1',
                        onClick: () => copyToClipboard(judge.key, 'Ключ'),
                        title: 'Нажмите для копирования'
                      },
                        judge.key,
                        React.createElement('i', { 'data-lucide': 'copy', className: 'w-3 h-3 opacity-40 hover:opacity-100 transition', width: '12', height: '12' })
                      ),
                      
                      React.createElement('td', { className: 'px-4 py-3' }, judge.displayName || '—'),
                      React.createElement('td', { className: 'px-4 py-3' }, judge.city || '—'),
                      React.createElement('td', { className: 'px-4 py-3 text-[10px]' }, judge.deviceId ? judge.deviceId.substring(0, 12) + '…' : '—'),
                      
                      React.createElement('td', { className: 'px-4 py-3' },
                        React.createElement('div', { className: 'flex items-center gap-3' },
                          React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer', title: 'Отвязать устройство' },
                            React.createElement('input', {
                              type: 'checkbox', className: 'sr-only peer', checked: !!judge.deviceId,
                              onChange: e => handleDeviceToggle(judge.key, judge.deviceId, e.target.checked)
                            }),
                            React.createElement('div', { className: 'w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-black transition' }),
                            React.createElement('div', { className: 'absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4' })
                          ),
                          React.createElement('button', {
                            className: 'text-gray-400 hover:text-red-600 transition p-1',
                            onClick: (e) => { e.stopPropagation(); setConfirmDelete(judge); },
                            title: 'Удалить ключ'
                          },
                            React.createElement('i', { 'data-lucide': 'trash-2', width: '16', height: '16' })
                          )
                        )
                      )
                    ))
            )
          )
        ),

        // Кнопка генерации нового ключа
        React.createElement('div', { className: 'flex justify-end mt-4' },
          React.createElement('button', {
            onClick: handleGenerateKey, disabled: generating,
            className: 'bg-black text-white px-4 py-2 rounded-full text-[10px] font-medium uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2'
          },
            generating
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin' }),
                  'Генерация...'
                )
              : 'Сгенерировать ключ'
          )
        ),

        // ✅ Блок проверки обновлений
        React.createElement('div', { className: 'flex flex-col items-end mt-2 space-y-2' },
          // Кнопка проверки
          React.createElement('button', {
            onClick: checkForUpdates,
            disabled: updateStatus === 'checking',
            className: 'text-black text-[10px] font-medium uppercase tracking-wider hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2'
          },
            updateStatus === 'checking'
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin' }),
                  'Проверка...'
                )
              : 'Проверить обновление'
          ),
          
          // Статус обновления
          updateStatus !== 'idle' && updateStatus !== 'checking' && React.createElement(
            'button', {
              onClick: updateStatus === 'available' ? clearCacheAndReload : undefined,
              className: `text-[10px] font-medium tracking-wider transition ${
                updateStatus === 'available' 
                  ? 'text-green-600 hover:text-green-700 cursor-pointer' 
                  : updateStatus === 'current'
                  ? 'text-gray-400 cursor-default'
                  : 'text-red-500 cursor-default'
              }`
            },
            updateStatus === 'available' && React.createElement('span', { className: 'mr-1' }, '●'),
            updateMessage
          )
        )
      )
    ),

    toastElement,
    confirmModal
  );
}
