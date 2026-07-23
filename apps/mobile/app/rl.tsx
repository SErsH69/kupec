import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { buildRL, money, type RLVehicle } from '@kupec/core';
import { useMarket } from '../lib/market';
import { theme } from '../lib/theme';

interface RLRow extends RLVehicle {
  market: number | null;
  profit: number | null;
}

export default function RL() {
  const { rows, loading, loaded, error, load, server } = useMarket();
  const [onlyDeals, setOnlyDeals] = useState(false);

  const marketByCode = useMemo(() => {
    const m: Record<string, number | null> = {};
    for (const r of rows) if (r._path === 'vehicles') m[String(r.id)] = r.avg;
    return m;
  }, [rows]);

  const all = useMemo<RLRow[]>(
    () =>
      buildRL().map((v) => {
        const market = marketByCode[v.code] ?? null;
        const profit = market != null && v.gos != null ? market - v.gos : null;
        return { ...v, market, profit };
      }),
    [marketByCode],
  );

  const hasMarket = useMemo(() => rows.some((r) => r._path === 'vehicles'), [rows]);
  const dealCount = useMemo(() => all.filter((r) => (r.profit ?? 0) > 0).length, [all]);
  const data = useMemo(() => {
    const list = onlyDeals ? all.filter((r) => (r.profit ?? 0) > 0) : all;
    return [...list].sort((a, b) =>
      hasMarket ? (b.profit ?? -Infinity) - (a.profit ?? -Infinity) : (a.gos ?? 0) - (b.gos ?? 0),
    );
  }, [all, onlyDeals, hasMarket]);

  const header = (
    <View style={{ gap: 10, marginBottom: 8 }}>
      <View style={styles.note}>
        <Text style={styles.noteText}>
          <Text style={{ color: theme.txt }}>Гос-цена</Text> — купить авто у государства,{' '}
          <Text style={{ color: theme.txt }}>рынок</Text> — за сколько перепродают игроки.{' '}
          <Text style={{ color: theme.green }}>Навар = рынок − гос</Text>: где выгодно скупать у государства и
          перепродавать.
        </Text>
      </View>

      <Pressable style={styles.loadBtn} onPress={load}>
        <Text style={styles.loadText}>🔄 Загрузить с сервера ({server})</Text>
      </Pressable>
      {loading && <ActivityIndicator color={theme.accent} />}
      {error && <Text style={styles.err}>{error}</Text>}

      {hasMarket && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable style={[styles.dealToggle, onlyDeals && styles.dealToggleOn]} onPress={() => setOnlyDeals((v) => !v)}>
            <Text style={[styles.dealToggleText, onlyDeals && { color: theme.green }]}>
              💰 Только выгодные {dealCount}
            </Text>
          </Pressable>
          <Text style={styles.count}>{data.length} авто</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(r) => r.code}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListHeaderComponent={header}
        renderItem={({ item: r }) => (
          <View style={styles.card}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.name} numberOfLines={1}>
                {r.real}
              </Text>
              <Text style={styles.game} numberOfLines={1}>
                {r.game}
              </Text>
              <Text style={styles.prices}>
                гос {money(r.gos)} · рынок {r.market == null ? '—' : money(r.market)}
              </Text>
            </View>
            <Text
              style={[
                styles.profit,
                { color: r.profit == null ? theme.muted : r.profit > 0 ? theme.green : theme.muted },
              ]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {r.profit == null ? '—' : `${r.profit > 0 ? '+' : ''}${money(r.profit)}`}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {loaded ? 'Нет данных по авто.' : 'Нажми «Загрузить», чтобы посчитать навар.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  note: { backgroundColor: theme.accent + '14', borderRadius: 10, borderWidth: 1, borderColor: theme.accent + '40', padding: 10 },
  noteText: { color: theme.muted, fontSize: 11, lineHeight: 16 },
  loadBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loadText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  err: { color: theme.red, textAlign: 'center' },
  dealToggle: { borderWidth: 1, borderColor: theme.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 7 },
  dealToggleOn: { backgroundColor: theme.green + '26', borderColor: theme.green },
  dealToggleText: { color: theme.muted, fontSize: 12, fontWeight: '600' },
  count: { color: theme.muted, fontSize: 12 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 32 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  name: { color: theme.txt, fontSize: 15, fontWeight: '600' },
  game: { color: theme.muted, fontSize: 12, marginTop: 1 },
  prices: { color: theme.muted, fontSize: 12, marginTop: 4 },
  profit: { fontSize: 16, fontWeight: '800', maxWidth: 130, textAlign: 'right' },
});
