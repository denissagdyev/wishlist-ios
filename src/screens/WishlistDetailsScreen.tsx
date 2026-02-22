// src/screens/WishlistDetailsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Image,
  Share,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { RootStackParamList } from '../navigation/RootNavigator';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

// Базовый URL веб-приложения на Vercel
const WEB_BASE_URL =
  'https://wishlist-pbmyx1zmp-denis-projects-ae8d0e08.vercel.app';

type Props = NativeStackScreenProps<RootStackParamList, 'WishlistDetails'>;

type Item = {
  id: string;
  wishlist_id: string;
  name: string;
  url: string | null;
  price: number | null;
  image_url: string | null;
  created_at: string;
};

type Reservation = {
  id: string;
  item_id: string;
  reserver_name: string;
  created_at: string;
};

type Contribution = {
  id: string;
  item_id: string;
  contributor_name: string;
  amount: number;
  created_at: string;
};

const MIN_CONTRIBUTION = 100;
const GUEST_NAME_STORAGE_KEY = 'wishlist_guest_name';

const WishlistDetailsScreen: React.FC<Props> = ({ route }) => {
  const { wishlistId, title, ownerId, eventDate } = route.params;
  const { session } = useAuth();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  const isOwner = session?.user.id === ownerId;
  const currentUserEmail = session?.user.email ?? null;

  const [items, setItems] = useState<Item[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [contributions, setContributions] = useState<Contribution[]>([]);

  const [guestName, setGuestName] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Создание подарка
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createUrl, setCreateUrl] = useState('');
  const [createPrice, setCreatePrice] = useState('');
  const [createImageUrl, setCreateImageUrl] = useState('');
  const [createSaving, setCreateSaving] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Редактирование подарка
  const [editOpen, setEditOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editImageUrl, setEditImageUrl] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Вклад/скинуться
  const [contribOpen, setContribOpen] = useState(false);
  const [contribItemId, setContribItemId] = useState<string | null>(null);
  const [contribAmount, setContribAmount] = useState('');
  const [contribError, setContribError] = useState<string | null>(null);
  const [contribSaving, setContribSaving] = useState(false);

  // Публичная ссылка для шаринга
  const publicUrl = `${WEB_BASE_URL}/wishlist/${wishlistId}`;

  const handleShare = async () => {
    try {
      await Share.share({
        message: publicUrl,
      });
    } catch {
      Alert.alert('Ошибка', 'Не удалось открыть меню шаринга.');
    }
  };

  // Загрузка гостевого имени из AsyncStorage
  useEffect(() => {
    const loadGuestName = async () => {
      try {
        const stored = await AsyncStorage.getItem(GUEST_NAME_STORAGE_KEY);
        if (stored) {
          setGuestName(stored);
        }
      } catch {
        // ignore
      }
    };
    loadGuestName();
  }, []);

  const ensureGuestName = useCallback(async (): Promise<string | null> => {
    if (guestName) return guestName;

    return new Promise((resolve) => {
      Alert.prompt(
        'Как вас представить друзьям?',
        '',
        [
          {
            text: 'Отмена',
            style: 'cancel',
            onPress: () => resolve(null),
          },
          {
            text: 'OK',
            onPress: async (text: string | undefined) => {
              const trimmed = (text ?? '').trim();
              if (!trimmed) {
                resolve(null);
                return;
              }
              try {
                await AsyncStorage.setItem(GUEST_NAME_STORAGE_KEY, trimmed);
              } catch {
                // ignore
              }
              setGuestName(trimmed);
              resolve(trimmed);
            },
          },
        ],
        'plain-text'
      );
    });
  }, [guestName]);

  const loadAll = useCallback(
    async (id: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data: itemsData, error: itemsError } = await supabase
          .from('items')
          .select('id, wishlist_id, name, url, price, image_url, created_at')
          .eq('wishlist_id', id)
          .order('created_at', { ascending: false });

        if (itemsError) throw itemsError;

        const typedItems = (itemsData ?? []) as Item[];
        setItems(typedItems);

        const itemIds = typedItems.map((i) => i.id);

        if (itemIds.length === 0) {
          setReservations([]);
          setContributions([]);
        } else {
          const [
            { data: resData, error: resError },
            { data: contribData, error: contribError },
          ] = await Promise.all([
            supabase
              .from('reservations')
              .select('id, item_id, reserver_name, created_at')
              .in('item_id', itemIds),
            supabase
              .from('contributions')
              .select('id, item_id, contributor_name, amount, created_at')
              .in('item_id', itemIds),
          ]);

          if (resError || contribError) {
            throw resError || contribError;
          }

          setReservations((resData ?? []) as Reservation[]);
          setContributions((contribData ?? []) as Contribution[]);
        }
      } catch (e: any) {
        console.error('Error loading wishlist details', e);
        setError(
          e.message || 'Не удалось загрузить подарки. Попробуйте позже.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  // Первичная загрузка
  useEffect(() => {
    loadAll(wishlistId);
  }, [loadAll, wishlistId]);

  // Realtime‑подписки
  useEffect(() => {
    const channel = supabase
      .channel(`wishlist-${wishlistId}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'reservations' },
        (payload: any) => {
          const newRecord = payload.new as Reservation | null;
          const oldRecord = payload.old as Reservation | null;

          if (payload.eventType === 'INSERT' && newRecord) {
            setReservations((prev) => {
              if (prev.some((r) => r.id === newRecord.id)) return prev;
              return [...prev, newRecord];
            });
          }

          if (payload.eventType === 'DELETE' && oldRecord) {
            setReservations((prev) =>
              prev.filter((r) => r.id !== oldRecord.id)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'contributions' },
        (payload: any) => {
          const newRecord = payload.new as Contribution | null;
          const oldRecord = payload.old as Contribution | null;

          if (payload.eventType === 'INSERT' && newRecord) {
            setContributions((prev) => {
              if (prev.some((c) => c.id === newRecord.id)) return prev;
              return [...prev, newRecord];
            });
          }

          if (payload.eventType === 'DELETE' && oldRecord) {
            setContributions((prev) =>
              prev.filter((c) => c.id !== oldRecord.id)
            );
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        (payload: any) => {
          const newItem = payload.new as Item | null;
          const oldItem = payload.old as Item | null;

          if (payload.eventType === 'INSERT' && newItem) {
            if (newItem.wishlist_id !== wishlistId) return;
            setItems((prev) => {
              if (prev.some((i) => i.id === newItem.id)) return prev;
              return [newItem, ...prev].sort(
                (a, b) =>
                  new Date(b.created_at).getTime() -
                  new Date(a.created_at).getTime()
              );
            });
          }

          if (payload.eventType === 'UPDATE' && newItem) {
            if (newItem.wishlist_id !== wishlistId) return;
            setItems((prev) =>
              prev.map((i) => (i.id === newItem.id ? { ...i, ...newItem } : i))
            );
          }

          if (payload.eventType === 'DELETE' && oldItem) {
            const deletedId = oldItem.id;
            setItems((prev) => prev.filter((i) => i.id !== deletedId));
            setReservations((prev) =>
              prev.filter((r) => r.item_id !== deletedId)
            );
            setContributions((prev) =>
              prev.filter((c) => c.item_id !== deletedId)
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [wishlistId]);

  const eventDateLabel = eventDate
    ? new Date(eventDate).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })
    : null;

  // --- Создание подарка ---

  const handleCreateItem = async () => {
    setCreateError(null);

    if (!createName.trim()) {
      setCreateError('Пожалуйста, введите название подарка.');
      return;
    }

    let priceNumber: number | null = null;
    if (createPrice.trim()) {
      const normalized = createPrice.replace(',', '.').trim();
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        priceNumber = parsed;
      } else {
        setCreateError(
          'Некорректное значение цены. Введите число, например 1999.99.'
        );
        return;
      }
    }

    setCreateSaving(true);

    try {
      const { data, error } = await supabase
        .from('items')
        .insert({
          wishlist_id: wishlistId,
          name: createName.trim(),
          url: createUrl.trim() || null,
          price: priceNumber,
          image_url: createImageUrl.trim() || null,
        })
        .select('id, wishlist_id, name, url, price, image_url, created_at')
        .single();

      if (error) {
        console.error(error);
        setCreateError('Не удалось добавить подарок. Попробуйте ещё раз.');
        return;
      }

      const inserted = data as Item;
      setItems((prev) => {
        if (prev.some((i) => i.id === inserted.id)) return prev;
        return [inserted, ...prev].sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
        );
      });

      setCreateName('');
      setCreateUrl('');
      setCreatePrice('');
      setCreateImageUrl('');
      setCreateOpen(false);
    } catch (err) {
      console.error(err);
      setCreateError('Что-то пошло не так. Попробуйте ещё раз позже.');
    } finally {
      setCreateSaving(false);
    }
  };

  // --- Редактирование подарка ---

  const openEditDialog = (item: Item) => {
    setEditError(null);
    setEditItemId(item.id);
    setEditName(item.name ?? '');
    setEditUrl(item.url ?? '');
    setEditPrice(item.price == null ? '' : String(item.price));
    setEditImageUrl(item.image_url ?? '');
    setEditOpen(true);
  };

  const handleUpdateItem = async () => {
    setEditError(null);

    if (!editItemId) return;

    if (!editName.trim()) {
      setEditError('Пожалуйста, введите название подарка.');
      return;
    }

    let priceNumber: number | null = null;
    if (editPrice.trim()) {
      const normalized = editPrice.replace(',', '.').trim();
      const parsed = Number(normalized);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        priceNumber = parsed;
      } else {
        setEditError(
          'Некорректное значение цены. Введите число, например 1999.99.'
        );
        return;
      }
    }

    setEditSaving(true);

    try {
      const { data, error } = await supabase
        .from('items')
        .update({
          name: editName.trim(),
          url: editUrl.trim() || null,
          price: priceNumber,
          image_url: editImageUrl.trim() || null,
        })
        .eq('id', editItemId)
        .select('id, wishlist_id, name, url, price, image_url, created_at')
        .single();

      if (error) {
        console.error(error);
        setEditError('Не удалось сохранить изменения. Попробуйте ещё раз.');
        return;
      }

      const updated = data as Item;
      setItems((prev) =>
        prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
      );

      setEditOpen(false);
      setEditItemId(null);
    } catch (err) {
      console.error(err);
      setEditError('Что-то пошло не так. Попробуйте ещё раз позже.');
    } finally {
      setEditSaving(false);
    }
  };

  // --- Удаление подарка ---

  const handleDeleteItem = (item: Item) => {
    if (!isOwner) return;

    const itemHasActivity =
      reservations.some((r) => r.item_id === item.id) ||
      contributions.some((c) => c.item_id === item.id);

    const message = itemHasActivity
      ? 'По этому подарку уже есть резервы или вклады. При удалении все связанные данные тоже будут удалены. Точно удалить подарок?'
      : 'Точно удалить подарок?';

    Alert.alert('Удалить подарок', message, [
      { text: 'Отмена', style: 'cancel' },
      {
        text: 'Удалить',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase
            .from('items')
            .delete()
            .eq('id', item.id);

          if (error) {
            console.error(error);
            Alert.alert(
              'Ошибка',
              'Не удалось удалить подарок. Попробуйте ещё раз.'
            );
            return;
          }

          setItems((prev) => prev.filter((i) => i.id !== item.id));
          setReservations((prev) =>
            prev.filter((r) => r.item_id !== item.id)
          );
          setContributions((prev) =>
            prev.filter((c) => c.item_id !== item.id)
          );
        },
      },
    ]);
  };

  // --- Резерв / снятие резерва ---

  const handleReserve = async (itemId: string) => {
    if (isOwner) return;

    const existing = reservations.find((r) => r.item_id === itemId);
    if (existing && existing.reserver_name !== guestName) {
      Alert.alert(
        'Уже занято',
        'Этот подарок уже кто-то взял, выберите другой.'
      );
      return;
    }

    const name = await ensureGuestName();
    if (!name) return;

    if (existing && existing.reserver_name === name) {
      return;
    }

    const { data, error } = await supabase
      .from('reservations')
      .insert({
        item_id: itemId,
        reserver_name: name,
      })
      .select('id, item_id, reserver_name, created_at')
      .single();

    if (error) {
      console.error(error);
      Alert.alert(
        'Ошибка',
        'Не удалось зарезервировать подарок. Попробуйте ещё раз.'
      );
      return;
    }

    setReservations((prev) => [...prev, data as Reservation]);
  };

  const handleUnreserve = async (itemId: string) => {
    if (isOwner || !guestName) return;

    const existing = reservations.find(
      (r) => r.item_id === itemId && r.reserver_name === guestName
    );
    if (!existing) return;

    const { error } = await supabase
      .from('reservations')
      .delete()
      .eq('id', existing.id);

    if (error) {
      console.error(error);
      Alert.alert(
        'Ошибка',
        'Не удалось снять резерв. Попробуйте ещё раз.'
      );
      return;
    }

    setReservations((prev) => prev.filter((r) => r.id !== existing.id));
  };

  // --- Вклады ---

  const openContributionDialog = (itemId: string) => {
    setContribItemId(itemId);
    setContribAmount('');
    setContribError(null);
    setContribOpen(true);
  };

  const handleCreateContribution = async () => {
    setContribError(null);

    if (!contribItemId) return;

    const name = await ensureGuestName();
    if (!name) return;

    const normalized = contribAmount.replace(',', '.').trim();
    const parsed = Number(normalized);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setContribError('Введите корректную сумму вклада.');
      return;
    }

    const item = items.find((i) => i.id === contribItemId) ?? null;
    if (!item || !item.price || item.price <= 0) {
      setContribError('Для этого подарка нельзя сделать вклад.');
      return;
    }

    const itemReservations = reservations.filter(
      (r) => r.item_id === contribItemId
    );
    if (itemReservations.length > 0) {
      setContribError(
        'Этот подарок полностью зарезервирован. Вклады больше не принимаются.'
      );
      return;
    }

    const sumContributions = contributions
      .filter((c) => c.item_id === contribItemId)
      .reduce((sum, c) => sum + (c.amount ?? 0), 0);

    const remaining = item.price - sumContributions;
    if (remaining <= 0) {
      setContribError('Сбор уже завершён. Вклады больше не принимаются.');
      return;
    }

    if (parsed > remaining) {
      setContribError(
        `Нельзя внести больше, чем осталось. Максимальная сумма: ${remaining.toLocaleString(
          'ru-RU',
          { style: 'currency', currency: 'RUB', maximumFractionDigits: 2 }
        )}`
      );
      return;
    }

    if (parsed < MIN_CONTRIBUTION) {
      setContribError(
        `Минимальный вклад — ${MIN_CONTRIBUTION.toLocaleString('ru-RU')} ₽.`
      );
      return;
    }

    setContribSaving(true);

    try {
      const { data, error } = await supabase
        .from('contributions')
        .insert({
          item_id: contribItemId,
          contributor_name: name,
          amount: parsed,
        })
        .select('id, item_id, contributor_name, amount, created_at')
        .single();

      if (error) {
        console.error(error);
        setContribError('Не удалось добавить вклад. Попробуйте ещё раз.');
        return;
      }

      setContributions((prev) => [...prev, data as Contribution]);
      setContribOpen(false);
      setContribAmount('');
    } catch (err) {
      console.error(err);
      setContribError('Что-то пошло не так. Попробуйте ещё раз позже.');
    } finally {
      setContribSaving(false);
    }
  };

  // --- Рендер карточки подарка ---

  const renderItemCard = (item: Item) => {
    const hasPrice =
      typeof item.price === 'number' && !Number.isNaN(item.price);

    const itemReservations = reservations.filter((r) => r.item_id === item.id);
    const fullyReserved = itemReservations.length > 0;
    const reservedByCurrentGuest =
      !!guestName &&
      itemReservations.some((r) => r.reserver_name === guestName);

    const itemContributions = contributions.filter(
      (c) => c.item_id === item.id
    );
    const totalContributions = itemContributions.reduce(
      (sum, c) => sum + (c.amount ?? 0),
      0
    );
    const isPricedValid = hasPrice && item.price != null && item.price > 0;
    const progress = isPricedValid
      ? Math.min(1, totalContributions / (item.price as number))
      : 0;

    const isFullyFunded =
      isPricedValid && totalContributions >= (item.price as number);
    const hasAnyContributions = itemContributions.length > 0;
    const isCollecting =
      isPricedValid && hasAnyContributions && !isFullyFunded;
    const isFree = !fullyReserved && !hasAnyContributions;

    let statusText: string;
    if (fullyReserved) {
      statusText = isOwner
        ? 'Подарок зарезервирован.'
        : reservedByCurrentGuest
        ? 'Вы зарезервировали этот подарок.'
        : 'Подарок полностью зарезервирован.';
    } else if (isFullyFunded) {
      statusText = isOwner
        ? 'Сбор по этому подарку завершён.'
        : 'Сбор по этому подарку завершён — выберите другой.';
    } else if (isCollecting) {
      statusText = 'По этому подарку идёт сбор.';
    } else {
      statusText = 'Подарок пока свободен.';
    }

    const canReserve = !isOwner && isFree && !isFullyFunded;
    const canContribute =
      !isOwner && isPricedValid && !isFullyFunded && !fullyReserved;

    return (
      <View key={item.id} style={styles.itemCard}>
        {item.image_url && (
          <View style={styles.itemImageWrapper}>
            <Image
              source={{ uri: item.image_url }}
              style={styles.itemImage}
              resizeMode="cover"
            />
          </View>
        )}

        <View style={styles.itemHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.itemTitle} numberOfLines={2}>
              {item.name}
            </Text>
            {hasPrice && (
              <Text style={styles.itemPrice}>
                {item.price!.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  maximumFractionDigits: 2,
                })}
              </Text>
            )}
          </View>
          {isOwner && (
            <View style={styles.itemOwnerActions}>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => openEditDialog(item)}
              >
                <Text style={styles.smallButtonText}>Редакт.</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.smallButton}
                onPress={() => handleDeleteItem(item)}
              >
                <Text style={styles.smallButtonText}>Удалить</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {item.url && (
          <TouchableOpacity
            onPress={() => {
              if (item.url) {
                Linking.openURL(item.url).catch(() => {
                  Alert.alert(
                    'Ошибка',
                    'Не удалось открыть ссылку. Попробуйте позже.'
                  );
                });
              }
            }}
          >
            <Text style={styles.itemLink} numberOfLines={1}>
              Открыть ссылку на подарок
            </Text>
          </TouchableOpacity>
        )}

        {/* Статус и резервы */}
        <View style={styles.itemStatusRow}>
          <Text style={styles.itemStatusText}>{statusText}</Text>
          {!isOwner && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {canReserve ? (
                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => handleReserve(item.id)}
                >
                  <Text style={styles.chipButtonText}>Зарезервировать</Text>
                </TouchableOpacity>
              ) : fullyReserved && reservedByCurrentGuest ? (
                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => handleUnreserve(item.id)}
                >
                  <Text style={styles.chipButtonText}>Снять резерв</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        </View>

        {/* Вклады и прогресс */}
        {isPricedValid && (
  <View style={styles.itemProgressBlock}>
    <View style={styles.progressBar}>
      <View
        style={[
          styles.progressFill,
          { width: `${progress * 100}%` },
        ]}
      />
    </View>
    <View style={styles.progressFooter}>
              <Text style={styles.progressText}>
                Собрано{' '}
                {totalContributions.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  maximumFractionDigits: 2,
                })}{' '}
                из{' '}
                {item.price!.toLocaleString('ru-RU', {
                  style: 'currency',
                  currency: 'RUB',
                  maximumFractionDigits: 2,
                })}
              </Text>
              {canContribute && (
                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => openContributionDialog(item.id)}
                >
                  <Text style={styles.chipButtonText}>Скинуться</Text>
                </TouchableOpacity>
              )}
            </View>

            {!isOwner && itemContributions.length > 0 && (
              <View style={styles.contributorsList}>
                {itemContributions.map((c) => (
                  <View key={c.id} style={styles.contributorRow}>
                    <Text style={styles.contributorName} numberOfLines={1}>
                      {c.contributor_name || 'Гость'}
                    </Text>
                    <Text style={styles.contributorAmount}>
                      {c.amount.toLocaleString('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        maximumFractionDigits: 2,
                      })}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.itemCreatedAt}>
          Добавлен{' '}
          {new Date(item.created_at).toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
    );
  };

  if (isLoading && items.length === 0) {
    return (
      <View
        style={[
          styles.loadingScreen,
          !isDark && { backgroundColor: '#E5F0FF' },
        ]}
      >
        <ActivityIndicator size="large" color="#6366F1" />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        !isDark && { backgroundColor: '#E5F0FF' },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Верхний блок "Social Wishlist" */}
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            <View style={styles.logoCircle}>
              <Text style={styles.logoEmoji}>🎁</Text>
            </View>
            <View>
              <Text
                style={[
                  styles.brandTitle,
                  !isDark && { color: '#111827' },
                ]}
              >
                Social Wishlist
              </Text>
              <Text
                style={[
                  styles.brandSubtitle,
                  !isDark && { color: '#4B5563' },
                ]}
              >
                {isOwner
                  ? 'Ваш список желаний'
                  : 'Публичный вишлист для друзей'}
              </Text>
            </View>
          </View>

          {isOwner ? (
            <View style={styles.ownerInfo}>
              <Text style={styles.ownerEmail} numberOfLines={1}>
                {currentUserEmail || 'Пользователь'}
              </Text>
              <Text style={styles.ownerRole}>Владелец вишлиста</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.infoCard}>
  <View style={styles.infoCardHeader}>
    <View>
      <Text style={styles.infoCardTitle}>{title}</Text>
      {eventDateLabel && (
        <Text style={styles.infoCardSubtitle}>
          Событие: {eventDateLabel}
        </Text>
      )}
    </View>

    <View
      style={[
        styles.roleChip,
        isOwner ? styles.roleChipOwner : styles.roleChipGuest,
      ]}
    >
      <Text style={styles.roleChipText}>
        {isOwner ? 'Ваш вишлист' : 'Гостевой доступ'}
      </Text>
    </View>
  </View>

  <View
    style={[
      styles.infoHint,
      isOwner ? styles.infoHintOwner : styles.infoHintGuest,
    ]}
  >
    <Text style={styles.infoHintTitle}>
      {isOwner ? 'Сюрприз сохранён' : 'Для друзей'}
    </Text>
    <Text style={styles.infoHintText}>
      {isOwner
        ? 'Резервы и вклады скрыты от вас, чтобы не испортить впечатление от подарков.'
        : 'Владелец не видит, кто что зарезервировал и сколько внёс — можно спокойно скидываться.'}
    </Text>
  </View>

  <Text style={styles.infoCardDescription}>
    Делитесь этим списком с друзьями, чтобы они могли выбрать подарок
    и при необходимости скинуться на дорогие позиции.
  </Text>
</View>

        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              !isDark && { color: '#111827' },
            ]}
          >
            Подарки в этом вишлисте
          </Text>
          <View style={styles.sectionActions}>
            {isOwner && (
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setCreateError(null);
                  setCreateOpen(true);
                }}
              >
                <Text style={styles.primaryButtonText}>Добавить подарок</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.secondaryButton} onPress={handleShare}>
              <Text style={styles.secondaryButtonText}>Поделиться</Text>
            </TouchableOpacity>
          </View>
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {!isLoading && items.length === 0 && !error && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyCardRow}>
              <Text style={styles.emptyEmoji}>✨</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.emptyTitle}>
                  В этом вишлисте пока нет подарков.
                </Text>
                <Text style={styles.emptySubtitle}>
                  Начните с того, что давно хотели, но не покупали себе сами —
                  это поможет друзьям с идеями.
                </Text>
              </View>
            </View>
          </View>
        )}

        {isLoading && (
          <View style={{ marginTop: 12 }}>
            <ActivityIndicator size="small" color="#6366F1" />
          </View>
        )}

        <View style={styles.itemsGrid}>{items.map(renderItemCard)}</View>
      </ScrollView>

      {/* Модалка создания подарка */}
      <Modal
        visible={createOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCreateOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Новый подарок</Text>
            <Text style={styles.modalSubtitle}>
              Добавьте подарок в этот вишлист. Название обязательно, остальные
              поля можно заполнить позже.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Название подарка"
              placeholderTextColor="#6B7280"
              value={createName}
              onChangeText={setCreateName}
            />
            <TextInput
              style={styles.input}
              placeholder="Ссылка на товар (https://...)"
              placeholderTextColor="#6B7280"
              value={createUrl}
              onChangeText={setCreateUrl}
            />
            <TextInput
              style={styles.input}
              placeholder="Цена (например, 1999.99)"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              value={createPrice}
              onChangeText={setCreatePrice}
            />
            <TextInput
              style={styles.input}
              placeholder="Ссылка на картинку (https://...)"
              placeholderTextColor="#6B7280"
              value={createImageUrl}
              onChangeText={setCreateImageUrl}
            />

            {createError && (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>
                {createError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setCreateOpen(false);
                  setCreateError(null);
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateItem}
                disabled={createSaving}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {createSaving ? 'Добавляем...' : 'Добавить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка редактирования подарка */}
      <Modal
        visible={editOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setEditOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Редактировать подарок</Text>
            <Text style={styles.modalSubtitle}>
              Обновите данные подарка. Изменения сразу отразятся в списке.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Название подарка"
              placeholderTextColor="#6B7280"
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              style={styles.input}
              placeholder="Ссылка на товар (https://...)"
              placeholderTextColor="#6B7280"
              value={editUrl}
              onChangeText={setEditUrl}
            />
            <TextInput
              style={styles.input}
              placeholder="Цена (например, 1999.99)"
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              value={editPrice}
              onChangeText={setEditPrice}
            />
            <TextInput
              style={styles.input}
              placeholder="Ссылка на картинку (https://...)"
              placeholderTextColor="#6B7280"
              value={editImageUrl}
              onChangeText={setEditImageUrl}
            />

            {editError && (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>
                {editError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setEditOpen(false);
                  setEditError(null);
                  setEditItemId(null);
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleUpdateItem}
                disabled={editSaving}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {editSaving ? 'Сохраняем...' : 'Сохранить'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Модалка "Скинуться" */}
      <Modal
        visible={contribOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setContribOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Скинуться на подарок</Text>
            <Text style={styles.modalSubtitle}>
              Введите сумму, на которую хотите поучаствовать. Минимальный
              вклад — {MIN_CONTRIBUTION.toLocaleString('ru-RU')} ₽.
            </Text>

            <TextInput
              style={styles.input}
              placeholder={MIN_CONTRIBUTION.toString()}
              placeholderTextColor="#6B7280"
              keyboardType="decimal-pad"
              value={contribAmount}
              onChangeText={setContribAmount}
            />

            {contribError && (
              <Text style={[styles.errorText, { marginBottom: 8 }]}>
                {contribError}
              </Text>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonSecondary]}
                onPress={() => {
                  setContribOpen(false);
                  setContribError(null);
                  setContribItemId(null);
                }}
              >
                <Text style={styles.modalButtonSecondaryText}>Отмена</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonPrimary]}
                onPress={handleCreateContribution}
                disabled={contribSaving}
              >
                <Text style={styles.modalButtonPrimaryText}>
                  {contribSaving ? 'Отправляем...' : 'Отправить вклад'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default WishlistDetailsScreen;

const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#020617',
    },
    loadingScreen: {
      flex: 1,
      backgroundColor: '#020617',
      alignItems: 'center',
      justifyContent: 'center',
    },
    scrollContent: {
      paddingHorizontal: 16,
      paddingBottom: 32,
    },
    headerRow: {
      marginTop: 16,
      marginBottom: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    brandRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoCircle: {
      width: 38,
      height: 38,
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
      fontSize: 20,
    },
    brandTitle: {
      fontSize: 17,
      fontWeight: '700',
      color: '#F9FAFB',
    },
    brandSubtitle: {
      fontSize: 11,
      color: '#9CA3AF',
    },
    ownerInfo: {
      alignItems: 'flex-end',
      maxWidth: '50%',
    },
    ownerEmail: {
      fontSize: 13,
      fontWeight: '500',
      color: '#E5E7EB',
    },
    ownerRole: {
      fontSize: 11,
      color: '#9CA3AF',
    },
    infoCard: {
      borderRadius: 24,
      backgroundColor: 'rgba(249,250,251,0.92)',
      borderWidth: 1,
      borderColor: 'rgba(229,231,235,0.9)',
      padding: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    infoCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      marginBottom: 6,
    },
    infoCardTitle: {
      fontSize: 20,
      fontWeight: '600',
      color: '#111827',
    },
    infoCardSubtitle: {
      fontSize: 13,
      color: '#4B5563',
      marginTop: 4,
    },
    
    roleChip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 999,
        borderWidth: 1,
      },
      roleChipOwner: {
        borderColor: 'rgba(79,70,229,0.4)',
        backgroundColor: 'rgba(79,70,229,0.08)',
      },
      roleChipGuest: {
        borderColor: 'rgba(14,116,144,0.4)',
        backgroundColor: 'rgba(8,145,178,0.08)',
      },
      roleChipText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#111827',
      },
      infoHint: {
        marginTop: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
      },
      infoHintOwner: {
        borderColor: 'rgba(79,70,229,0.25)',
        backgroundColor: 'rgba(79,70,229,0.06)',
      },
      infoHintGuest: {
        borderColor: 'rgba(8,145,178,0.25)',
        backgroundColor: 'rgba(56,189,248,0.06)',
      },
      infoHintTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#111827',
        marginBottom: 2,
      },
      infoHintText: {
        fontSize: 12,
        color: '#4B5563',
      },
      
    infoCardDescription: {
      fontSize: 13,
      color: '#4B5563',
      marginTop: 4,
    },
    sectionHeader: {
      marginTop: 8,
      marginBottom: 6,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: '#F9FAFB',
      marginBottom: 6,
    },
    sectionActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    primaryButton: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: '#4F46E5',
    },
    primaryButtonText: {
      color: '#F9FAFB',
      fontSize: 13,
      fontWeight: '600',
    },
    secondaryButton: {
      borderRadius: 999,
      paddingHorizontal: 14,
      paddingVertical: 8,
      backgroundColor: '#ECFEFF',
      borderWidth: 0,
    },
    secondaryButtonText: {
      color: '#0369A1',
      fontSize: 13,
      fontWeight: '600',
    },
    errorBox: {
      marginTop: 8,
      padding: 8,
      borderRadius: 8,
      backgroundColor: '#451A1A',
    },
    errorText: {
      color: '#FCA5A5',
      fontSize: 13,
    },
    emptyCard: {
      marginTop: 12,
      borderRadius: 20,
      backgroundColor: 'rgba(249,250,251,0.9)',
      borderWidth: 1,
      borderColor: 'rgba(229,231,235,0.9)',
      padding: 16,
    },
    emptyCardRow: {
      flexDirection: 'row',
      gap: 12,
    },
    emptyEmoji: {
      fontSize: 24,
    },
    emptyTitle: {
      fontSize: 15,
      fontWeight: '500',
      color: '#111827',
    },
    emptySubtitle: {
      fontSize: 13,
      color: '#4B5563',
      marginTop: 2,
    },
    itemsGrid: {
      marginTop: 12,
      flexDirection: 'column',
      gap: 12,
    },
    itemCard: {
      borderRadius: 20,
      backgroundColor: 'rgba(249,250,251,0.96)',
      borderWidth: 1,
      borderColor: 'rgba(229,231,235,0.9)',
      paddingBottom: 12,
      overflow: 'hidden',
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    itemImageWrapper: {
      height: 160,
      width: '100%',
      overflow: 'hidden',
    },
    itemImage: {
      width: '100%',
      height: '100%',
    },
    itemHeader: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingTop: 10,
      alignItems: 'flex-start',
      gap: 8,
    },
    itemTitle: {
      fontSize: 15,
      fontWeight: '600',
      color: '#111827',
    },
    itemPrice: {
      marginTop: 4,
      fontSize: 13,
      fontWeight: '500',
      color: '#4C1D95',
    },
    itemOwnerActions: {
      flexDirection: 'row',
      gap: 6,
    },
    smallButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      paddingHorizontal: 8,
      paddingVertical: 4,
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    smallButtonText: {
      fontSize: 11,
      color: '#111827',
    },
    itemLink: {
      marginTop: 4,
      paddingHorizontal: 12,
      fontSize: 12,
      color: '#4C1D95',
      textDecorationLine: 'underline',
    },
    itemStatusRow: {
      marginTop: 8,
      paddingHorizontal: 12,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    itemStatusText: {
      flex: 1,
      fontSize: 12,
      color: '#6B7280',
      marginRight: 8,
    },
    chipButton: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: '#D1D5DB',
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: 'rgba(255,255,255,0.95)',
    },
    chipButtonText: {
      fontSize: 11,
      color: '#111827',
    },
    itemProgressBlock: {
      marginTop: 8,
      paddingHorizontal: 12,
    },
    progressBar: {
      height: 8,
      borderRadius: 999,
      backgroundColor: '#E5E7EB',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: '#6366F1',
    },
    progressFooter: {
      marginTop: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressText: {
      flex: 1,
      fontSize: 11,
      color: '#6B7280',
      marginRight: 8,
    },
    contributorsList: {
      marginTop: 4,
      maxHeight: 80,
    },
    contributorRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    contributorName: {
      flex: 1,
      fontSize: 11,
      color: '#6B7280',
    },
    contributorAmount: {
      fontSize: 11,
      color: '#4B5563',
      marginLeft: 8,
    },
    itemCreatedAt: {
      marginTop: 8,
      paddingHorizontal: 12,
      fontSize: 11,
      color: '#9CA3AF',
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
      marginBottom: 8,
    },
    modalSubtitle: {
      fontSize: 13,
      color: '#9CA3AF',
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