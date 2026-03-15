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
  React.useEffect(() => { injectCriticalStyles(); }, []);

  const [pushEnabled, setPushEnabled] = React.useState(() => {
    const saved = localStorage.getItem('pushEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [judges, setJudges] = React.useState([]);
  const [loadingJudges, setLoadingJudges] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [toast, setToast] = React.useState({ show: false, message: '' });
  const [confirmDelete, setConfirmDelete] = React.useState(null); // Для подтверждения удаления

  // Копирование
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

  // Загрузка с кэшированием
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

  React.useEffect(() => { if (show) loadJudges(); }, [show]);

  React.useEffect(() => {
    if (show && window.lucide) setTimeout(() => lucide.createIcons(), 50);
  }, [show, judges, loadingJudges]);

  // Отвязка устройства
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

  // ✅ Удаление ключа (с подтверждением)
  const handleDeleteKey = async (judgeKey, judgeName) => {
    if (!confirm(`Удалить ключ "${judgeName || judgeKey}"?\nЭто действие нельзя отменить.`)) {
      return;
    }
    try {
      // Если в firebase-init.js есть функция deleteJudgeKey:
      if (typeof deleteJudgeKey === 'function') {
        await deleteJudgeKey(judgeKey);
      } else {
        // Fallback: если функции нет, удаляем через Firestore напрямую
        import('firebase/firestore').then(({ doc, deleteDoc }) => {
          deleteDoc(doc(db, 'judges', judgeKey));
        });
      }
      setJudges(prev => prev.filter(j => j.key !== judgeKey));
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

  React.useEffect(() => {
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

  // ✅ Тост — рендерим инлайн (без отдельного компонента, чтобы не было warning про key)
  const toastElement = toast.show ? React.createElement(
    'div',
    { className: 'fixed inset-0 z-[300] flex items-center justify-center pointer-events-none' },
    React.createElement('div', {
      className: 'bg-black/90 text-white px-8 py-4 rounded-2xl text-sm font-medium animate-fade-in shadow-2xl backdrop-blur-sm'
    }, toast.message)
  ) : null;

  // ✅ Модальное окно подтверждения удаления — инлайн
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
          onClick: () => handleDeleteKey(confirmDelete.key, confirmDelete.name)
        }, 'Удалить')
      )
    )
  ) : null;

  // ✅ Скелетон — инлайн
  const renderSkeletonRow = () => React.createElement(
    'tr', { className: 'animate-pulse' },
    ...Array.from({ length: 5 }).map((_, i) =>
      React.createElement('td', { key: i, className: 'px-4 py-3' },
        React.createElement('div', { className: 'h-3 bg-gray-100 rounded w-full' })
      )
    )
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

      // Push
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

      // Таблица
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
                ? Array.from({ length: 3 }).map((_, i) => renderSkeletonRow())
                : judges.length === 0
                  ? React.createElement('tr', null,
                      React.createElement('td', { colSpan: 6, className: 'px-4 py-8 text-center text-gray-400' }, 'Нет ключей')
                    )
                  : judges.map((judge) => React.createElement(
                      'tr', { key: judge.key, className: 'hover:bg-gray-50 transition' },
                      
                      // Ключ
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
                      
                      // ✅ Действия: отвязка + удаление
                      React.createElement('td', { className: 'px-4 py-3' },
                        React.createElement('div', { className: 'flex items-center gap-3' },
                          // Отвязка
                          React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer', title: 'Отвязать устройство' },
                            React.createElement('input', {
                              type: 'checkbox', className: 'sr-only peer', checked: !!judge.deviceId,
                              onChange: e => handleDeviceToggle(judge.key, judge.deviceId, e.target.checked)
                            }),
                            React.createElement('div', { className: 'w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-black transition' }),
                            React.createElement('div', { className: 'absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-4' })
                          ),
                          // ✅ Удаление (иконка корзины)
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

        // Кнопка генерации
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
        )
      )
    ),
    
    // Тост
    toastElement,
    // Модальное окно подтверждения
    confirmModal
  );
}
