import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');
const PARTICLE_COUNT = 18;

interface Particle {
  x: Animated.Value;
  y: Animated.Value;
  size: number;
  opacity: number;
  speed: number;
}

function createParticle(): Particle {
  return {
    x: new Animated.Value(Math.random() * width),
    y: new Animated.Value(Math.random() * height),
    size: Math.random() * 3 + 1.5,
    opacity: Math.random() * 0.25 + 0.05,
    speed: Math.random() * 8000 + 6000,
  };
}

export default function ParticleBackground() {
  const particles = useRef<Particle[]>(
    Array.from({ length: PARTICLE_COUNT }, createParticle)
  ).current;

  useEffect(() => {
    const animations = particles.map((p) => {
      const animate = () => {
        p.x.setValue(Math.random() * width);
        p.y.setValue(height + 20);
        return Animated.parallel([
          Animated.timing(p.x, {
            toValue: Math.random() * width,
            duration: p.speed,
            useNativeDriver: false,
          }),
          Animated.timing(p.y, {
            toValue: -20,
            duration: p.speed,
            useNativeDriver: false,
          }),
        ]);
      };
      return Animated.loop(animate());
    });

    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Ambient glow orbs */}
      <View style={[styles.orb, styles.orbPurple]} />
      <View style={[styles.orb, styles.orbBlue]} />

      {/* Particles */}
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              opacity: p.opacity,
              transform: [{ translateX: p.x }, { translateY: p.y }],
              backgroundColor: i % 2 === 0 ? '#6C5CE7' : '#00D2FF',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: 'hidden',
  },
  orb: {
    position: 'absolute',
    borderRadius: 999,
  },
  orbPurple: {
    width: 300,
    height: 300,
    top: -80,
    right: -60,
    backgroundColor: '#6C5CE7',
    opacity: 0.06,
  },
  orbBlue: {
    width: 250,
    height: 250,
    bottom: 100,
    left: -80,
    backgroundColor: '#00D2FF',
    opacity: 0.04,
  },
  particle: {
    position: 'absolute',
  },
});
