import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export interface AlarmSound {
  id: string;
  name: string;
  source: any;
}

export const ALARM_SOUNDS: AlarmSound[] = [
  { id: 'bell', name: 'Bell', source: require('../../assets/sounds/bell.wav') },
  { id: 'chime', name: 'Chime', source: require('../../assets/sounds/chime.wav') },
  { id: 'alert', name: 'Alert', source: require('../../assets/sounds/alert.wav') },
];

let currentSound: Audio.Sound | null = null;

export async function playAlarm(soundId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      playWebAlarm(soundId);
      return;
    }

    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    const sound = ALARM_SOUNDS.find((s) => s.id === soundId) || ALARM_SOUNDS[0];
    const { sound: loadedSound } = await Audio.Sound.createAsync(sound.source);
    currentSound = loadedSound;
    await loadedSound.playAsync();
  } catch (e) {
    console.error('Sound error:', e);
  }
}

export async function stopAlarm(): Promise<void> {
  try {
    if (currentSound) {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
      currentSound = null;
    }
  } catch {}
}

function playWebAlarm(soundId: string) {
  const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  const configs: Record<string, { freq: number; type: OscillatorType; duration: number }> = {
    bell: { freq: 830, type: 'sine', duration: 0.8 },
    chime: { freq: 1200, type: 'sine', duration: 0.5 },
    alert: { freq: 600, type: 'square', duration: 1.0 },
  };
  const cfg = configs[soundId] || configs.bell;

  osc.type = cfg.type;
  osc.frequency.value = cfg.freq;
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + cfg.duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + cfg.duration);

  // Play a second tone after a short gap for a more alarm-like feel
  setTimeout(() => {
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = cfg.type;
    osc2.frequency.value = cfg.freq * 1.2;
    gain2.gain.setValueAtTime(0.3, ctx.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + cfg.duration);
    osc2.start(ctx.currentTime);
    osc2.stop(ctx.currentTime + cfg.duration);
  }, 400);
}
