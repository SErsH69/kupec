import { type ReactNode } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useMarket } from '../lib/market';
import { theme } from '../lib/theme';

/**
 * Общий каркас экрана с рыночными данными: кнопка загрузки, состояния
 * загрузки/ошибки/пустоты и список. `rows` и `renderRow` задаёт конкретный экран.
 */
export function MarketScreen<T>({
  rows,
  keyFor,
  renderRow,
  emptyHint,
}: {
  rows: T[];
  keyFor: (row: T, i: number) => string;
  renderRow: (row: T) => ReactNode;
  emptyHint: string;
}) {
  const { server, loading, error, loaded, load } = useMarket();

  return (
    <View style={styles.container}>
      <Pressable style={styles.btn} onPress={load}>
        <Text style={styles.btnText}>🔄 Загрузить с сервера ({server})</Text>
      </Pressable>

      {loading && <ActivityIndicator color={theme.accent} style={{ marginTop: 24 }} />}
      {error && <Text style={styles.err}>{error}</Text>}

      <FlatList
        data={rows}
        keyExtractor={keyFor}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item }) => <View style={styles.row}>{renderRow(item)}</View>}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {loaded ? 'Пусто для этого раздела.' : emptyHint}
            </Text>
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
});
