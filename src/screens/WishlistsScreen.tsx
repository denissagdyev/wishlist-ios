// src/screens/WishlistsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Modal,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { supabase } from '../lib/supabase';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

type Props = NativeStackScreenProps<RootStackParamList, 'Wishlists'>;

type Wishlist = {
  id: string;
  owner_id: string;
  title: string;
  event_date: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string | null;
};

const WishlistsScreen: React.FC<Props> = ({ navigation }) => {
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [error, setError] = useState<string | null>(null);

  const userId = session?.user.id;

  const fetchWishlists = async () => {
    if (!userId) return;
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('wishlists')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false });

      if (supabaseError) throw supabaseError;
      setWishlists((data as Wishlist[]) ?? []);
    } catch (e: any) {
      console.error('Error fetching wishlists', e);
      setError(e.message || 'Не удалось загрузить вишлисты');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlists();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const onCreateWishlist = async () => {
    if (!userId) return;
    if (!newTitle.trim()) {
      setError('Введите название списка');
      return;
    }

    setError(null);

    try {
      const { data, error: supabaseError } = await supabase
        .from('wishlists')
        .insert({
          title: newTitle.trim(),
          owner_id: userId,
        })
        .select('*')
        .single();

      if (supabaseError) throw supabaseError;

      setWishlists((prev) => [data as Wishlist, ...prev]);
      setNewTitle('');
      setIsCreating(false);
    } catch (e: any) {
      console.error('Error creating wishlist', e);
      setError(e.message || 'Не удалось создать список');
    }
  };

  const formatEventDate = (eventDate: string | null) => {
    if (!eventDate) return 'Без даты';
    try {
      return new Date(eventDate).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return 'Без даты';
    }
  };

  const renderItem = ({ item }: { item: Wishlist }) => (
    <TouchableOpacity
      style={[
        styles.card,
        !isDark && styles.cardLight,
      ]}
      onPress={() =>
        navigation.navigate('WishlistDetails', {
          wishlistId: item.id,
          title: item.title,
          ownerId: item.owner_id,
          eventDate: item.event_date,
          isPublic: item.is_public,
        })
      }
    >
      <View style={styles.cardHeader}>
        <Text
          style={[
            styles.cardTitle,
            !isDark && styles.cardTitleLight,
          ]}
          numberOfLines={1}
        >
          {item.title}
        </Text>
        <Text style={styles.cardDate}>{formatEventDate(item.event_date)}</Text>
      </View>
      <View style={styles.cardFooter}>
        <View
          style={[
            styles.badge,
            item.is_public
              ? isDark
                ? styles.badgePublic
                : styles.badgePublicLight
              : styles.badgePrivate,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              item.is_public
                ? isDark
                  ? styles.badgeTextPublic
                  : styles.badgeTextPublicLight
                : styles.badgeTextPrivate,
            ]}
          >
            {item.is_public ? 'Публичный' : 'Приватный'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View
      style={[
        styles.container,
        !isDark && styles.containerLight,
      ]}
    >
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#6366F1" />
        </View>
      ) : (
        <>
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {wishlists.length === 0 ? (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyTitle,
                  !isDark && styles.emptyTitleLight,
                ]}
              >
                У тебя ещё нет вишлистов
              </Text>
              <Text
                style={[
                  styles.emptySubtitle,
                  !isDark && styles.emptySubtitleLight,
                ]}
              >
                Создай первый список, чтобы собрать идеи для подарков
              </Text>
            </View>
          ) : (
            <FlatList
              data={wishlists}
              keyExtractor={(item) => item.id}
              renderItem={renderItem}
              contentContainerStyle={styles.listContent}
            />
          )}

          <TouchableOpacity
            style={styles.fab}
            onPress={() => {
              setError(null);
              setIsCreating(true);
            }}
          >
            <Text style={styles.fabText}>＋</Text>
          </TouchableOpacity>

          <Modal
            visible={isCreating}
            animationType="slide"
            transparent
            onRequestClose={() => setIsCreating(false)}
          >
            <View style={styles.modalBackdrop}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Новый вишлист</Text>

                <TextInput
                  style={styles.input}
                  placeholder="Название"
                  placeholderTextColor="#6B7280"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />

                {error && (
                  <Text style={[styles.errorText, { marginBottom: 8 }]}>
                    {error}
                  </Text>
                )}

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSecondary]}
                    onPress={() => {
                      setIsCreating(false);
                      setError(null);
                      setNewTitle('');
                    }}
                  >
                    <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonPrimary]}
                    onPress={onCreateWishlist}
                  >
                    <Text style={styles.modalButtonPrimaryText}>Создать</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
};

export default WishlistsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  containerLight: {
    backgroundColor: '#E5F0FF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#020617',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  cardLight: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  cardTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#F9FAFB',
  },
  cardTitleLight: {
    color: '#111827',
  },
  cardDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  cardFooter: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgePublic: {
    borderColor: '#4ADE80',
    backgroundColor: 'rgba(34,197,94,0.1)',
  },
  badgePublicLight: {
    borderColor: '#16A34A',
    backgroundColor: 'rgba(22,163,74,0.08)',
  },
  badgePrivate: {
    borderColor: '#6B7280',
    backgroundColor: 'rgba(75,85,99,0.15)',
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  badgeTextPublic: {
    color: '#BBF7D0',
  },
  badgeTextPublicLight: {
    color: '#15803D',
  },
  badgeTextPrivate: {
    color: '#D1D5DB',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyTitleLight: {
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  emptySubtitleLight: {
    color: '#4B5563',
  },
  errorBox: {
    marginHorizontal: 16,
    marginTop: 12,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#451A1A',
  },
  errorText: {
    color: '#FCA5A5',
    fontSize: 13,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: {
    color: '#F9FAFB',
    fontSize: 28,
    lineHeight: 28,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.8)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    backgroundColor: '#020617',
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1F2937',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#F9FAFB',
    marginBottom: 12,
  },
  input: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#F9FAFB',
    fontSize: 15,
    marginBottom: 10,
    backgroundColor: '#020617',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
    gap: 8,
  },
  modalButton: {
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalButtonSecondaryText: {
    color: '#E5E7EB',
    fontSize: 14,
  },
  modalButtonPrimary: {
    backgroundColor: '#4F46E5',
  },
  modalButtonPrimaryText: {
    color: '#F9FAFB',
    fontSize: 14,
    fontWeight: '600',
  },
});