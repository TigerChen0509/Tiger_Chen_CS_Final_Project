import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: '◉' },
  { key: 'tasks', label: 'Tasks', icon: '☑' },
  { key: 'schedule', label: 'Schedule', icon: '▦' },
  { key: 'timeline', label: 'Timeline', icon: '◈' },
  { key: 'analytics', label: 'Analytics', icon: '◑' },
  { key: 'focus', label: 'Focus', icon: '◒' },
  { key: 'ai', label: 'AI Coach', icon: '✦' },
];

const BOTTOM_ITEMS = [
  { key: 'settings', label: 'Settings', icon: '⚙' },
];

interface SidebarProps {
  activeView: string;
  onNavigate: (view: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  streak?: number;
  userName?: string;
}

function NavItem({ item, active, collapsed, onPress }: { item: typeof NAV_ITEMS[0]; active: boolean; collapsed: boolean; onPress: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <TouchableOpacity
      style={[
        styles.navItem,
        collapsed && styles.navItemCollapsed,
        active && styles.navItemActive,
        hovered && !active && styles.navItemHover,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
      {...(Platform.OS === 'web' ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) } : {})}
    >
      <Text style={[styles.navIcon, active && styles.navIconActive]}>{item.icon}</Text>
      {!collapsed && <Text style={[styles.navLabel, active && styles.navLabelActive]}>{item.label}</Text>}
      {active && <View style={styles.activeIndicator} />}
    </TouchableOpacity>
  );
}

export default function Sidebar({ activeView, onNavigate, collapsed, onToggleCollapse, streak = 0, userName }: SidebarProps) {
  return (
    <View style={[styles.sidebar, collapsed && styles.sidebarCollapsed]}>
      {/* Brand */}
      <View style={styles.brand}>
        <View style={styles.brandIcon}>
          <Text style={styles.brandIconText}>T</Text>
        </View>
        {!collapsed && <Text style={styles.brandText}>TaskTock</Text>}
      </View>

      {/* Nav */}
      <View style={styles.navSection}>
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.key} item={item} active={activeView === item.key} collapsed={collapsed} onPress={() => onNavigate(item.key)} />
        ))}
      </View>

      <View style={{ flex: 1 }} />

      {/* Streak Widget */}
      {!collapsed && streak > 0 && (
        <View style={styles.streakWidget}>
          <Text style={styles.streakFire}>🔥</Text>
          <Text style={styles.streakNum}>{streak}</Text>
          <Text style={styles.streakLabel}>day streak</Text>
        </View>
      )}

      {/* Bottom Items */}
      <View style={styles.bottomSection}>
        {BOTTOM_ITEMS.map((item) => (
          <NavItem key={item.key} item={item} active={activeView === item.key} collapsed={collapsed} onPress={() => onNavigate(item.key)} />
        ))}
      </View>

      {/* Profile */}
      {!collapsed && userName && (
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>{userName[0]?.toUpperCase() || 'U'}</Text>
          </View>
          <Text style={styles.profileName} numberOfLines={1}>{userName}</Text>
        </View>
      )}

      {/* Collapse Toggle */}
      <TouchableOpacity style={styles.collapseBtn} onPress={onToggleCollapse} activeOpacity={0.7}>
        <Text style={styles.collapseIcon}>{collapsed ? '›' : '‹'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: { width: 220, backgroundColor: 'rgba(14,14,28,0.95)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.06)', paddingTop: 20, paddingBottom: 12, flexDirection: 'column' },
  sidebarCollapsed: { width: 64, alignItems: 'center' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, marginBottom: 24 },
  brandIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  brandIconText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  brandText: { fontSize: 17, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  navSection: { gap: 1, paddingHorizontal: 10 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, position: 'relative' },
  navItemCollapsed: { justifyContent: 'center', paddingHorizontal: 0, width: 44, height: 44 },
  navItemActive: { backgroundColor: 'rgba(108,92,231,0.12)' },
  navItemHover: { backgroundColor: 'rgba(255,255,255,0.04)' },
  activeIndicator: { position: 'absolute', left: 0, top: 8, bottom: 8, width: 3, borderRadius: 2, backgroundColor: '#6C5CE7' },
  navIcon: { fontSize: 15, color: 'rgba(255,255,255,0.35)', width: 20, textAlign: 'center' },
  navIconActive: { color: '#6C5CE7' },
  navLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  navLabelActive: { color: '#fff', fontWeight: '600' },
  streakWidget: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 14, marginVertical: 10, paddingVertical: 10, paddingHorizontal: 12, backgroundColor: 'rgba(255,217,61,0.08)', borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,217,61,0.15)' },
  streakFire: { fontSize: 16 },
  streakNum: { fontSize: 16, fontWeight: '800', color: '#FFD93D' },
  streakLabel: { fontSize: 10, color: 'rgba(255,217,61,0.6)', fontWeight: '500' },
  bottomSection: { gap: 1, paddingHorizontal: 10, marginTop: 8 },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 18, paddingVertical: 10, marginHorizontal: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.03)', marginTop: 8 },
  profileAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  profileAvatarText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  profileName: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.6)', flex: 1 },
  collapseBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginTop: 8 },
  collapseIcon: { fontSize: 14, color: 'rgba(255,255,255,0.3)', fontWeight: '600' },
});
