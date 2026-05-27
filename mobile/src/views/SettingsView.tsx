import React, { useState, useEffect } from 'react';
import { View, Text, Switch, TouchableOpacity, StyleSheet, Modal, FlatList, TextInput, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { cancelAllAlarms } from '../utils/notifications';
import { useTheme } from '../utils/theme';
import { useAuth } from '../utils/authContext';

const NOTIF_KEY = 'tasktock_notifications_enabled';
const TZ_KEY = 'tasktock_timezone';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Anchorage', 'Pacific/Honolulu', 'America/Toronto', 'America/Vancouver',
  'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Moscow',
  'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Seoul', 'Asia/Kolkata', 'Asia/Dubai',
  'Australia/Sydney', 'Australia/Melbourne', 'Pacific/Auckland', 'UTC',
];

type SettingsCategory = 'account' | 'preferences' | 'notifications' | 'about';

const CATEGORIES: { key: SettingsCategory; label: string; icon: string }[] = [
  { key: 'account', label: 'Account', icon: '◉' },
  { key: 'preferences', label: 'Preferences', icon: '⚙' },
  { key: 'notifications', label: 'Notifications', icon: '🔔' },
  { key: 'about', label: 'About', icon: '◈' },
];

export default function SettingsView() {
  const { colors } = useTheme();
  const { user, logout, updateName } = useAuth();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>('account');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(user?.name || '');
  const [nameError, setNameError] = useState('');
  const [timezone, setTimezone] = useState('');
  const [showTzModal, setShowTzModal] = useState(false);
  const [tzSearch, setTzSearch] = useState('');

  useEffect(() => {
    (async () => {
      const notifVal = await AsyncStorage.getItem(NOTIF_KEY);
      setNotificationsEnabled(notifVal !== 'false');
      const tzVal = await AsyncStorage.getItem(TZ_KEY);
      setTimezone(tzVal || Intl.DateTimeFormat().resolvedOptions().timeZone);
    })();
  }, []);

  const toggleNotifications = async (value: boolean) => {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIF_KEY, value ? 'true' : 'false');
    if (!value) {
      await cancelAllAlarms();
      if (Platform.OS === 'web') window.alert('Notifications disabled. All alarms cancelled.');
    }
  };

  const selectTimezone = async (tz: string) => {
    setTimezone(tz);
    await AsyncStorage.setItem(TZ_KEY, tz);
    setShowTzModal(false);
    setTzSearch('');
  };

  const filteredTimezones = tzSearch
    ? TIMEZONES.filter((tz) => tz.toLowerCase().includes(tzSearch.toLowerCase()))
    : TIMEZONES;

  const handleSaveName = async () => {
    setNameError('');
    if (!nameInput.trim()) { setNameError('Name cannot be empty.'); return; }
    const result = await updateName(nameInput.trim());
    if (!result.ok) { setNameError(result.error || 'Failed.'); return; }
    setEditingName(false);
  };

  const renderContent = () => {
    switch (activeCategory) {
      case 'account':
        return (
          <View style={styles.paneContent}>
            <Text style={styles.paneTitle}>Account</Text>
            {editingName ? (
              <View style={styles.editArea}>
                <TextInput style={styles.nameInput} value={nameInput} onChangeText={setNameInput} placeholder="Your name" placeholderTextColor="rgba(255,255,255,0.3)" autoFocus />
                {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}
                <View style={styles.editBtns}>
                  <TouchableOpacity style={styles.saveBtn} onPress={handleSaveName}><Text style={styles.saveBtnText}>Save</Text></TouchableOpacity>
                  <TouchableOpacity style={styles.cancelBtn} onPress={() => { setEditingName(false); setNameInput(user?.name || ''); setNameError(''); }}><Text style={styles.cancelBtnText}>Cancel</Text></TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity onPress={() => { setNameInput(user?.name || ''); setEditingName(true); }}>
                <View style={styles.accountRow}>
                  <View style={styles.avatar}><Text style={styles.avatarText}>{(user?.name || 'S')[0].toUpperCase()}</Text></View>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>{user?.name}</Text>
                    <Text style={styles.accountEmail}>{user?.email}</Text>
                  </View>
                  <Text style={styles.editLabel}>Edit</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'preferences':
        return (
          <View style={styles.paneContent}>
            <Text style={styles.paneTitle}>Preferences</Text>
            <TouchableOpacity style={styles.settingRow} onPress={() => setShowTzModal(true)}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🌍</Text>
                <Text style={styles.settingLabel}>Timezone</Text>
              </View>
              <View style={styles.settingRight}>
                <Text style={styles.settingValue}>{timezone.split('/').pop()?.replace(/_/g, ' ')}</Text>
                <Text style={styles.arrow}>›</Text>
              </View>
            </TouchableOpacity>
          </View>
        );

      case 'notifications':
        return (
          <View style={styles.paneContent}>
            <Text style={styles.paneTitle}>Notifications</Text>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Text style={styles.settingIcon}>🔔</Text>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
              </View>
              <Switch value={notificationsEnabled} onValueChange={toggleNotifications} trackColor={{ true: colors.primary, false: 'rgba(255,255,255,0.1)' }} thumbColor={notificationsEnabled ? '#fff' : '#f4f3f4'} />
            </View>
            <Text style={styles.settingHint}>When disabled, all scheduled alarms will be cancelled.</Text>
          </View>
        );

      case 'about':
        return (
          <View style={styles.paneContent}>
            <Text style={styles.paneTitle}>About</Text>
            <Text style={styles.aboutText}>TaskTock v1.0.0</Text>
            <Text style={styles.aboutSub}>AI-powered student productivity OS</Text>
            <TouchableOpacity style={styles.signOutBtn} onPress={logout}>
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Left Category List */}
      <View style={styles.categoryList}>
        <Text style={styles.categoryHeader}>Settings</Text>
        {CATEGORIES.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.categoryItem, activeCategory === cat.key && styles.categoryItemActive]}
            onPress={() => setActiveCategory(cat.key)}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryIcon, activeCategory === cat.key && styles.categoryIconActive]}>{cat.icon}</Text>
            <Text style={[styles.categoryLabel, activeCategory === cat.key && styles.categoryLabelActive]}>{cat.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Right Content Pane */}
      <View style={styles.contentPane}>
        {renderContent()}
      </View>

      {/* Timezone Modal */}
      <Modal visible={showTzModal} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Timezone</Text>
            <TouchableOpacity onPress={() => { setShowTzModal(false); setTzSearch(''); }}>
              <Text style={styles.modalDone}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor="rgba(255,255,255,0.3)" value={tzSearch} onChangeText={setTzSearch} />
          <FlatList
            data={filteredTimezones}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.tzItem, item === timezone && styles.tzItemActive]} onPress={() => selectTimezone(item)}>
                <Text style={[styles.tzText, item === timezone && styles.tzTextActive]}>{item}</Text>
                {item === timezone && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, flexDirection: 'row' },

  // Category List
  categoryList: {
    width: 200,
    backgroundColor: 'rgba(14,14,28,0.5)',
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.04)',
    paddingTop: 20,
    paddingHorizontal: 12,
  },
  categoryHeader: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 20, paddingHorizontal: 8 },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 2,
  },
  categoryItemActive: {
    backgroundColor: 'rgba(108,92,231,0.12)',
  },
  categoryIcon: { fontSize: 14, width: 20, textAlign: 'center', color: 'rgba(255,255,255,0.35)' },
  categoryIconActive: { color: '#6C5CE7' },
  categoryLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  categoryLabelActive: { color: '#fff', fontWeight: '600' },

  // Content Pane
  contentPane: { flex: 1, padding: 24 },
  paneContent: { maxWidth: 500 },
  paneTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 24, letterSpacing: -0.5 },

  // Account
  editArea: { gap: 10 },
  nameInput: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 12, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  errorText: { color: '#ff6b6b', fontSize: 12 },
  editBtns: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, backgroundColor: '#6C5CE7', padding: 10, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  cancelBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 10, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  cancelBtnText: { color: '#6C5CE7', fontWeight: '600', fontSize: 13 },
  accountRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#6C5CE7', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  accountInfo: { flex: 1 },
  accountName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  accountEmail: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  editLabel: { fontSize: 13, fontWeight: '600', color: '#6C5CE7' },

  // Settings Rows
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settingIcon: { fontSize: 16 },
  settingLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.85)' },
  settingRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  settingValue: { fontSize: 12, color: 'rgba(255,255,255,0.4)' },
  arrow: { fontSize: 16, color: 'rgba(255,255,255,0.3)' },
  settingHint: { fontSize: 11, color: 'rgba(255,255,255,0.3)', marginTop: 10 },

  // About
  aboutText: { fontSize: 14, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
  aboutSub: { fontSize: 12, color: 'rgba(255,255,255,0.35)', marginTop: 4 },
  signOutBtn: { alignItems: 'center', padding: 14, borderRadius: 10, backgroundColor: 'rgba(255,71,87,0.08)', borderWidth: 1, borderColor: 'rgba(255,71,87,0.2)', marginTop: 24 },
  signOutText: { color: '#ff4757', fontSize: 14, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: '#0a0a1a', paddingTop: 60 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  modalDone: { fontSize: 15, fontWeight: '600', color: '#6C5CE7' },
  searchInput: { marginHorizontal: 20, padding: 10, borderRadius: 10, fontSize: 14, backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', marginBottom: 12 },
  tzItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  tzItemActive: { backgroundColor: 'rgba(108,92,231,0.1)' },
  tzText: { fontSize: 14, color: 'rgba(255,255,255,0.7)' },
  tzTextActive: { color: '#6C5CE7', fontWeight: '600' },
  checkmark: { fontSize: 16, fontWeight: '700', color: '#6C5CE7' },
});
