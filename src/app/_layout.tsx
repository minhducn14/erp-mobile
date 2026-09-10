import { DarkTheme, DefaultTheme, ThemeProvider, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
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

  return (
    <QueryProvider>
      <AuthProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
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
