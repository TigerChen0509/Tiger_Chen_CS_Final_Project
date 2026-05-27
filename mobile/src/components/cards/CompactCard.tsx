import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet, Animated, Platform, TouchableOpacity } from 'react-native';

interface Props {
  children: React.ReactNode;
  glowColor?: string;
  style?: any;
  span?: number;
  onPress?: () => void;
  pressable?: boolean;
}

export default function CompactCard({ children, glowColor = '#6C5CE7', style, span = 1, onPress, pressable }: Props) {
  const pulseAnim = useRef(new Animated.Value(0.15)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const [hovered, setHovered] = useState(false);
  const isInteractive = !!onPress || pressable;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.35, duration: 2500, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 0.15, duration: 2500, useNativeDriver: false }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  useEffect(() => {
    if (isInteractive) {
      Animated.spring(scaleAnim, {
        toValue: hovered ? 1.015 : 1,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }).start();
    }
  }, [hovered]);

  const widthStyle = span === 2 ? { width: '100%' } : {};

  const hoverHandlers = Platform.OS === 'web' ? {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  } : {};

  const cardStyle = [
    styles.container,
    widthStyle,
    style,
    isInteractive && Platform.OS === 'web' && { cursor: 'pointer' },
  ];

  const innerStyle = [
    styles.card,
    hovered && isInteractive && styles.cardHover,
    hovered && isInteractive && { borderColor: glowColor + '40' },
  ];

  const content = (
    <>
      <Animated.View style={[
        styles.glow,
        { backgroundColor: glowColor, opacity: hovered && isInteractive ? 0.6 : pulseAnim },
      ]} />
      <Animated.View style={[innerStyle, { transform: [{ scale: isInteractive ? scaleAnim : 1 }] }]}>
        {children}
      </Animated.View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        style={cardStyle}
        onPress={onPress}
        activeOpacity={0.9}
        {...hoverHandlers}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View style={cardStyle} {...hoverHandlers}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 10,
  },
  glow: {
    position: 'absolute',
    top: -2,
    left: -2,
    right: -2,
    bottom: -2,
    borderRadius: 14,
    opacity: 0.15,
  },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  cardHover: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    shadowColor: '#6C5CE7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
});
