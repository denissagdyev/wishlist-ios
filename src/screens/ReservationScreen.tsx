// src/screens/ReservationScreen.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/RootNavigator';

type Props = NativeStackScreenProps<RootStackParamList, 'Reservation'>;

const ReservationScreen: React.FC<Props> = ({ route }) => {
  const { itemId } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Резерв для товара {itemId}</Text>
    </View>
  );
};

export default ReservationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#F9FAFB',
  },
});