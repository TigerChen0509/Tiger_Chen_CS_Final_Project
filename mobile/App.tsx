import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import { registerForPushNotifications } from './src/utils/notifications';
import { ThemeProvider } from './src/utils/theme';
import { AuthProvider } from './src/utils/authContext';

function AppContent() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await registerForPushNotifications();
      setReady(true);
    })();
  }, []);

  if (!ready) return null;

  return (
    <>
      <StatusBar style="light" />
      <AppNavigator />
    </>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}
