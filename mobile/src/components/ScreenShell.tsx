import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ScrollViewProps } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ParticleBackground from './ParticleBackground';

interface Props {
  title: string;
  children: React.ReactNode;
  scrollProps?: ScrollViewProps;
  rightAction?: React.ReactNode;
  noPadding?: boolean;
}

export default function ScreenShell({ title, children, scrollProps, rightAction, noPadding }: Props) {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <ParticleBackground />
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{title}</Text>
        {rightAction || <View style={styles.backBtn} />}
      </View>
      <ScrollView
        contentContainerStyle={[styles.scroll, noPadding && styles.noPadding]}
        showsVerticalScrollIndicator={false}
        {...scrollProps}
      >
        {children}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a1a' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 56, paddingBottom: 8 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  backArrow: { fontSize: 28, color: '#6C5CE7', fontWeight: '300' },
  header: { flex: 1, fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center' },
  scroll: { paddingHorizontal: 18, paddingTop: 8 },
  noPadding: { paddingHorizontal: 0, paddingTop: 0 },
});
