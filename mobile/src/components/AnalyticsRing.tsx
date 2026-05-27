import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface Props {
  value: number;
  max: number;
  label: string;
  unit?: string;
  color: string;
  size?: number;
}

export default function AnalyticsRing({ value, max, label, unit = '', color, size = 80 }: Props) {
  const anim = useRef(new Animated.Value(0)).current;
  const percentage = Math.min(value / max, 1);

  useEffect(() => {
    Animated.timing(anim, {
      toValue: percentage,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [value, max]);

  const strokeWidth = size * 0.1;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const displayValue = unit === '%' ? Math.round(percentage * 100) : value;

  return (
    <View style={styles.container}>
      <View style={[styles.ringWrap, { width: size, height: size }]}>
        {/* Background ring */}
        <View
          style={[
            styles.ringBg,
            {
              width: size - strokeWidth,
              height: size - strokeWidth,
              borderRadius: (size - strokeWidth) / 2,
              borderWidth: strokeWidth,
              borderColor: 'rgba(255,255,255,0.06)',
            },
          ]}
        />
        {/* Glow effect */}
        <Animated.View
          style={[
            styles.glowRing,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: strokeWidth / 2,
              borderColor: 'transparent',
              borderTopColor: color,
              borderRightColor: anim.interpolate({
                inputRange: [0, 0.25],
                outputRange: ['transparent', color],
                extrapolate: 'clamp',
              }),
              borderBottomColor: anim.interpolate({
                inputRange: [0, 0.5],
                outputRange: ['transparent', color],
                extrapolate: 'clamp',
              }),
              borderLeftColor: anim.interpolate({
                inputRange: [0, 0.75],
                outputRange: ['transparent', color],
                extrapolate: 'clamp',
              }),
              transform: [{ rotate: '-45deg' }],
              shadowColor: color,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.5,
              shadowRadius: 8,
            },
          ]}
        />
        {/* Value */}
        <View style={styles.valueWrap}>
          <Text style={[styles.value, { color, fontSize: size * 0.26 }]}>
            {displayValue}
          </Text>
          {unit && <Text style={[styles.unit, { color: color + '99' }]}>{unit}</Text>}
        </View>
      </View>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', gap: 8 },
  ringWrap: { alignItems: 'center', justifyContent: 'center' },
  ringBg: { position: 'absolute' },
  glowRing: { position: 'absolute' },
  valueWrap: { alignItems: 'center', justifyContent: 'center' },
  value: { fontWeight: '800' },
  unit: { fontSize: 10, fontWeight: '600', marginTop: -2 },
  label: { fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '600', textAlign: 'center' },
});
