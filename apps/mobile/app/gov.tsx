import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { computeGovDeals, money, nf, type GovDeal } from '@kupec/core';
import { useMarket } from '../lib/market';
import { theme } from '../lib/theme';

export default function Gov() {
  const { rows, loading, loaded, error, load, server } = useMarket();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('*');
  const [onlyDeals, setOnlyDeals] = useState(false);

  const deals = useMemo(() => computeGovDeals(rows), [rows]);
  const cats = useMemo(() => Array.from(new Set(deals.map((d) => d.gov.cat))).sort(), [deals]);
  const dealCount = useMemo(() => deals.filter((d) => d.action).length, [deals]);
  const hasMarket = useMemo(() => rows.some((r) => r._path === 'items'), [rows]);

  const data = useMemo(() => {
    const ql = q.toLowerCase().trim();
    return deals
      .filter(
        (d) =>
          (cat === '*' || d.gov.cat === cat) &&
          (!ql || d.gov.name.toLowerCase().includes(ql)) &&
          (!onlyDeals || d.action != null),
      )
      .sort((a, b) => (hasMarket ? b.edge - a.edge : a.gov.name.localeCompare(b.gov.name, 'ru')));
  }, [deals, q, cat, onlyDeals, hasMarket]);

  const header = (
    <View style={{ gap: 10, marginBottom: 8 }}>
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Гос-цены скупщиков (НПС) × живой рынок. <Text style={{ color: theme.green }}>Сдать скупщику</Text> — когда НПС
          берёт дороже рынка (мгновенно, без ожидания). <Text style={{ color: theme.accent2 }}>Купить у НПС</Text> — когда
          он продаёт дешевле рынка. Сравниваем только с живым рынком (есть цена и продажи), число продаж — рядом.
        </Text>
      </View>

      <Pressable style={styles.loadBtn} onPress={load}>
        <Text style={styles.loadText}>🔄 Загрузить с сервера ({server})</Text>
      </Pressable>
      {loading && <ActivityIndicator color={theme.accent} />}
      {error && <Text style={styles.err}>{error}</Text>}

      {hasMarket && (
        <>
          <TextInput
            style={styles.search}
            placeholder="🔍 Поиск товара…"
            placeholderTextColor={theme.muted}
            value={q}
            onChangeText={setQ}
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Все" active={cat === '*'} onPress={() => setCat('*')} />
            {cats.map((c) => (
              <Chip key={c} label={c} active={cat === c} onPress={() => setCat(c)} />
            ))}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Pressable
              style={[styles.dealToggle, onlyDeals && styles.dealToggleOn]}
              onPress={() => setOnlyDeals((v) => !v)}
            >
              <Text style={[styles.dealToggleText, onlyDeals && { color: theme.green }]}>
                💰 Только выгодные {dealCount}
              </Text>
            </Pressable>
            <Text style={styles.count}>{data.length} поз.</Text>
          </View>
        </>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data}
        keyExtractor={(d, i) => `${d.gov.name}:${i}`}
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        ListHeaderComponent={header}
        renderItem={({ item: d }) => <DealCard d={d} />}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.empty}>
              {loaded ? 'Ничего не найдено.' : 'Нажми «Загрузить», чтобы сравнить с рынком.'}
            </Text>
          ) : null
        }
      />
    </View>
  );
}

function DealCard({ d }: { d: GovDeal }) {
  const g = d.gov;
  const actionColor = d.action === 'sell' ? theme.green : theme.accent2;
  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.name} numberOfLines={2}>
            {g.name}
          </Text>
          <Text style={styles.cat}>{g.cat}</Text>
        </View>
        {d.action ? (
          <View style={{ alignItems: 'flex-end' }}>
            <View style={[styles.badge, { backgroundColor: actionColor + '26' }]}>
              <Text style={[styles.badgeText, { color: actionColor }]}>
                {d.action === 'sell' ? 'сдать скупщику' : 'купить у НПС'}
              </Text>
            </View>
            <Text style={[styles.edge, { color: actionColor }]}>+{money(d.edge)}</Text>
          </View>
        ) : (
          <Text style={styles.noEdge}>—</Text>
        )}
      </View>

      <View style={styles.strip}>
        <Big label="Скупка НПС" value={`${money(g.min)}–${money(g.max)}`} />
        <Big label="Игроку" value={`${money(g.pmin)}–${money(g.pmax)}`} />
        <Big
          label="Рынок ~"
          value={d.marketAvg == null ? 'нет' : `${money(d.marketAvg)}`}
          sub={d.marketAvg == null ? undefined : `${nf(d.market?.sold)} прод`}
          muted={d.marketAvg == null}
        />
      </View>
    </View>
  );
}

function Big({ label, value, sub, muted }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.bigLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.bigValue, muted ? { color: theme.muted } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {sub ? <Text style={styles.bigSub}>{sub}</Text> : null}
    </View>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable style={[styles.chip, active && styles.chipOn]} onPress={onPress}>
      <Text style={[styles.chipText, active && { color: theme.txt, fontWeight: '700' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  note: { backgroundColor: theme.accent + '14', borderRadius: 10, borderWidth: 1, borderColor: theme.accent + '40', padding: 10 },
  noteText: { color: theme.muted, fontSize: 11, lineHeight: 16 },
  loadBtn: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  loadText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  err: { color: theme.red, textAlign: 'center' },
  search: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: theme.txt,
    fontSize: 13,
  },
  chips: { gap: 6, paddingRight: 12 },
  chip: { borderWidth: 1, borderColor: theme.line, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexGrow: 0 },
  chipOn: { backgroundColor: theme.accent + '26', borderColor: theme.accent },
  chipText: { color: theme.muted, fontSize: 12 },
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
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  name: { color: theme.txt, fontSize: 15, fontWeight: '600' },
  cat: { color: theme.muted, fontSize: 12, marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  edge: { fontSize: 15, fontWeight: '800', marginTop: 3 },
  noEdge: { color: theme.muted, fontSize: 16 },
  strip: { flexDirection: 'row', gap: 8, backgroundColor: theme.bg, borderRadius: 10, padding: 10 },
  bigLabel: { color: theme.muted, fontSize: 10, textTransform: 'uppercase' },
  bigValue: { color: theme.txt, fontSize: 13, fontWeight: '700', marginTop: 2 },
  bigSub: { color: theme.muted, fontSize: 10, marginTop: 1 },
});
