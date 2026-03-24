import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { HabitProvider } from '@/context/HabitContext';

export {
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <HabitProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="create-habit" options={{ presentation: 'modal', title: 'Create Habit' }} />
          <Stack.Screen name="edit-habit" options={{ presentation: 'modal', title: 'Edit Habit' }} />
          <Stack.Screen name="archived-habits" options={{ presentation: 'modal', title: 'Archived Habits' }} />
        </Stack>
      </ThemeProvider>
    </HabitProvider>
  );
}
