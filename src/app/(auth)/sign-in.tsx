import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

function getDefaultDialCode(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz === 'Asia/Kolkata' || tz === 'Asia/Calcutta') return '+91';
    if (tz.startsWith('America/')) return '+1';
    if (tz === 'Europe/London') return '+44';
    if (tz.startsWith('Australia/')) return '+61';
    if (tz.startsWith('Asia/Dubai') || tz === 'Asia/Muscat') return '+971';
  } catch {
    // ignore
  }
  return '+1';
}

const SKIP_OTP = process.env.EXPO_PUBLIC_SKIP_OTP === 'true';

function toE164(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

export default function SignInScreen() {
  const theme = useTheme();
  const [phone, setPhone] = useState(getDefaultDialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSend() {
    setError('');
    const formatted = toE164(phone);
    if (formatted.length < 8) {
      setError('Enter a valid phone number with country code.');
      return;
    }
    setLoading(true);
    const { error: sendErr } = await supabase.auth.signInWithOtp({ phone: formatted });
    if (sendErr) {
      setLoading(false);
      setError(sendErr.message);
      return;
    }
    if (SKIP_OTP) {
      // Dev mode: auto-verify with the test OTP code so we never see the verify screen.
      // Requires the phone to be listed in supabase/config.toml [auth.sms.test_otp].
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        phone: formatted,
        token: '123456',
        type: 'sms',
      });
      setLoading(false);
      if (verifyErr) {
        setError(`Auto-verify failed: add ${formatted} to [auth.sms.test_otp] in config.toml`);
        return;
      }
      router.replace('/');
      return;
    }
    setLoading(false);
    router.push({ pathname: '/verify', params: { phone: formatted } });
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.heading}>
            Sign in
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subheading}>
            We'll send a one-time code to your phone.
          </ThemedText>

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder={phone.startsWith('+91') ? '+91 98765 43210' : '+1 555 000 0000'}
            placeholderTextColor={theme.textSecondary}
            keyboardType="phone-pad"
            textContentType="telephoneNumber"
            autoFocus
            value={phone}
            onChangeText={setPhone}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />

          {!!error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSend}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Send code
              </ThemedText>
            )}
          </Pressable>
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
    fontSize: 16,
  },
  error: { color: '#e53e3e' },
  button: {
    height: 48,
    borderRadius: Spacing.two,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPressed: { opacity: 0.8 },
  buttonText: { color: '#fff' },
});
