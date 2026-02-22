// src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../lib/supabase';
import { useTheme } from '../context/ThemeContext';

type Mode = 'signIn' | 'signUp';

const AuthScreen = () => {
  const [mode, setMode] = useState<Mode>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const onSubmit = async () => {
    setError(null);

    if (!email || !password) {
      setError('Введите email и пароль');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signIn') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
      }
    } catch (e: any) {
      setError(e.message || 'Ошибка авторизации');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[
        styles.container,
        isDark ? styles.containerDark : styles.containerLight,
      ]}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <View style={styles.brandBlock}>
        <View style={styles.logoCircle}>
          <Text style={styles.logoEmoji}>🎁</Text>
        </View>
        <View>
          <Text
            style={[
              styles.brandTitle,
              isDark && styles.brandTitleDark,
            ]}
          >
            Social Wishlist
          </Text>
          <Text
            style={[
              styles.brandSubtitle,
              isDark && styles.brandSubtitleDark,
            ]}
          >
            Социальные вишлисты с резервами и сборами
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.card,
          isDark ? styles.cardDark : styles.cardLight,
        ]}
      >
        <Text
          style={[
            styles.cardTitle,
            isDark && styles.cardTitleDark,
          ]}
        >
          {mode === 'signIn' ? 'Вход в аккаунт' : 'Создание аккаунта'}
        </Text>
        <Text
          style={[
            styles.cardSubtitle,
            isDark && styles.cardSubtitleDark,
          ]}
        >
          {mode === 'signIn'
            ? 'Войдите, чтобы управлять своими вишлистами'
            : 'Зарегистрируйтесь и создайте свой первый вишлист'}
        </Text>

        {!!error && <Text style={styles.errorText}>{error}</Text>}

        <View style={styles.fieldGroup}>
          <Text
            style={[
              styles.label,
              isDark && styles.labelDark,
            ]}
          >
            Email
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark ? styles.inputDark : styles.inputLight,
            ]}
            placeholder="you@example.com"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text
            style={[
              styles.label,
              isDark && styles.labelDark,
            ]}
          >
            Пароль
          </Text>
          <TextInput
            style={[
              styles.input,
              isDark ? styles.inputDark : styles.inputLight,
            ]}
            placeholder="Минимум 6 символов"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <TouchableOpacity
          style={[
            styles.primaryButton,
            isSubmitting && styles.primaryButtonDisabled,
          ]}
          onPress={onSubmit}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>
              {mode === 'signIn' ? 'Войти' : 'Зарегистрироваться'}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.switchMode}
          onPress={() => {
            setMode(mode === 'signIn' ? 'signUp' : 'signIn');
            setError(null);
          }}
        >
          <Text
            style={[
              styles.switchModeText,
              isDark && styles.switchModeTextDark,
            ]}
          >
            {mode === 'signIn'
              ? 'Нет аккаунта? Создать'
              : 'Уже есть аккаунт? Войти'}
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  containerDark: {
    backgroundColor: '#020617',
  },
  containerLight: {
    backgroundColor: '#E5F0FF',
  },
  brandBlock: {
    position: 'absolute',
    top: 80,
    left: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  logoEmoji: {
    fontSize: 22,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  brandTitleDark: {
    color: '#F3F4F6',
  },
  brandSubtitle: {
    fontSize: 12,
    color: '#4B5563',
  },
  brandSubtitleDark: {
    color: '#9CA3AF',
  },
  card: {
    width: '100%',
    maxWidth: 460,
    alignSelf: 'center',
    borderRadius: 28,
    padding: 22,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  cardDark: {
    backgroundColor: '#020617',
    borderColor: '#1F2937',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 6,
    color: '#111827',
  },
  cardTitleDark: {
    color: '#F9FAFB',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 16,
  },
  cardSubtitleDark: {
    color: '#9CA3AF',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 4,
  },
  labelDark: {
    color: '#9CA3AF',
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  inputDark: {
    backgroundColor: '#020617',
    borderColor: '#374151',
    color: '#F9FAFB',
  },
  inputLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
    color: '#111827',
  },
  errorText: {
    color: '#F97373',
    fontSize: 13,
    marginBottom: 8,
  },
  primaryButton: {
    marginTop: 4,
    borderRadius: 999,
    backgroundColor: '#4F46E5',
    paddingVertical: 12,
    alignItems: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#F9FAFB',
    fontSize: 16,
    fontWeight: '600',
  },
  switchMode: {
    marginTop: 14,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#6B7280',
  },
  switchModeTextDark: {
    color: '#9CA3AF',
  },
});