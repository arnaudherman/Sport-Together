import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { RepositoriesProvider } from '@/core/di/repositories-context';

export default function RootLayout() {
  return (
    <RepositoriesProvider>
      <SafeAreaProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </RepositoriesProvider>
  );
}
