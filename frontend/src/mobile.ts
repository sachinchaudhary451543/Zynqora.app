import { Capacitor } from '@capacitor/core';
import { Camera } from '@capacitor/camera';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api/client';

const pendingTokenKey = 'pendingNativePushToken';
const registeredTokenKey = 'registeredNativePushToken';

async function registerPendingPushToken() {
  const token = localStorage.getItem(pendingTokenKey);
  if (!token || localStorage.getItem(registeredTokenKey) === token || !localStorage.getItem('token')) return;

  await api.registerDeviceToken({ token, platform: Capacitor.getPlatform() === 'ios' ? 'ios' : 'android' });
  localStorage.setItem(registeredTokenKey, token);
  localStorage.removeItem(pendingTokenKey);
}

export async function syncNativePushToken() {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await registerPendingPushToken();
  } catch (error) {
    console.warn('Native push token registration failed:', error);
  }
}

export async function removeNativePushToken() {
  const token = localStorage.getItem(registeredTokenKey) || localStorage.getItem(pendingTokenKey);
  if (!token) return;
  try {
    if (localStorage.getItem('token')) await api.removeDeviceToken(token);
  } catch (error) {
    console.warn('Native push token removal failed:', error);
  } finally {
    localStorage.removeItem(pendingTokenKey);
    localStorage.removeItem(registeredTokenKey);
  }
}

export async function initializeMobilePermissions() {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const cameraStatus = await Camera.requestPermissions();
    if (cameraStatus.camera === 'granted' || cameraStatus.photos === 'granted') {
      console.info('Native camera permission granted');
    }
  } catch (error) {
    console.warn('Camera permission request failed:', error);
  }

  try {
    await PushNotifications.addListener('registration', ({ value }) => {
      localStorage.setItem(pendingTokenKey, value);
      void syncNativePushToken();
    });
    await PushNotifications.addListener('registrationError', (error) => {
      console.warn('Native push registration failed:', error);
    });
    const notificationState = await PushNotifications.requestPermissions();
    if (notificationState.receive === 'granted') {
      console.info('Native push notification permission granted');
      await PushNotifications.register();
      await syncNativePushToken();
    }
  } catch (error) {
    console.warn('Notification permission request failed:', error);
  }
}
