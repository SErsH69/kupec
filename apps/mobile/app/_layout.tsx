import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../lib/auth';
import { MarketProvider } from '../lib/market';
import { JournalProvider } from '../lib/journal';
import { AlertsWatcher } from '../components/AlertsWatcher';
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
        <MarketProvider>
          <JournalProvider>
            <AlertsWatcher />
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
                name="fav"
                options={{ title: 'Избранное', tabBarLabel: 'Избранное', tabBarIcon: tabIcon('🔖') }}
              />
              <Tabs.Screen
                name="flip"
                options={{ title: 'Перекупка', tabBarLabel: 'Перекуп', tabBarIcon: tabIcon('💱') }}
              />
              <Tabs.Screen
                name="workshop"
                options={{ title: 'Мастерская', tabBarLabel: 'Крафт', tabBarIcon: tabIcon('🔧') }}
              />
              <Tabs.Screen
                name="goals"
                options={{ title: 'Цели', tabBarLabel: 'Цели', tabBarIcon: tabIcon('🎯') }}
              />
              <Tabs.Screen
                name="journal"
                options={{ title: 'Журнал сделок', tabBarLabel: 'Журнал', tabBarIcon: tabIcon('📒') }}
              />
              <Tabs.Screen
                name="more"
                options={{ title: 'Ещё', tabBarLabel: 'Ещё', tabBarIcon: tabIcon('🧰') }}
              />
              <Tabs.Screen
                name="account"
                options={{ title: 'Аккаунт', tabBarLabel: 'Аккаунт', tabBarIcon: tabIcon('👤') }}
              />
              {/* Открываются из «Ещё», в таб-баре не показываются. */}
              <Tabs.Screen name="gov" options={{ title: 'Гос-цены', href: null }} />
              <Tabs.Screen name="rl" options={{ title: 'RL авто', href: null }} />
            </Tabs>
          </JournalProvider>
        </MarketProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
