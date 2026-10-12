import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme, View } from 'react-native';
import { AppText } from '@/components/ui';
import { Colors } from '@/constants/theme';
import { runMigrations } from '@/data';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const c = Colors[scheme];
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    runMigrations().then(
      () => setReady(true),
      (e: unknown) => setError(e instanceof Error ? e : new Error(String(e))),
    );
  }, []);

  useEffect(() => {
    if (ready || error) SplashScreen.hideAsync();
  }, [ready, error]);

  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  const theme = {
    ...base,
    colors: { ...base.colors, background: c.background, card: c.background, text: c.text, border: c.border, primary: c.accent },
  };

  if (error) {
    return (
      <View style={{ flex: 1, backgroundColor: c.background, justifyContent: 'center', padding: 24, gap: 8 }}>
        <AppText variant="heading">Couldn’t open your recipes</AppText>
        <AppText muted>{error.message}</AppText>
      </View>
    );
  }
  if (!ready) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="recipe/[id]/photos" options={{ presentation: 'fullScreenModal', headerShown: false }} />
        <Stack.Screen name="shopping/generate" options={{ presentation: 'modal', title: 'Shopping list' }} />
      </Stack>
    </ThemeProvider>
  );
}
