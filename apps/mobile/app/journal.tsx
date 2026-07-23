import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  craftMetrics,
  journalSummary,
  money,
  moneyShort,
  tradePnl,
  tradeStatus,
  type Trade,
  type TradeStatus,
} from '@kupec/core';
import { useJournal } from '../lib/journal';
import { useAuth } from '../lib/auth';
import { FeaturePromo, JournalMock } from '../components/FeaturePromo';
import { theme } from '../lib/theme';

/** Оформление статуса сделки (логика — `tradeStatus` в @kupec/core). */
const STATUS_META: Record<TradeStatus, { color: string; label: string }> = {
  attention: { color: theme.red, label: '⚠️ заполни данные' },
  active: { color: theme.amber, label: '🟡 в продаже' },
  done: { color: theme.green, label: '✅ продано' },
};
/** Порядок: сначала то, что требует действия. */
const RANK: Record<TradeStatus, number> = { attention: 0, active: 1, done: 2 };

export default function Journal() {
  const { user } = useAuth();
  const { trades, synced, addTrade, closeTrade, deleteTrade, scope, setScope, group } = useJournal();

  if (!user) {
    return (
      <FeaturePromo
        icon="📒"
        title="Журнал сделок с P&L"
        subtitle="Записывай перекуп и крафт — P&L, ROI и «сейчас в продаже» считаются автоматически."
        steps={[
          { n: 1, title: 'Добавь сделку', text: 'Перекуп или крафт: материалы, скрафчено, выставлено.' },
          { n: 2, title: 'Отмечай продажи', text: 'Частичные продажи — прибыль пересчитается.' },
          { n: 3, title: 'Веди общий журнал', text: 'Группа: семья/банда ведёт журнал вместе.' },
        ]}
        mock={<JournalMock />}
      />
    );
  }
  const [groupOpen, setGroupOpen] = useState(false);
  const [item, setItem] = useState('');
  const [qty, setQty] = useState('');
  const [buy, setBuy] = useState('');
  const [closing, setClosing] = useState<Trade | null>(null);
  const [sell, setSell] = useState('');
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<TradeStatus | 'all'>('all');

  const summary = useMemo(() => journalSummary(trades), [trades]);

  const withStatus = useMemo(() => trades.map((t) => ({ t, st: tradeStatus(t) })), [trades]);
  const counts = useMemo(() => {
    const c = { all: withStatus.length, attention: 0, active: 0, done: 0 };
    for (const { st } of withStatus) c[st]++;
    return c;
  }, [withStatus]);
  const visible = useMemo(() => {
    const ql = q.trim().toLowerCase();
    return withStatus
      .filter(
        ({ t, st }) =>
          (filter === 'all' || st === filter) && (!ql || t.item.toLowerCase().includes(ql)),
      )
      .sort((a, b) => RANK[a.st] - RANK[b.st] || b.t.createdAt - a.t.createdAt);
  }, [withStatus, q, filter]);

  const add = () => {
    const q = Number(qty) || 0;
    const b = Number(buy) || 0;
    if (!item.trim() || q <= 0 || b <= 0) return;
    addTrade({ item: item.trim(), qty: q, buy: b });
    setItem('');
    setQty('');
    setBuy('');
  };

  const confirmClose = () => {
    const s = Number(sell) || 0;
    if (closing && s > 0) closeTrade(closing.id, s);
    setClosing(null);
    setSell('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.stats}>
        <Stat label="Открыто" value={String(summary.open)} sub={money(summary.invested)} />
        <Stat
          label="Реализовано"
          value={money(summary.realized)}
          color={summary.realized >= 0 ? theme.green : theme.red}
        />
        <Stat label="ROI" value={`${summary.roi.toFixed(0)}%`} color={theme.accent2} />
      </View>

      <View style={styles.form}>
        <TextInput
          style={[styles.input, { flex: 2 }]}
          placeholder="Товар"
          placeholderTextColor={theme.muted}
          value={item}
          onChangeText={setItem}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Кол-во"
          placeholderTextColor={theme.muted}
          keyboardType="numeric"
          value={qty}
          onChangeText={setQty}
        />
        <TextInput
          style={[styles.input, { flex: 1 }]}
          placeholder="Цена"
          placeholderTextColor={theme.muted}
          keyboardType="numeric"
          value={buy}
          onChangeText={setBuy}
        />
        <Pressable style={styles.addBtn} onPress={add}>
          <Text style={styles.addBtnText}>+</Text>
        </Pressable>
      </View>
      {!synced && <Text style={styles.localHint}>Локально. Войди в «Аккаунт» — синхронизируется.</Text>}

      {synced && (
        <View style={styles.scopeRow}>
          {group && (
            <View style={styles.scopeSwitch}>
              <Pressable
                style={[styles.scopeBtn, scope === 'mine' && styles.scopeBtnOn]}
                onPress={() => setScope('mine')}
              >
                <Text style={[styles.scopeText, scope === 'mine' && styles.scopeTextOn]}>Мой</Text>
              </Pressable>
              <Pressable
                style={[styles.scopeBtn, scope === 'group' && styles.scopeBtnOn]}
                onPress={() => setScope('group')}
              >
                <Text style={[styles.scopeText, scope === 'group' && styles.scopeTextOn]} numberOfLines={1}>
                  👥 {group.name}
                </Text>
              </Pressable>
            </View>
          )}
          <Pressable onPress={() => setGroupOpen(true)}>
            <Text style={styles.groupLink}>{group ? '👥 Группа' : '👥 Создать группу'}</Text>
          </Pressable>
        </View>
      )}

      {trades.length > 0 && (
        <>
          <TextInput
            style={styles.search}
            placeholder="🔍 Найти сделку по названию…"
            placeholderTextColor={theme.muted}
            value={q}
            onChangeText={setQ}
          />
          <View style={styles.chips}>
            <Chip label="Все" count={counts.all} active={filter === 'all'} onPress={() => setFilter('all')} />
            <Chip label="🟡" count={counts.active} sum={moneyShort(summary.listedValue)} color={theme.amber} active={filter === 'active'} onPress={() => setFilter('active')} />
            <Chip label="✅" count={counts.done} sum={moneyShort(summary.soldRevenue)} color={theme.green} active={filter === 'done'} onPress={() => setFilter('done')} />
            {counts.attention > 0 && (
              <Chip label="⚠️" count={counts.attention} color={theme.red} active={filter === 'attention'} onPress={() => setFilter('attention')} />
            )}
          </View>
        </>
      )}

      <FlatList
        data={visible}
        keyExtractor={({ t }) => t.id}
        contentContainerStyle={{ paddingBottom: 40 }}
        renderItem={({ item: { t, st } }) => (
          <TradeRow t={t} st={st} onSell={() => setClosing(t)} onDelete={() => deleteTrade(t.id)} />
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {trades.length === 0 ? 'Журнал пуст. Добавь сделку выше.' : 'Ничего не найдено.'}
          </Text>
        }
      />

      <GroupModal visible={groupOpen} onClose={() => setGroupOpen(false)} />

      <Modal visible={!!closing} transparent animationType="fade" onRequestClose={() => setClosing(null)}>
        <View style={styles.modalBg}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Продать: {closing?.item}</Text>
            <TextInput
              style={styles.input}
              placeholder="Цена продажи за шт."
              placeholderTextColor={theme.muted}
              keyboardType="numeric"
              value={sell}
              onChangeText={setSell}
              autoFocus
            />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <Pressable style={[styles.modalBtn, styles.modalGhost]} onPress={() => setClosing(null)}>
                <Text style={styles.btnGhostText}>Отмена</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, { backgroundColor: theme.green }]} onPress={confirmClose}>
                <Text style={styles.addBtnText}>Закрыть сделку</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/** Создание/вступление в группу и список участников. */
function GroupModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { group, members, createGroup, joinGroup, leaveGroup } = useJournal();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const run = (fn: () => Promise<void>) => {
    setError(null);
    fn().catch((e) => setError(e instanceof Error ? e.message : 'Не вышло'));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBg}>
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>{group ? `Группа «${group.name}»` : 'Общий журнал'}</Text>

          {group ? (
            <View style={{ gap: 10 }}>
              <Text style={styles.statLabel}>Код приглашения</Text>
              <Text style={styles.code}>{group.inviteCode}</Text>
              <Text style={styles.statLabel}>Участники ({members.length})</Text>
              {members.map((m) => (
                <Text key={m.id} style={styles.member}>
                  {m.email}
                  {m.id === group.ownerId ? '  · владелец' : ''}
                </Text>
              ))}
              <Pressable onPress={() => run(async () => { await leaveGroup(); onClose(); })}>
                <Text style={styles.del}>Выйти из группы</Text>
              </Pressable>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              <Text style={styles.sub}>
                Один журнал на нескольких игроков: видно, кто что скрафтил и продал.
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Название своей группы"
                placeholderTextColor={theme.muted}
                value={name}
                onChangeText={setName}
              />
              <Pressable
                style={[styles.modalBtn, { backgroundColor: theme.accent }]}
                onPress={() => name.trim() && run(async () => { await createGroup(name); })}
              >
                <Text style={styles.addBtnText}>Создать</Text>
              </Pressable>
              <TextInput
                style={styles.input}
                placeholder="Или код приглашения"
                placeholderTextColor={theme.muted}
                autoCapitalize="characters"
                value={code}
                onChangeText={setCode}
              />
              <Pressable
                style={[styles.modalBtn, styles.modalGhost]}
                onPress={() => code.trim() && run(async () => { await joinGroup(code); })}
              >
                <Text style={styles.btnGhostText}>Вступить</Text>
              </Pressable>
            </View>
          )}

          {error && <Text style={[styles.del, { color: theme.red, marginTop: 8 }]}>{error}</Text>}

          <Pressable style={[styles.modalBtn, styles.modalGhost, { marginTop: 12 }]} onPress={onClose}>
            <Text style={styles.btnGhostText}>Закрыть</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/** Карточка сделки: цвет статуса, крупные материалы/себест, P&L. */
function TradeRow({
  t,
  st,
  onSell,
  onDelete,
}: {
  t: Trade & { author?: string };
  st: TradeStatus;
  onSell: () => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[st];
  const isCraft = t.kind === 'craft';
  const m = isCraft ? craftMetrics(t) : null;
  const p = !isCraft ? tradePnl(t) : null;
  return (
    <View style={[styles.card, { borderLeftColor: meta.color }]}>
      <View style={styles.cardTop}>
        <View style={{ flex: 1, paddingRight: 8 }}>
          <Text style={styles.name} numberOfLines={1}>
            {t.item}
          </Text>
          <Text style={[styles.status, { color: meta.color }]} numberOfLines={1}>
            {isCraft ? '🔨 ' : '💱 '}
            {meta.label}
          </Text>
          {t.author ? <Text style={styles.author}>{t.author}</Text> : null}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          {isCraft ? (
            <>
              <Text style={[styles.pnl, { color: m!.realized >= 0 ? theme.green : theme.red }]} numberOfLines={1}>
                {m!.realized > 0 ? '+' : ''}
                {money(m!.realized)}
              </Text>
              <Text style={styles.roi}>{m!.roi != null ? `ROI ${m!.roi.toFixed(0)}%` : 'ещё не продано'}</Text>
            </>
          ) : p!.pnl == null ? (
            <Text style={styles.open}>в рынке</Text>
          ) : (
            <>
              <Text style={[styles.pnl, { color: p!.pnl >= 0 ? theme.green : theme.red }]} numberOfLines={1}>
                {p!.pnl > 0 ? '+' : ''}
                {money(p!.pnl)}
              </Text>
              <Text style={styles.roi}>ROI {p!.roi!.toFixed(0)}%</Text>
            </>
          )}
        </View>
      </View>

      <View style={styles.strip}>
        {isCraft ? (
          <>
            <Big label="Материалы" value={money(m!.materials)} />
            <Big label="Себест/шт" value={money(m!.costPerUnit)} />
            <Big
              label="Выставл/шт"
              value={m!.listPrice && m!.listPrice > 0 ? money(m!.listPrice) : 'нет'}
              warn={!m!.listPrice || m!.listPrice <= 0}
            />
          </>
        ) : (
          <>
            <Big label="Кол-во" value={`${t.qty} шт`} />
            <Big label="Куплено/шт" value={money(t.buy)} />
            <Big label="Продано/шт" value={t.sell != null ? money(t.sell) : '—'} />
          </>
        )}
      </View>

      {isCraft ? (
        <Text style={styles.progress}>
          Продано {m!.soldUnits}/{m!.crafted} шт · выручка {money(m!.soldRevenue)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {st !== 'done' && (
          <Pressable onPress={onSell}>
            <Text style={styles.sell}>Продать</Text>
          </Pressable>
        )}
        <Pressable onPress={onDelete}>
          <Text style={styles.del}>Удалить</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Крупная цифра в карточке. */
function Big({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.bigLabel} numberOfLines={1}>
        {label}
      </Text>
      <Text style={[styles.bigValue, warn ? { color: theme.red } : null]} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
    </View>
  );
}

/** Чип фильтра по статусу: счётчик + (опц.) денежный итог. */
function Chip({
  label,
  count,
  sum,
  active,
  onPress,
  color,
}: {
  label: string;
  count: number;
  sum?: string;
  active: boolean;
  onPress: () => void;
  color?: string;
}) {
  return (
    <Pressable
      style={[styles.chip, active ? { backgroundColor: (color ?? theme.accent) + '26', borderColor: color ?? theme.accent } : null]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active ? { color: color ?? theme.txt, fontWeight: '700' } : null]}>
        {label} {count}
        {sum ? <Text style={{ fontWeight: '700', color: color ?? theme.txt }}> · {sum}</Text> : null}
      </Text>
    </Pressable>
  );
}

function Stat({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      {sub && <Text style={styles.statSub}>{sub}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 12, gap: 10 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: theme.surface, borderRadius: 12, padding: 12 },
  statLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase' },
  statValue: { color: theme.txt, fontSize: 18, fontWeight: '700', marginTop: 2 },
  statSub: { color: theme.muted, fontSize: 11, marginTop: 2 },
  form: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    color: theme.txt,
  },
  addBtn: { backgroundColor: theme.accent, borderRadius: 10, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  addBtnText: { color: '#fff', fontWeight: '700', fontSize: 18 },
  localHint: { color: theme.muted, fontSize: 11 },
  scopeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scopeSwitch: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 2, flex: 1 },
  scopeBtn: { flex: 1, paddingVertical: 7, paddingHorizontal: 10, borderRadius: 8, alignItems: 'center' },
  scopeBtnOn: { backgroundColor: theme.line },
  scopeText: { color: theme.muted, fontSize: 12 },
  scopeTextOn: { color: theme.txt, fontWeight: '700' },
  groupLink: { color: theme.accent2, fontSize: 12 },
  author: { color: theme.muted, fontSize: 11, marginTop: 2 },
  code: { color: theme.txt, fontSize: 22, fontWeight: '700', letterSpacing: 4 },
  member: { color: theme.txt, fontSize: 13 },
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: theme.muted, fontSize: 12 },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.line,
    borderLeftWidth: 4,
    padding: 12,
    marginBottom: 10,
    gap: 10,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  status: { fontSize: 12, fontWeight: '600', marginTop: 3 },
  strip: { flexDirection: 'row', gap: 8, backgroundColor: theme.bg, borderRadius: 10, padding: 10 },
  bigLabel: { color: theme.muted, fontSize: 10, textTransform: 'uppercase' },
  bigValue: { color: theme.txt, fontSize: 14, fontWeight: '700', marginTop: 2 },
  progress: { color: theme.muted, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 16 },
  roi: { color: theme.muted, fontSize: 11, marginTop: 2 },
  name: { color: theme.txt, fontSize: 15, fontWeight: '600' },
  sub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  open: { color: theme.muted, fontSize: 13 },
  pnl: { fontWeight: '800', fontSize: 16 },
  sell: { color: theme.green, fontSize: 13, fontWeight: '600' },
  del: { color: theme.muted, fontSize: 13 },
  empty: { color: theme.muted, textAlign: 'center', marginTop: 32 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modal: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 16 },
  modalTitle: { color: theme.txt, fontSize: 16, fontWeight: '700', marginBottom: 12 },
  modalBtn: { flex: 1, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  modalGhost: { borderWidth: 1, borderColor: theme.line },
  btnGhostText: { color: theme.txt, fontWeight: '600' },
});
