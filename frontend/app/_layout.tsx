import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts, DMSans_400Regular, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { AppProvider, useApp } from '../src/store';
import { theme } from '../src/theme';
import { Toast } from '../src/ui';
import { ConfirmProvider } from '../src/confirmModal';

function Gate({ children }) {
  const { user, authReady, workspaceId, toast } = useApp();
  const segments = useSegments();
  const router = useRouter();

  React.useEffect(() => {
    if (!authReady) return;
    const inAuth = segments[0] === 'login';
    const inWorkspaceSelect = segments[0] === 'workspace-select';
    if (!user && !inAuth) {
      router.replace('/login');
    } else if (user && !workspaceId && !inWorkspaceSelect) {
      router.replace('/workspace-select');
    } else if (user && workspaceId && (inAuth || inWorkspaceSelect)) {
      router.replace('/(tabs)/overview');
    }
  }, [user, authReady, workspaceId, segments, router]);

  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color={theme.primary} size="large" />
      </View>
    );
  }
  return (
    <>
      {children}
      <Toast toast={toast} />
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    DMSans_400Regular,
    DMSans_700Bold,
    DMSerifDisplay_400Regular,
  });
  if (!loaded) return <View style={{ flex: 1, backgroundColor: theme.bg }} />;
  return (
    <SafeAreaProvider>
      <AppProvider>
        <ConfirmProvider>
          <Gate>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: theme.bg } }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="login" />
              <Stack.Screen name="workspace-select" />
              <Stack.Screen name="(tabs)" />
            </Stack>
          </Gate>
        </ConfirmProvider>
      </AppProvider>
    </SafeAreaProvider>
  );
}
