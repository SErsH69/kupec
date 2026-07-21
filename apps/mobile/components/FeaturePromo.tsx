import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { theme } from '../lib/theme';

interface Step {
  n: number;
  title: string;
  text: string;
}

/**
 * Экран-объяснялка для личных вкладок у неавторизованных (мобилка).
 * Наклонённое мок-превью + шаги + кнопка «в Аккаунт» для входа.
 */
export function FeaturePromo({
  icon,
  title,
  subtitle,
  steps,
  mock,
}: {
  icon: string;
  title: string;
  subtitle: string;
  steps: Step[];
  mock: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {icon} Личная функция · бесплатно в бете
        </Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>

      <View style={styles.mockWrap}>{mock}</View>

      <View style={{ gap: 12, marginTop: 8 }}>
        {steps.map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.stepNum}>
              <Text style={styles.stepNumText}>{s.n}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>

      <Pressable style={styles.cta} onPress={() => router.push('/account')}>
        <Text style={styles.ctaText}>Войти / Регистрация — бесплатно</Text>
      </Pressable>
      <Text style={styles.hint}>Нужен аккаунт: данные личные и синхронизируются между устройствами.</Text>
    </ScrollView>
  );
}

function Row({ l, r, tone }: { l: string; r: string; tone?: 'green' | 'accent' }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowL} numberOfLines={1}>
        {l}
      </Text>
      <Text style={[styles.rowR, tone === 'green' && { color: theme.green }, tone === 'accent' && { color: theme.accent2 }]}>
        {r}
      </Text>
    </View>
  );
}

/** Мок «Цели». */
export function GoalsMock() {
  return (
    <View style={[styles.card, { transform: [{ rotate: '-4deg' }] }]}>
      <Text style={styles.cardTitle}>🏠 Прокачка дома #1256</Text>
      <Text style={styles.cardSub}>Готово 51% · осталось $23.4M</Text>
      <View style={styles.bar}>
        <View style={styles.barFill} />
      </View>
      <View style={styles.inner}>
        <Row l="Промышленные металлы · крафт" r="$296k" />
        <Row l="Обработанная древесина · крафт" r="$245k" tone="green" />
      </View>
    </View>
  );
}

/** Мок «Журнал». */
export function JournalMock() {
  return (
    <View style={[styles.card, { transform: [{ rotate: '4deg' }] }]}>
      <View style={styles.row}>
        <Text style={styles.cardTitle}>Сталь · крафт</Text>
        <Text style={styles.pnl}>+$80 000</Text>
      </View>
      <Text style={styles.cardSub}>ROI 50%</Text>
      <View style={styles.inner}>
        <Row l="материалы" r="$160 000" />
        <Row l="скрафчено / продано" r="8 / 8 шт" />
        <Row l="выручка" r="$240 000" tone="green" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, gap: 12 },
  badge: { alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5 },
  badgeText: { color: theme.muted, fontSize: 12 },
  title: { color: theme.txt, fontSize: 26, fontWeight: '800', marginTop: 4 },
  subtitle: { color: theme.muted, fontSize: 14, lineHeight: 20 },
  mockWrap: { alignItems: 'center', paddingVertical: 24 },
  card: { width: 280, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 14 },
  cardTitle: { color: theme.txt, fontSize: 15, fontWeight: '700' },
  cardSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
  bar: { height: 8, backgroundColor: theme.bg, borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  barFill: { width: '51%', height: '100%', backgroundColor: theme.accent, borderRadius: 4 },
  inner: { backgroundColor: theme.bg + '88', borderRadius: 10, padding: 10, marginTop: 10, gap: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  rowL: { color: theme.muted, fontSize: 11, flex: 1 },
  rowR: { color: theme.txt, fontSize: 11, fontWeight: '600' },
  pnl: { color: theme.green, fontSize: 18, fontWeight: '800' },
  step: { flexDirection: 'row', gap: 10 },
  stepNum: { width: 26, height: 26, borderRadius: 999, backgroundColor: theme.accent + '26', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { color: theme.accent, fontWeight: '700', fontSize: 13 },
  stepTitle: { color: theme.txt, fontSize: 14, fontWeight: '600' },
  stepText: { color: theme.muted, fontSize: 13 },
  cta: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  ctaText: { color: '#fff', fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 12, marginTop: 6 },
});
