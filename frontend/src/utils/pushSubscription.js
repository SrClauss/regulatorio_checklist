import { api } from '../api';

// Converte a chave pública VAPID base64url para Uint8Array exigido pelo navegador
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerPushNotifications() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Este navegador não suporta notificações Push.');
    return false;
  }

  try {
    // 1. Solicita permissão para o usuário
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('Permissão de notificações negada pelo usuário.');
      return false;
    }

    // 2. Aguarda o Service Worker estar pronto
    const registration = await navigator.serviceWorker.ready;

    // 3. Busca a chave pública VAPID no backend
    const { vapid_public_key } = await api.getVapidPublicKey();
    if (!vapid_public_key) {
      console.warn('Chave pública VAPID não configurada no backend.');
      return false;
    }

    // 4. Se inscreve no servidor de Push do navegador
    const convertedKey = urlBase64ToUint8Array(vapid_public_key);
    
    // Verifica se já existe uma inscrição ativa
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    // 5. Envia os dados de inscrição para o backend MongoDB
    await api.subscribePush(subscription.toJSON());
    console.log('Inscrição no Web Push registrada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro ao registrar notificações Push:', error);
    return false;
  }
}
