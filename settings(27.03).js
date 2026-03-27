import { db, messaging, saveFcmToken, removeFcmToken, getJudges, updateJudgeDevice, createJudgeKey, deleteJudgeKey } from '/apb-admin/firebase-init.js';
import { getToken } from 'firebase/messaging';

// Встроенные SVG-иконки (вместо Lucide)
const CloseIcon = ({ size = 24, className = '' }) => (
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 32 32',
    fill: 'currentColor',
    className: className
  },
    React.createElement('path', { d: 'M10.05 23.95a1 1 0 0 0 1.414 0L17 18.414l5.536 5.536a1 1 0 0 0 1.414-1.414L18.414 17l5.536-5.536a1 1 0 0 0-1.414-1.414L17 15.586l-5.536-5.536a1 1 0 0 0-1.414 1.414L15.586 17l-5.536 5.536a1 1 0 0 0 0 1.414' })
  )
);

const CopyIcon = ({ size = 14, className = '' }) => (
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: className
  },
    React.createElement('path', { d: 'M17 3h-6C8.8 3 7 4.8 7 7c-2.2 0-4 1.8-4 4v6c0 2.2 1.8 4 4 4h6c2.2 0 4-1.8 4-4 2.2 0 4-1.8 4-4V7c0-2.2-1.8-4-4-4m-2 14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2v-6c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2zm4-4c0 1.1-.9 2-2 2v-4c0-2.2-1.8-4-4-4H9c0-1.1.9-2 2-2h6c1.1 0 2 .9 2 2z' })
  )
);

const DeleteIcon = ({ size = 16, className = '' }) => (
  React.createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    className: className
  },
    React.createElement('path', { d: 'M19 5.25h-4.25V5c0-1.517-1.233-2.75-2.75-2.75S9.25 3.483 9.25 5v.25H5a.75.75 0 0 0 0 1.5h.25V19A2.75 2.75 0 0 0 8 21.75h8A2.75 2.75 0 0 0 18.75 19V6.75H19a.75.75 0 0 0 0-1.5M10.75 5c0-.689.561-1.25 1.25-1.25s1.25.561 1.25 1.25v.25h-2.5zm6.5 14c0 .689-.561 1.25-1.25 1.25H8c-.689 0-1.25-.561-1.25-1.25V6.75h10.5zm-4-3v-5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0m-4 0v-5a.75.75 0 0 1 1.5 0v5a.75.75 0 0 1-1.5 0' })
  )
);

