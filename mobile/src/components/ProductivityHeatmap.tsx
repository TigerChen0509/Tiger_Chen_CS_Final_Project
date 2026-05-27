import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Props {
  data: number[][]; // 7 rows (days) x 24 cols (hours)
  dayLabels?: string[];
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOUR_LABELS = ['6a', '9a', '12p', '3p', '6p', '9p'];

function getIntensityColor(value: number, max: number): string {
  if (value === 0) return 'rgba(255,255,255,0.03)';
  const ratio = Math.min(value / Math.max(max, 1), 1);
  if (ratio < 0.25) return 'rgba(108,92,231,0.15)';
  if (ratio < 0.5) return 'rgba(108,92,231,0.3)';
  if (ratio < 0.75) return 'rgba(108,92,231,0.55)';
  return '#6C5CE7';
}

export default function ProductivityHeatmap({ data, dayLabels = DAY_LABELS }: Props) {
  const maxVal = Math.max(...data.flat(), 1);

  // Show every 3rd hour label for readability
  const visibleHours = [0, 3, 6, 9, 12, 15, 18, 21];

  return (
    <View style={styles.container}>
      {/* Hour labels */}
      <View style={styles.hourRow}>
        <View style={styles.dayLabelSpace} />
        {visibleHours.map((h) => (
          <Text key={h} style={styles.hourLabel}>
            {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : h < 24 ? `${h - 12}p` : ''}
          </Text>
        ))}
      </View>

      {/* Grid */}
      {data.map((row, dayIdx) => (
        <View key={dayIdx} style={styles.dayRow}>
          <Text style={styles.dayLabel}>{dayLabels[dayIdx]}</Text>
          <View style={styles.cellsRow}>
            {row.map((val, hourIdx) => (
              <View
                key={hourIdx}
                style={[
                  styles.cell,
                  { backgroundColor: getIntensityColor(val, maxVal) },
                ]}
              />
            ))}
          </View>
        </View>
      ))}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <View
            key={ratio}
            style={[
              styles.legendCell,
              { backgroundColor: ratio === 0 ? 'rgba(255,255,255,0.03)' : getIntensityColor(ratio * maxVal, maxVal) },
            ]}
          />
        ))}
        <Text style={styles.legendLabel}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 2 },
  hourRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dayLabelSpace: { width: 28 },
  hourLabel: {
    flex: 1,
    fontSize: 8,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    fontWeight: '600',
  },
  dayRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 2 },
  dayLabel: {
    width: 28,
    fontSize: 9,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '600',
    textAlign: 'right',
    paddingRight: 4,
  },
  cellsRow: { flex: 1, flexDirection: 'row', gap: 1.5 },
  cell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 2.5,
    minWidth: 6,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 3,
    marginTop: 6,
  },
  legendCell: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { fontSize: 8, color: 'rgba(255,255,255,0.3)', fontWeight: '500' },
});
