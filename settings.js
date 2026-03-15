import { db, messaging, saveFcmToken, removeFcmToken, getJudges, updateJudgeDevice, createJudgeKey, deleteJudgeKey } from '/apb-admin/firebase-init.js';
import { getToken } from 'firebase/messaging';

export function Settings({ show, onClose, adminDeviceId }) {
  const [pushEnabled, setPushEnabled] = React.useState(() => {
    const saved = localStorage.getItem('pushEnabled');
    return saved === null ? true : saved === 'true';
  });

  const [judges, setJudges] = React.useState([]);
  const [loadingJudges, setLoadingJudges] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [copyingKey, setCopyingKey] = React.useState(null);
  const [deletingKey, setDeletingKey] = React.useState(null);
  const [toast, setToast] = React.useState(null);

  React.useEffect(() => {
    if (show) loadJudges();
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

  const showToast = React.useCallback((message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 2500);
  }, []);

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

  const handleCopyKey = React.useCallback(async (key) => {
    setCopyingKey(key);
    try {
      await navigator.clipboard.writeText(key);
      showToast('Ключ скопирован');
    } catch (err) {
      console.error('Ошибка копирования:', err);
      showToast('Ошибка копирования', 'error');
    } finally {
      setTimeout(() => setCopyingKey(null), 200);
    }
  }, [showToast]);

  const handleDeleteKey = React.useCallback(async (judgeKey) => {
    if (window.confirm(`Вы уверены, что хотите удалить ключ ${judgeKey}? Это действие нельзя отменить.`)) {
      setDeletingKey(judgeKey);
      try {
        await deleteJudgeKey(judgeKey);
        setJudges(prev => prev.filter(j => j.key !== judgeKey));
        showToast('Ключ удалён');
      } catch (err) {
        console.error('Ошибка удаления ключа:', err);
        showToast('Ошибка удаления', 'error');
      } finally {
        setTimeout(() => setDeletingKey(null), 200);
      }
    }
  }, [showToast]);

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
            const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
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
  }, [pushEnabled, adminDeviceId, showToast]);

  if (!show) return null;

  // Вспомогательные компоненты
  const ToggleSwitch = ({ checked, onChange, disabled }) => 
    React.createElement('label', { className: 'relative inline-flex items-center cursor-pointer' },
      React.createElement('input', {
        type: 'checkbox',
        className: 'sr-only peer',
        checked,
        onChange,
        disabled
      }),
      React.createElement('div', { className: `w-11 h-6 rounded-full peer peer-checked:bg-black transition ${disabled ? 'bg-gray-100' : 'bg-gray-200'}` }),
      React.createElement('div', { className: `absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5 ${disabled ? 'opacity-50' : ''}` })
    );

  const CopyButton = ({ key, isCopying, onCopy }) =>
    React.createElement(
      'button',
      {
        onClick: () => !isCopying && onCopy(key),
        className: `transition-colors ${isCopying ? 'text-gray-300 cursor-wait' : 'text-gray-400 hover:text-black'}`,
        title: isCopying ? 'Копирование...' : 'Копировать ключ',
        disabled: isCopying
      },
      isCopying 
        ? React.createElement('div', { className: 'w-3.5 h-3.5 border-2 border-gray-300 border-t-black rounded-full animate-spin' })
        : React.createElement('i', { 'data-lucide': 'copy', width: '14', height: '14' })
    );

  const DeleteButton = ({ key, isDeleting, onDelete }) =>
    React.createElement(
      'button',
      {
        onClick: () => !isDeleting && onDelete(key),
        className: `transition-colors ${isDeleting ? 'text-red-200 cursor-wait' : 'text-red-400 hover:text-red-600'}`,
        title: isDeleting ? 'Удаление...' : 'Удалить ключ',
        disabled: isDeleting
      },
      isDeleting
        ? React.createElement('div', { className: 'w-4 h-4 border-2 border-red-200 border-t-red-600 rounded-full animate-spin' })
        : React.createElement('i', { 'data-lucide': 'trash-2', width: '16', height: '16' })
    );

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
        { className: 'flex justify-between items-center sticky top-0 bg-white pb-4 border-b border-gray-100 z-10' },
        React.createElement('h2', { className: 'text-xl font-light tracking-tight' }, 'Настройки'),
        React.createElement(
          'button',
          { onClick: onClose, className: 'text-gray-400 hover:text-gray-600 transition-colors' },
          React.createElement('i', { 'data-lucide': 'x', width: '24', height: '24' })
        )
      ),
      
      // Push-уведомления
      React.createElement(
        'div',
        { className: 'space-y-4' },
        React.createElement(
          'div',
          { className: 'flex items-center justify-between' },
          React.createElement('span', { className: 'text-[13px] font-medium uppercase tracking-widest' }, 'Push-уведомления'),
          React.createElement(ToggleSwitch, {
            checked: pushEnabled,
            onChange: (e) => {
              const newValue = e.target.checked;
              setPushEnabled(newValue);
              localStorage.setItem('pushEnabled', newValue);
            }
          })
        ),
        React.createElement(
          'p',
          { className: 'text-[10px] text-gray-400 uppercase tracking-wider' },
          'Включите, чтобы получать уведомления о новых оценках даже когда приложение закрыто.'
        )
      ),

      React.createElement('hr', { className: 'border-gray-100' }),

      // Управление ключами
      React.createElement(
        'div',
        { className: 'space-y-4' },
        React.createElement('h3', { className: 'text-[11px] font-medium uppercase tracking-widest text-gray-500' }, 'Управление ключами судей'),
        
        React.createElement(
          'div',
          { className: 'overflow-x-auto' },
          loadingJudges
            ? React.createElement('div', { className: 'flex justify-center items-center py-8' },
                React.createElement('div', { className: 'w-8 h-8 border-4 border-gray-200 border-t-black rounded-full animate-spin' })
              )
            : React.createElement(
                'table',
                { className: 'min-w-full text-[11px]' },
                React.createElement(
                  'thead',
                  { className: 'bg-gray-50 border-b border-gray-100' },
                  React.createElement('tr', null,
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Ключ'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Имя'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Город'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'ID устройства'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Отвязать'),
                    React.createElement('th', { className: 'px-4 py-2 text-left font-medium text-gray-500' }, 'Действия')
                  )
                ),
                React.createElement(
                  'tbody',
                  { className: 'divide-y divide-gray-50' },
                  judges.length === 0
                    ? React.createElement('tr', null,
                        React.createElement('td', { colSpan: 6, className: 'px-4 py-4 text-center text-gray-400' }, 'Нет ключей')
                      )
                    : judges.map((judge) => {
                        const isCopyingCurrent = copyingKey === judge.key;
                        const isDeletingCurrent = deletingKey === judge.key;
                        
                        return React.createElement(
                          'tr',
                          { 
                            key: judge.key, 
                            className: `hover:bg-gray-50 transition-colors ${isDeletingCurrent ? 'opacity-60' : ''}` 
                          },
                          
                          // Ключ + копирование
                          React.createElement('td', { className: 'px-4 py-3 font-mono text-[10px]' }, 
                            React.createElement('div', { className: 'flex items-center gap-1' },
                              React.createElement('span', { className: 'truncate max-w-[100px]' }, judge.key),
                              React.createElement(CopyButton, {
                                key: judge.key,
                                isCopying: isCopyingCurrent,
                                onCopy: handleCopyKey
                              })
                            )
                          ),
                          
                          React.createElement('td', { className: 'px-4 py-3' }, judge.displayName || '—'),
                          React.createElement('td', { className: 'px-4 py-3' }, judge.city || '—'),
                          React.createElement('td', { className: 'px-4 py-3 text-[10px] text-gray-500' }, 
                            judge.deviceId ? judge.deviceId.substring(0, 12) + '…' : '—'
                          ),
                          
                          // Переключатель устройства
                          React.createElement('td', { className: 'px-4 py-3' },
                            React.createElement(ToggleSwitch, {
                              checked: !!judge.deviceId,
                              disabled: isDeletingCurrent,
                              onChange: (e) => handleDeviceToggle(judge.key, judge.deviceId, e.target.checked)
                            })
                          ),
                          
                          // Удаление
                          React.createElement('td', { className: 'px-4 py-3' },
                            React.createElement(DeleteButton, {
                              key: `del-${judge.key}`,
                              isDeleting: isDeletingCurrent,
                              onDelete: handleDeleteKey
                            })
                          )
                        );
                      })
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
              disabled: generating || loadingJudges,
              className: 'bg-black text-white px-4 py-2 rounded-full text-[10px] font-medium uppercase tracking-wider hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2'
            },
            generating 
              ? React.createElement(React.Fragment, null,
                  React.createElement('div', { className: 'w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin' }),
                  'Генерация...'
                )
              : 'Сгенерировать ключ'
          )
        )
      ),

      // Toast-уведомление (только Tailwind)
      toast && React.createElement(
        'div',
        {
          className: `fixed top-20 left-1/2 transform -translate-x-1/2 z-[250] px-6 py-3 rounded-full shadow-2xl text-[11px] font-medium uppercase tracking-wider transition-all duration-200 ${
            toast.type === 'error' ? 'bg-red-600' : toast.type === 'info' ? 'bg-blue-600' : 'bg-black'
          } text-white`
        },
        toast.message
      )
    )
  );
}
