import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { money, nf, type MarketRow } from '@kupec/core';
import { useAuth } from '../lib/auth';
import { theme } from '../lib/theme';

const SERVER = 'RU17';

export default function Overview() {
  const { api } = useAuth();
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setErr(null);
    try {
      const r = await api.getMarket(SERVER);
      setRows([...r.rows].sort((a, b) => (b.turnover ?? 0) - (a.turnover ?? 0)));
    } catch {
      setErr('Не удалось загрузить. Запущен ли API?');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.btn} onPress={load}>
        <Text style={styles.btnText}>🔄 Загрузить с сервера ({SERVER})</Text>
      </Pressable>

      {loading && <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />}
      {err && <Text style={styles.err}>{err}</Text>}

      <FlatList
        data={rows}
        keyExtractor={(r) => `${r._path}:${r.id}`}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.name} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.money}>{money(item.turnover)}</Text>
              <Text style={styles.sub}>{nf(item.sold)} продано</Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>Нажми «Загрузить», чтобы получить данные рынка.</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  btn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  err: { color: theme.red, marginTop: 16, textAlign: 'center' },
  empty: { color: theme.muted, marginTop: 32, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.line,
    gap: 12,
  },
  name: { color: theme.txt, fontSize: 15, flex: 1 },
  money: { color: theme.green, fontWeight: '700', fontSize: 15 },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
});
