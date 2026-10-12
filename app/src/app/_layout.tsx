import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { isTabletDevice } from '../lib/layout';
import { useTheme } from '../theme';

export default function RootLayout() {
  const theme = useTheme();
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  // iPad supports every orientation (and split view); iPhone stays portrait.
  useEffect(() => {
    if (!isTabletDevice) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  // Refetch stale queries when the app comes back to the foreground.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => focusManager.setFocused(state === 'active'));
    return () => sub.remove();
  }, []);

  const navTheme = useMemo(() => {
    const base = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: theme.colors.primary,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerTintColor: theme.colors.primary,
            headerTitleStyle: { color: theme.colors.text },
            headerShadowVisible: false,
            headerBackButtonDisplayMode: 'minimal',
            contentStyle: { backgroundColor: theme.colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
          <Stack.Screen name="crop" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="question/[id]/index" options={{ title: 'Çözüm' }} />
          <Stack.Screen name="question/[id]/chat" options={{ title: 'Anlamadım' }} />
          <Stack.Screen name="review-session" options={{ title: 'Tekrar' }} />
          <Stack.Screen name="topic-picker" options={{ presentation: 'modal', title: 'Konu seç' }} />
          <Stack.Screen name="exam/new" options={{ title: 'Deneme ekle' }} />
          <Stack.Screen name="exam/[id]/index" options={{ title: 'Deneme' }} />
          <Stack.Screen name="exam/[id]/edit" options={{ title: 'Denemeyi düzenle' }} />
        </Stack>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
