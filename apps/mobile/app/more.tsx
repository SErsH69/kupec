import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';

const LINKS = [
  {
    href: '/gov',
    icon: '🏛️',
    title: 'Гос-цены',
    text: 'Где скупщику (НПС) сдать выгоднее рынка и где у НПС купить дешевле рынка.',
  },
  {
    href: '/rl',
    icon: '🚗',
    title: 'RL авто',
    text: 'Навар на перекупе тачек: купить у государства → продать на рынке.',
  },
] as const;

export default function More() {
  const router = useRouter();
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 12, gap: 10 }}>
      {LINKS.map((l) => (
        <Pressable key={l.href} style={styles.card} onPress={() => router.push(l.href)}>
          <Text style={styles.icon}>{l.icon}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{l.title}</Text>
            <Text style={styles.text}>{l.text}</Text>
          </View>
          <Text style={styles.arrow}>→</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 14,
  },
  icon: { fontSize: 26 },
  title: { color: theme.txt, fontSize: 16, fontWeight: '700' },
  text: { color: theme.muted, fontSize: 12, marginTop: 3, lineHeight: 16 },
  arrow: { color: theme.accent2, fontSize: 18 },
});
