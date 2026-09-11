import '../global.css';
import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';


import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { Colors } from '@/constants/theme';
import { AuthProvider } from '@/context/AuthContext';
import { useSSE } from '@/hooks/useSSE';
import { useSSEQueryBridge } from '@/hooks/useSSEQueryBridge';
import { QueryProvider } from '@/providers/QueryProvider';

// Polyfill for Hermes Symbol.description compatibility
if (typeof Symbol !== 'undefined' && !('description' in Symbol.prototype)) {
  Object.defineProperty(Symbol.prototype, 'description', {
    configurable: true,
    get() {
      const match = /\((.*)\)/.exec(this.toString());
      return match ? match[1] : undefined;
    },
  });
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const scheme = colorScheme === 'dark' ? 'dark' : 'light';
  const colors = Colors[scheme];

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background);
  }, [colors.background]);

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
          <SSEManager />
          <AnimatedSplashOverlay />
          <Stack
            screenOptions={{
              headerShown: false,
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="explore" options={{ headerShown: false }} />
          </Stack>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

function SSEManager() {
  useSSE();
  useSSEQueryBridge();
  return null;
}
