import React from 'react';
import { View, ScrollView, StyleSheet, Platform } from 'react-native';

interface Props {
  children: React.ReactNode;
}

export default function DashboardGrid({ children }: Props) {
  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.grid}>
        {children}
      </View>
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

interface CellProps {
  children: React.ReactNode;
  span?: 1 | 2;
}

export function GridCell({ children, span = 1 }: CellProps) {
  return (
    <View style={[styles.cell, span === 2 && styles.cellFull]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  cell: {
    minWidth: 320,
    flex: 1,
  },
  cellFull: {
    flexBasis: '100%',
    minWidth: '100%',
  },
});
