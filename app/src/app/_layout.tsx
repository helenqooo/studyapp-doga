import { Lora_400Regular } from '@expo-google-fonts/lora/400Regular';
import { Lora_500Medium } from '@expo-google-fonts/lora/500Medium';
import { Lora_600SemiBold } from '@expo-google-fonts/lora/600SemiBold';
import { Lora_700Bold } from '@expo-google-fonts/lora/700Bold';
import { Poppins_400Regular } from '@expo-google-fonts/poppins/400Regular';
import { Poppins_500Medium } from '@expo-google-fonts/poppins/500Medium';
import { Poppins_600SemiBold } from '@expo-google-fonts/poppins/600SemiBold';
import { Poppins_700Bold } from '@expo-google-fonts/poppins/700Bold';
import { focusManager, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as ScreenOrientation from 'expo-screen-orientation';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { CelebrationProvider } from '../components/motion/Celebration';
import { TimerPill } from '../components/TimerPill';
import { TimerSupervisor } from '../components/TimerSupervisor';
import { isTabletDevice } from '../lib/layout';
import { useAuthStore } from '../store/authStore';
import { fonts, useTheme } from '../theme';

// Keep the splash up until the fonts are ready, so text never flashes in a system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

const FONT_FILES = {
  [fonts.sans.regular]: Poppins_400Regular,
  [fonts.sans.medium]: Poppins_500Medium,
  [fonts.sans.semibold]: Poppins_600SemiBold,
  [fonts.sans.bold]: Poppins_700Bold,
  [fonts.serif.regular]: Lora_400Regular,
  [fonts.serif.medium]: Lora_500Medium,
  [fonts.serif.semibold]: Lora_600SemiBold,
  [fonts.serif.bold]: Lora_700Bold,
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

  // Another account (or signing out) must never see the previous account's cached data.
  useEffect(() => {
    queryClient.clear();
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
              headerTintColor: theme.colors.primaryText,
              headerTitleStyle: { color: theme.colors.text, fontFamily: theme.fonts.serif.semibold },
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
              <Stack.Screen name="question/[id]/chat" options={{ title: 'Anlamadım' }} />
              <Stack.Screen name="review-session" options={{ title: 'Tekrar' }} />
              <Stack.Screen name="topic-picker" options={{ presentation: 'modal', title: 'Konu seç' }} />
              <Stack.Screen name="exam/new" options={{ title: 'Deneme ekle' }} />
              <Stack.Screen name="exam/[id]/index" options={{ title: 'Deneme' }} />
              <Stack.Screen name="exam/[id]/edit" options={{ title: 'Denemeyi düzenle' }} />
              <Stack.Screen name="timer" options={{ title: 'Sayaç' }} />
              <Stack.Screen name="leaderboard" options={{ title: 'Sıralama' }} />
            </Stack.Protected>
            <Stack.Protected guard={!signedIn}>
              <Stack.Screen name="login" options={{ headerShown: false, animation: 'fade' }} />
            </Stack.Protected>
          </Stack>
          {signedIn ? (
            <>
              <TimerSupervisor />
              <TimerPill />
            </>
          ) : null}
        </CelebrationProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
