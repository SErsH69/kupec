import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { NotifyButton } from '../components/NotifyButton';
import { theme } from '../lib/theme';

export default function Account() {
  const { user, api, register, login, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Имя из настроек аккаунта.
  const [name, setName] = useState('');
  const [savedName, setSavedName] = useState('');
  const [nameMsg, setNameMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    api
      .getSettings()
      .then((s) => {
        if (!alive) return;
        setName(s.name ?? '');
        setSavedName(s.name ?? '');
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user, api]);

  if (user) {
    const saveName = async () => {
      setNameMsg(null);
      try {
        await api.updateSettings({ name: name.trim() });
        setSavedName(name.trim());
        setNameMsg('Сохранено');
      } catch {
        setNameMsg('Не удалось сохранить');
      }
    };

    return (
      <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={styles.container}>
        <View style={styles.card}>
          <Text style={styles.name}>{name || 'Игрок'}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Text style={styles.cardLabel}>Имя</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Как тебя показывать"
              placeholderTextColor={theme.muted}
              value={name}
              onChangeText={setName}
            />
            <Pressable
              style={[styles.saveBtn, name.trim() === savedName && { opacity: 0.4 }]}
              onPress={saveName}
              disabled={name.trim() === savedName}
            >
              <Text style={styles.btnText}>OK</Text>
            </Pressable>
          </View>
          {nameMsg && <Text style={styles.hint}>{nameMsg}</Text>}
        </View>

        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cardTitle}>Тариф</Text>
            <Text style={styles.free}>Бесплатный</Text>
          </View>
          <Text style={styles.hint}>Сейчас всё бесплатно.</Text>
          <Text style={[styles.cardLabel, { marginTop: 10 }]}>Pro · скоро</Text>
          <Text style={styles.proItem}>• Пуши при закрытом приложении</Text>
          <Text style={styles.proItem}>• История цен глубже 30 дней</Text>
          <Text style={styles.proItem}>• Общий журнал группы без ограничений</Text>
          <Text style={[styles.hint, { marginTop: 8 }]}>
            Оплату подключим после запуска сервера — сейчас платить не за что.
          </Text>
        </View>

        <NotifyButton />
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={logout}>
          <Text style={styles.btnGhostText}>Выйти</Text>
        </Pressable>
      </ScrollView>
    );
  }

  const submit = async () => {
    setBusy(true);
    setError(null);
    const res = mode === 'register' ? await register(email, password) : await login(email, password);
    setBusy(false);
    if (!res.ok) setError(res.error ?? 'Ошибка');
  };

  return (
    <View style={styles.container}>
      <View style={styles.switch}>
        <Pressable
          style={[styles.switchBtn, mode === 'login' && styles.switchActive]}
          onPress={() => setMode('login')}
        >
          <Text style={mode === 'login' ? styles.switchTextActive : styles.switchText}>Вход</Text>
        </Pressable>
        <Pressable
          style={[styles.switchBtn, mode === 'register' && styles.switchActive]}
          onPress={() => setMode('register')}
        >
          <Text style={mode === 'register' ? styles.switchTextActive : styles.switchText}>Регистрация</Text>
        </Pressable>
      </View>

      <TextInput
        style={styles.input}
        placeholder="email"
        placeholderTextColor={theme.muted}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder="пароль (≥6 символов)"
        placeholderTextColor={theme.muted}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {error && <Text style={styles.error}>✗ {error}</Text>}

      <Pressable style={styles.btn} onPress={submit} disabled={busy}>
        <Text style={styles.btnText}>{busy ? '…' : mode === 'register' ? 'Создать аккаунт' : 'Войти'}</Text>
      </Pressable>
      <Text style={styles.hint}>Аккаунт синхронизирует журнал между устройствами.</Text>
      <NotifyButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: theme.bg, padding: 16, gap: 12 },
  label: { color: theme.muted, fontSize: 13 },
  email: { color: theme.muted, fontSize: 13, marginTop: 2 },
  hint: { color: theme.muted, fontSize: 12, marginTop: 4 },
  card: { backgroundColor: theme.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.line, padding: 16, gap: 6 },
  cardTitle: { color: theme.txt, fontSize: 15, fontWeight: '700' },
  cardLabel: { color: theme.muted, fontSize: 11, textTransform: 'uppercase', marginTop: 8 },
  name: { color: theme.txt, fontSize: 20, fontWeight: '700' },
  free: { color: theme.green, fontSize: 12, fontWeight: '700', backgroundColor: theme.green + '22', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  proItem: { color: theme.txt, fontSize: 13, marginTop: 2 },
  saveBtn: { backgroundColor: theme.accent, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  switch: { flexDirection: 'row', backgroundColor: theme.surface, borderRadius: 10, padding: 4, gap: 4 },
  switchBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center' },
  switchActive: { backgroundColor: theme.surface2 },
  switchText: { color: theme.muted },
  switchTextActive: { color: theme.txt, fontWeight: '600' },
  input: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.line,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: theme.txt,
  },
  error: { color: theme.red, fontSize: 13 },
  btn: { backgroundColor: theme.accent, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: '#fff', fontWeight: '700' },
  btnGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.line, marginTop: 12 },
  btnGhostText: { color: theme.txt, fontWeight: '600' },
});
