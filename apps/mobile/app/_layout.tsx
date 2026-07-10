import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { JournalProvider } from '../lib/journal';
import { theme } from '../lib/theme';

function tabIcon(emoji: string) {
  return ({ color, size }: { color: string; size: number }) => (
    <Text style={{ color, fontSize: size * 0.9 }}>{emoji}</Text>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <JournalProvider>
          <StatusBar style="light" />
          <Tabs
            screenOptions={{
              headerStyle: { backgroundColor: theme.surface },
              headerTintColor: theme.txt,
              tabBarStyle: { backgroundColor: theme.surface, borderTopColor: theme.line },
              tabBarActiveTintColor: theme.accent,
              tabBarInactiveTintColor: theme.muted,
              sceneStyle: { backgroundColor: theme.bg },
            }}
          >
            <Tabs.Screen
              name="index"
              options={{ title: 'Топ выгодных', tabBarLabel: 'Топ', tabBarIcon: tabIcon('⭐') }}
            />
            <Tabs.Screen
              name="journal"
              options={{ title: 'Журнал сделок', tabBarLabel: 'Журнал', tabBarIcon: tabIcon('📒') }}
            />
            <Tabs.Screen
              name="account"
              options={{ title: 'Аккаунт', tabBarLabel: 'Аккаунт', tabBarIcon: tabIcon('👤') }}
            />
          </Tabs>
        </JournalProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
