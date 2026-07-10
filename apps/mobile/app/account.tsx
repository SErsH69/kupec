import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../lib/auth';
import { theme } from '../lib/theme';

export default function Account() {
  const { user, register, login, logout } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (user) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Вы вошли как</Text>
        <Text style={styles.email}>{user.email}</Text>
        <Text style={styles.hint}>Журнал сделок синхронизируется с аккаунтом.</Text>
        <Pressable style={[styles.btn, styles.btnGhost]} onPress={logout}>
          <Text style={styles.btnGhostText}>Выйти</Text>
        </Pressable>
      </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg, padding: 16, gap: 10 },
  label: { color: theme.muted, fontSize: 13 },
  email: { color: theme.txt, fontSize: 20, fontWeight: '700' },
  hint: { color: theme.muted, fontSize: 12, marginTop: 4 },
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
