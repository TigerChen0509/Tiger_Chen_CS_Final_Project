import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface TopBarProps {
  activeView: string;
  onCommandPalette: () => void;
  userName?: string;
}

const VIEW_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  tasks: 'Tasks',
  schedule: 'Schedule',
  timeline: 'Timeline',
  analytics: 'Analytics',
  ai: 'AI Coach',
  progress: 'Progress',
  insights: 'Insights',
  focus: 'Focus Mode',
  settings: 'Settings',
};

export default function TopBar({ activeView, onCommandPalette, userName }: TopBarProps) {
  const [searchHover, setSearchHover] = useState(false);

  return (
    <View style={styles.topBar}>
      {/* Breadcrumb */}
      <Text style={styles.breadcrumb}>{VIEW_LABELS[activeView] || 'Dashboard'}</Text>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

      {/* Command Palette Trigger */}
      <TouchableOpacity
        style={[styles.searchTrigger, searchHover && styles.searchTriggerHover]}
        onPress={onCommandPalette}
        activeOpacity={0.8}
        {...(Platform.OS === 'web' ? { onMouseEnter: () => setSearchHover(true), onMouseLeave: () => setSearchHover(false) } : {})}
      >
        <Text style={styles.searchIcon}>⌕</Text>
        <Text style={styles.searchPlaceholder}>Search or command...</Text>
        <View style={styles.shortcutBadge}>
          <Text style={styles.shortcutText}>⌘K</Text>
        </View>
      </TouchableOpacity>

      {/* Profile */}
      <TouchableOpacity style={styles.profileBtn} activeOpacity={0.7}>
        <View style={styles.profileAvatar}>
          <Text style={styles.profileText}>{userName?.[0]?.toUpperCase() || 'U'}</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 12,
    backgroundColor: 'rgba(14,14,28,0.6)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  breadcrumb: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: -0.3,
  },
  searchTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    minWidth: 260,
  },
  searchTriggerHover: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderColor: 'rgba(255,255,255,0.1)',
  },
  searchIcon: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  searchPlaceholder: { fontSize: 13, color: 'rgba(255,255,255,0.3)', flex: 1 },
  shortcutBadge: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  shortcutText: { fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },

  profileBtn: {
    padding: 2,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#6C5CE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
