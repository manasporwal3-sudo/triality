
'use client';

import { useEffect, useState } from 'react';
import { useFirebase, useUser } from '@/firebase';
import { getToken, onMessage, Messaging } from 'firebase/messaging';
import { doc, updateDoc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function PushNotificationManager() {
  const { messaging: messagingPromise, firestore } = useFirebase();
  const { user } = useUser();
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    if (typeof window === 'undefined' || !user || !messagingPromise) return;

    const setupMessaging = async () => {
      try {
        const messaging = await messagingPromise;
        if (!messaging) return;

        // 1. Request Permission
        const status = await Notification.requestPermission();
        setPermission(status);

        if (status === 'granted') {
          // 2. Get FCM Token
          // NOTE: You usually need a VAPID key from Firebase Console -> Project Settings -> Cloud Messaging
          // If you don't have one, this might fail or use a default.
          const token = await getToken(messaging, {
            serviceWorkerRegistration: await navigator.serviceWorker.register('/firebase-messaging-sw.js')
          });

          if (token) {
            console.log('FCM Token generated:', token);
            // 3. Save token to Firestore
            const userRef = doc(firestore, 'users', user.uid);
            await updateDoc(userRef, { fcmToken: token });
          }
        }

        // 4. Handle Foreground Messages
        onMessage(messaging, (payload) => {
          console.log('Foreground message received:', payload);
          toast.success(`${payload.notification?.title}: ${payload.notification?.body}`, {
            duration: 5000,
            icon: '🔔'
          });
          
          // Optionally play sound
          const audio = new Audio('/sounds/ding.mp3');
          audio.play().catch(() => {});
        });

      } catch (error) {
        console.error('Push Notification Setup Error:', error);
      }
    };

    setupMessaging();
  }, [user, messagingPromise, firestore]);

  return null; // This is a utility component
}