export function Settings({ show, onClose, adminDeviceId }) {
  const [pushEnabled, setPushEnabled] = React.useState(() => {
    const saved = localStorage.getItem('pushEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [judges, setJudges] = React.useState([]);
  const [loadingJudges, setLoadingJudges] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [toast, setToast] = React.useState(null);
  const [confirmDelete, setConfirmDelete] = React.useState(null);

  React.useEffect(() => {
    if (show) {
      loadJudges();
    }
  }, [show]);

  const loadJudges = async () => {
    setLoadingJudges(true);
    try {
      const judgesList = await getJudges();
      setJudges(judgesList);
    } catch (err) {
      console.error('Ошибка загрузки ключей:', err);
      showToast('Ошибка загрузки ключей', 'error');
    } finally {
      setLoadingJudges(false);
    }
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2000);
  };

  const handleDeviceToggle = async (judgeKey, currentDeviceId, checked) => {
    if (!checked) {
      try {
        await updateJudgeDevice(judgeKey, null);
        setJudges(prev => prev.map(j => 
          j.key === judgeKey ? { ...j, deviceId: null } : j
        ));
        showToast('Устройство отвязано');
      } catch (err) {
        console.error('Ошибка отвязки устройства:', err);
        showToast('Ошибка отвязки', 'error');
      }
    } else {
      showToast('Для привязки войдите с этим ключом', 'info');
    }
  };

  const handleGenerateKey = async () => {
    setGenerating(true);
    try {
      const newKey = await createJudgeKey();
      await loadJudges();
      showToast(`Ключ ${newKey} создан`);
    } catch (err) {
      console.error('Ошибка создания ключа:', err);
      showToast('Ошибка создания ключа', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopyKey = (key) => {
    navigator.clipboard.writeText(key).then(() => {
      showToast('Ключ скопирован');
    }).catch(err => {
      console.error('Ошибка копирования:', err);
      showToast('Ошибка копирования', 'error');
    });
  };

  const handleDeleteKey = async (judgeKey) => {
    try {
      await deleteJudgeKey(judgeKey);
      setJudges(prev => prev.filter(j => j.key !== judgeKey));
      showToast('Ключ удалён');
    } catch (err) {
      console.error('Ошибка удаления ключа:', err);
      showToast('Ошибка удаления', 'error');
    }
  };

  React.useEffect(() => {
    if (!adminDeviceId) return;

    const handlePushToggle = async () => {
      if (pushEnabled) {
        try {
          const registration = await navigator.serviceWorker.ready;
          if (Notification.permission !== 'granted') {
            await Notification.requestPermission();
          }
          if (Notification.permission === 'granted') {
            const vapidKey = 'BHZoy1QJ4PkloCIRFeKQ2UwYr44eziDY8C8wXqL4bSG6mbRGxQ03-v6vGJCmITc3jPWKfcq3Au3gVT860yIwNLg';
            const token = await getToken(messaging, {
              vapidKey,
              serviceWorkerRegistration: registration
            });
            if (token) {
              await saveFcmToken(adminDeviceId, token, navigator.userAgent);
              showToast('Push-уведомления включены');
            }
          }
        } catch (err) {
          console.error('Error enabling push:', err);
          showToast('Ошибка включения push', 'error');
        }
      } else {
        try {
          await removeFcmToken(adminDeviceId);
          showToast('Push-уведомления отключены');
        } catch (err) {
          console.error('Error disabling push:', err);
          showToast('Ошибка отключения push', 'error');
        }
      }
    };

    handlePushToggle();
  }, [pushEnabled, adminDeviceId]);

  if (!show) return null;

  // Кастомное модальное окно подтверждения удаления
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
        `Вы действительно хотите удалить ключ "${confirmDelete.displayName || confirmDelete.key}"?`
      ),
      React.createElement('div', { className: 'flex gap-3 justify-end' },
        React.createElement('button', {
          className: 'px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition',
          onClick: () => setConfirmDelete(null)
        }, 'Отмена'),
        React.createElement('button', {
          className: 'px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition',
          onClick: () => {
            handleDeleteKey(confirmDelete.key);
            setConfirmDelete(null);
          }
        }, 'Удалить')
      )
    )
  ) : null;

  // Toast-уведомление по центру экрана
  const toastElement = toast ? React.createElement(
    'div',
    { className: 'fixed inset-0 z-[300] flex items-center justify-center pointer-events-none' },
    React.createElement('div', {
      className: 'px-6 py-3 rounded-full shadow-2xl text-[11px] font-medium uppercase tracking-wider bg-black text-white'
    }, toast.message)
  ) : null;

  return React.createElement(
    'div',
    {
      className: 'fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80',
      onClick: onClose
    },
    React.createElement(
      'div',
      {
        className: 'bg-white w-full max-w-4xl rounded-[32px] p-8 shadow-2xl space-y-6 border border-gray-100 max-h-[90vh] overflow-y-auto',
        onClick: (e) => e.stopPropagation()
      },
      // Заголовок
      React.createElement(
        'div',
        { className: 'flex justify-between items-center sticky top-0 bg-white pb-4 border-b border-gray-100' },
        React.createElement('h2', { className: 'text-xl font-light tracking-tight' }, 'Настройки'),
        React.createElement(
          'button',
          { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 transition' },
          React.createElement(CloseIcon, { size: 24 })
        )
      ),
      
      // Блок push-уведомлений
      React.createElement(
        'div',
        { className: 'space-y-6' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between' },
          React.createElement('span', { className: 'text-[13px] font-medium uppercase tracking-widest' }, 'Push-уведомления'),
          React.createElement(
            'label',
            { className: 'relative inline-flex items-center cursor-pointer' },
            React.createElement('input', {
              type: 'checkbox',
              className: 'sr-only peer',
              checked: pushEnabled,
              onChange: (e) => {
                const newValue = e.target.checked;
                setPushEnabled(newValue);
                localStorage.setItem('pushEnabled', newValue);
              }
            }),
            React.createElement('div', { className: 'w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition' }),
            React.createElement('div', { className: 'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5' })
          )
        ),
        React.createElement(
          'p',
          { className: 'text-[10px] text-gray-400 uppercase tracking-wider' },
          'Включите, чтобы получать уведомления о новых оценках даже когда приложение закрыто.'
        )
      ),

      React.createElement('hr', { className: 'border-gray-100' }),

      // Блок управления ключами
      React.createElement(
        'div',
        { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-[11px] font-medium uppercase tracking-widest text-gray-500' }, 'Управление ключами судей'),
        
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          loadingJudges
            ? React.createElement(
                'div',
                { className: 'flex justify-center items-center py-8' },
                React.createElement('div', { className: 'w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin' })
              )
            : React.createElement(
                'table',
                { className: 'min-w-full text-[11px]' },
                React.createElement(
                  'thead',
                  { className: 'bg-gray-50 border-b border-gray-100' },
                  React.createElement(
                    'tr',
                    null,
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Ключ'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Имя'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Город'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'ID устройства'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Отвязать'),
                    React.createElement('th', { className: 'px-4 py-2 text-center font-medium text-gray-500' }, 'Действия')
                  )
                ),
                React.createElement(
                  'tbody',
                  { className: 'divide-y divide-gray-50' },
                  judges.length === 0
                    ? React.createElement(
                        'tr',
                        null,
                        React.createElement('td', { colSpan: 6, className: 'px-4 py-4 text-center text-gray-400' }, 'Нет ключей')
                      )
                    : judges.map((judge) =>
                        React.createElement(
                          'tr',
                          { key: judge.key, className: 'hover:bg-gray-50' },
                          React.createElement('td', { className: 'px-4 py-3 font-mono text-[10px]' }, 
                            React.createElement(
                              'div',
                              { className: 'flex items-center gap-1' },
                              React.createElement('span', { className: 'truncate max-w-[100px]' }, judge.key),
                              React.createElement(
                                'button',
                                {
                                  onClick: () => handleCopyKey(judge.key),
                                  className: 'text-gray-400 hover:text-black transition',
                                  title: 'Копировать ключ'
                                },
                                React.createElement(CopyIcon, { size: 14 })
                              )
                            )
                          ),
                          React.createElement('td', { className: 'px-4 py-3' }, judge.displayName || '—'),
                          React.createElement('td', { className: 'px-4 py-3' }, judge.city || '—'),
                          React.createElement('td', { className: 'px-4 py-3 text-[10px]' }, judge.deviceId ? judge.deviceId.substring(0, 12) + '…' : '—'),
                          React.createElement(
                            'td',
                            { className: 'px-4 py-3' },
                            React.createElement(
                              'label',
                              { className: 'relative inline-flex items-center cursor-pointer' },
                              React.createElement('input', {
                                type: 'checkbox',
                                className: 'sr-only peer',
                                checked: !!judge.deviceId,
                                onChange: (e) => handleDeviceToggle(judge.key, judge.deviceId, e.target.checked)
                              }),
                              React.createElement('div', { className: 'w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition' }),
                              React.createElement('div', { className: 'absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5' })
                            )
                          ),
                          React.createElement(
                            'td',
                            { className: 'px-4 py-3 text-center' },
                            React.createElement(
                              'button',
                              {
                                onClick: () => setConfirmDelete(judge),
                                className: 'text-gray-400 hover:text-red-600 transition inline-flex items-center justify-center',
                                title: 'Удалить ключ'
                              },
                              React.createElement(DeleteIcon, { size: 16 })
                            )
                          )
                        )
                      )
                )
              )
        ),

        React.createElement(
          'div',
          { className: 'flex justify-end mt-4' },
          React.createElement(
            'button',
            {
              onClick: handleGenerateKey,
              disabled: generating,
              className: 'bg-black text-white px-4 py-2 rounded-full text-[10px] font-medium uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed'
            },
            generating ? 'Генерация...' : 'Сгенерировать ключ'
          )
        )
      )
    ),

    // Toast-уведомление (центрированное)
    toastElement,

    // Кастомное модальное окно подтверждения удаления
    confirmModal
  );
}
