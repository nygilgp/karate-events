import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

export default function CompleteProfileScreen() {
  const theme = useTheme();
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSave() {
    setError('');
    const name = fullName.trim();
    if (!name) {
      setError('Please enter your name.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setError('Session expired. Please sign in again.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase
      .from('profiles')
      .insert({ id: user.id, role: 'parent', full_name: name });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    router.replace('/');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.inner}>
        <ThemedView style={styles.card}>
          <ThemedText type="subtitle" style={styles.heading}>
            What's your name?
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.subheading}>
            This is how you'll appear in the app.
          </ThemedText>

          <TextInput
            style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
            placeholder="Full name"
            placeholderTextColor={theme.textSecondary}
            autoFocus
            autoCapitalize="words"
            textContentType="name"
            value={fullName}
            onChangeText={setFullName}
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />

          {!!error && (
            <ThemedText type="small" style={styles.error}>
              {error}
            </ThemedText>
          )}

          <Pressable
            style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
            onPress={handleSave}
            disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <ThemedText type="smallBold" style={styles.buttonText}>
                Continue
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
