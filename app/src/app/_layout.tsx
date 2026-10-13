import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { CompanionHost } from '../components/companion/CompanionHost';
import { CelebrationProvider } from '../components/motion/Celebration';
import { TimerPill } from '../components/TimerPill';
import { TimerSupervisor } from '../components/TimerSupervisor';
import { isTabletDevice } from '../lib/layout';
import { useAuthStore } from '../store/authStore';
import { usePrefsStore } from '../store/prefsStore';
import { fonts, useTheme } from '../theme';

// Keep the splash up until the fonts are ready, so text never flashes in a system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Vendored OFL fonts (assets/fonts), one family name per weight as in theme.fonts. The
// display keys load one weight heavier than their names (condensed figures read light).
const FONT_FILES = {
  [fonts.sans.regular]: require('../../assets/fonts/BeVietnamPro-Regular.ttf'),
  [fonts.sans.medium]: require('../../assets/fonts/BeVietnamPro-Medium.ttf'),
  [fonts.sans.semibold]: require('../../assets/fonts/BeVietnamPro-SemiBold.ttf'),
  [fonts.sans.bold]: require('../../assets/fonts/BeVietnamPro-Bold.ttf'),
  [fonts.display.regular]: require('../../assets/fonts/BarlowCondensed-Medium.ttf'),
  [fonts.display.medium]: require('../../assets/fonts/BarlowCondensed-SemiBold.ttf'),
  [fonts.display.semibold]: require('../../assets/fonts/BarlowCondensed-Bold.ttf'),
  [fonts.display.bold]: require('../../assets/fonts/BarlowCondensed-ExtraBold.ttf'),
};

// The single-file web preview ships these fonts as inline CSS (see scripts/build-web-preview.mjs).
const fontsInlined =
  Platform.OS === 'web' && (globalThis as { __DERECE_INLINE_FONTS__?: boolean }).__DERECE_INLINE_FONTS__ === true;

export default function RootLayout() {
  const theme = useTheme();
  const [fontsLoaded, fontError] = useFonts(fontsInlined ? {} : FONT_FILES);
  const authStatus = useAuthStore((s) => s.status);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const ready = (fontsInlined || fontsLoaded || !!fontError) && authStatus !== 'loading';
  const signedIn = authStatus === 'signedIn';
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { retry: 1, staleTime: 30_000 } } }),
  );

  useEffect(() => {
    useAuthStore.getState().hydrate();
  }, []);

  // Another account (or signing out) must never see the previous account's cached data
  // or preferences.
  useEffect(() => {
    queryClient.clear();
    usePrefsStore.getState().loadFor(userId);
  }, [userId, queryClient]);

  // iPad supports every orientation (and split view); iPhone stays portrait.
  useEffect(() => {
    if (Platform.OS !== 'web' && !isTabletDevice) ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => {});
  }, []);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

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
        primary: theme.colors.primaryText,
        background: theme.colors.background,
        card: theme.colors.background,
        text: theme.colors.text,
        border: theme.colors.border,
      },
    };
  }, [theme]);

  if (!ready) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={navTheme}>
        <StatusBar style="auto" />
        <CelebrationProvider>
          <Stack
            screenOptions={{
              // The header sits on the paper: same color, no shadow, a graphite (or lamp) back chevron.
              headerTintColor: theme.colors.primaryText,
              headerTitleStyle: { color: theme.colors.text, fontFamily: theme.fonts.sans.semibold, fontSize: theme.fontSize.lg },
              headerStyle: { backgroundColor: theme.colors.background },
              headerShadowVisible: false,
              headerBackButtonDisplayMode: 'minimal',
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Protected guard={signedIn}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="camera" options={{ presentation: 'fullScreenModal', headerShown: false, animation: 'fade' }} />
              <Stack.Screen name="crop" options={{ presentation: 'fullScreenModal', headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="question/[id]/index" options={{ title: 'Çözüm' }} />
              <Stack.Screen name="question/[id]/chat" options={{ title: 'Soru sohbeti' }} />
              <Stack.Screen name="review-session" options={{ title: 'Tekrar' }} />
              <Stack.Screen name="topic-picker" options={{ presentation: 'modal', title: 'Konu seç' }} />
              <Stack.Screen name="exam/new" options={{ title: 'Deneme ekle' }} />
              <Stack.Screen name="exam/[id]/index" options={{ title: 'Deneme' }} />
              <Stack.Screen name="exam/[id]/edit" options={{ title: 'Denemeyi düzenle' }} />
              <Stack.Screen name="timer" options={{ title: 'Sayaç' }} />
              <Stack.Screen name="leaderboard" options={{ title: 'Sıralama' }} />
              <Stack.Screen name="assistant" options={{ title: 'Lumi' }} />
              <Stack.Screen name="dev-kit" options={{ title: 'Dev kit' }} />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Protected>
          </Stack>
          {signedIn ? (
            <>
              <TimerSupervisor />
              <TimerPill />
              <CompanionHost />
            </>
          ) : null}
        </CelebrationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
