import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function VerifyScreen() {
  const theme = useTheme();
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function handleVerify(token: string) {
    setError('');
    setLoading(true);
    const { data, error: err } = await supabase.auth.verifyOtp({
      phone: phone ?? '',
      token,
      type: 'sms',
    });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    if (!data.user) {
      setError('Something went wrong. Please try again.');
      return;
    }

    // (app)/_layout.tsx checks profile and redirects to /complete-profile if needed.
    router.replace('/');
  }

  function handleCodeChange(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    if (digits.length === 6) handleVerify(digits);
  }

  async function handleResend() {
    setError('');
    setResent(false);
    await supabase.auth.signInWithOtp({ phone: phone ?? '' });
    setResent(true);
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.heading}>
            Enter code
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subheading}>
            We sent a 6-digit code to{'\n'}
            {phone}
          </ThemedText>

          <TextInput
            ref={inputRef}
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="123456"
            placeholderTextColor={theme.textSecondary}
            keyboardType="number-pad"
            textContentType="oneTimeCode"
            maxLength={6}
            value={code}
            onChangeText={handleCodeChange}
          />

          {!!error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          {loading && <ActivityIndicator color="#208AEF" />}

          <Pressable onPress={handleResend} style={styles.resend}>
            <ThemedText type="linkPrimary">Resend code</ThemedText>
          </Pressable>
          {resent && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.resentNote}>
              Code resent.
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  inner: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: '100%',
    maxWidth: MaxContentWidth / 2,
    gap: Spacing.three,
  },
  heading: { textAlign: 'center' },
  subheading: { textAlign: 'center' },
  input: {
    height: 48,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 24,
    letterSpacing: 8,
    textAlign: 'center',
  },
  error: { color: '#e53e3e' },
  resend: { alignItems: 'center' },
  resentNote: { textAlign: 'center' },
});
