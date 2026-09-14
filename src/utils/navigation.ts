import { useRouter } from 'expo-router';

type AppRouter = ReturnType<typeof useRouter>;

/**
 * Safe navigation back helper that prevents crashes or unhandled 'GO_BACK' errors
 * when the screen history stack is empty.
 */
export function safeGoBack(router: AppRouter, fallbackPath: string = '/') {
  try {
    if (router.canGoBack && router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallbackPath as any);
    }
  } catch (error) {
    console.warn('[Navigation] safeGoBack fallback triggered:', error);
    router.replace(fallbackPath as any);
  }
}
