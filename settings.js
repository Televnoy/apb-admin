import { db, messaging, saveFcmToken, removeFcmToken } from '/apb-admin/firebase-init.js';
import { getToken } from 'firebase/messaging';

// Компонент настроек (React)
export function Settings({ show, onClose, adminDeviceId }) {
  const [pushEnabled, setPushEnabled] = React.useState(() => {
    const saved = localStorage.getItem('pushEnabled');
    return saved === null ? true : saved === 'true';
  });

  // Управление токеном при изменении переключателя
  React.useEffect(() => {
    if (!adminDeviceId) return;

    const handleToggle = async () => {
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
              console.log('Push enabled, token saved');
            }
          }
        } catch (err) {
          console.error('Error enabling push:', err);
        }
      } else {
        try {
          await removeFcmToken(adminDeviceId);
          console.log('Push disabled, token removed');
        } catch (err) {
          console.error('Error disabling push:', err);
        }
      }
    };

    handleToggle();
  }, [pushEnabled, adminDeviceId]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-[32px] p-8 shadow-2xl space-y-6 border border-gray-100" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-light tracking-tight">Настройки</h2>
          <button onClick={onClose} className="text-gray-400">
            <i data-lucide="x" width="24" height="24"></i>
          </button>
        </div>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium uppercase tracking-widest">Push-уведомления</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={pushEnabled}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setPushEnabled(newValue);
                  localStorage.setItem('pushEnabled', newValue);
                }}
              />
              <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-black transition"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5"></div>
            </label>
          </div>
          <p className="text-[10px] text-gray-400 uppercase tracking-wider">
            Включите, чтобы получать уведомления о новых оценках даже когда приложение закрыто.
          </p>
        </div>
      </div>
    </div>
  );
}