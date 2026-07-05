import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/use-theme';

function toE164(raw: string): string {
  // Keep leading + and digits only
  const digits = raw.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? digits : `+${digits}`;
}

export default function SignInScreen() {
  const theme = useTheme();
  const [phone, setPhone] = useState('');
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
    const { data, error: err } = await supabase.auth.signInWithOtp({ phone: formatted });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    if (data.session) {
      // Local dev autoconfirm: session created immediately, no OTP screen needed.
      // (app)/_layout.tsx will check for profile and redirect to /complete-profile if needed.
      router.replace('/');
    } else {
      // Production: OTP sent, navigate to verify screen.
      router.push({ pathname: '/verify', params: { phone: formatted } });
    }
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
            placeholder="+1 555 000 0000"
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
