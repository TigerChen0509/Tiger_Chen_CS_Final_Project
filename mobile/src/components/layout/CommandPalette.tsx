import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Platform } from 'react-native';

interface Command {
  id: string;
  label: string;
  icon: string;
  type: 'navigation' | 'action';
}

const COMMANDS: Command[] = [
  { id: 'dashboard', label: 'Go to Dashboard', icon: '◉', type: 'navigation' },
  { id: 'tasks', label: 'Go to Tasks', icon: '☑', type: 'navigation' },
  { id: 'schedule', label: 'Go to Schedule', icon: '▦', type: 'navigation' },
  { id: 'timeline', label: 'Go to Timeline', icon: '◈', type: 'navigation' },
  { id: 'analytics', label: 'Go to Analytics', icon: '◑', type: 'navigation' },
  { id: 'ai', label: 'Open AI Coach', icon: '✦', type: 'navigation' },
  { id: 'progress', label: 'Go to Progress', icon: '◐', type: 'navigation' },
  { id: 'insights', label: 'Go to Insights', icon: '◑', type: 'navigation' },
  { id: 'focus', label: 'Start Focus Mode', icon: '◒', type: 'action' },
  { id: 'settings', label: 'Open Settings', icon: '⚙', type: 'navigation' },
  { id: 'add-task', label: 'Add New Task', icon: '+', type: 'action' },
];

interface Props {
  onClose: () => void;
  onNavigate: (view: string) => void;
  onAction?: (action: string) => void;
}

export default function CommandPalette({ onClose, onNavigate, onAction }: Props) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);

  const filtered = query
    ? COMMANDS.filter((c) => c.label.toLowerCase().includes(query.toLowerCase()))
    : COMMANDS;

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const handler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1)); }
        if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex((i) => Math.max(i - 1, 0)); }
        if (e.key === 'Enter' && filtered[selectedIndex]) {
          executeCommand(filtered[selectedIndex]);
        }
      };
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [filtered, selectedIndex]);

  const executeCommand = (cmd: Command) => {
    if (cmd.type === 'navigation') {
      onNavigate(cmd.id);
    } else if (onAction) {
      onAction(cmd.id);
    }
    onClose();
  };

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.palette}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Type a command or search..."
          placeholderTextColor="rgba(255,255,255,0.3)"
          value={query}
          onChangeText={setQuery}
          autoFocus
        />
        <View style={styles.divider} />
        <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No results found</Text>
          ) : (
            filtered.map((cmd, i) => (
              <TouchableOpacity
                key={cmd.id}
                style={[styles.item, i === selectedIndex && styles.itemSelected]}
                onPress={() => executeCommand(cmd)}
                activeOpacity={0.7}
              >
                <Text style={[styles.itemIcon, i === selectedIndex && styles.itemIconSelected]}>{cmd.icon}</Text>
                <Text style={[styles.itemLabel, i === selectedIndex && styles.itemLabelSelected]}>{cmd.label}</Text>
                <Text style={styles.itemType}>{cmd.type === 'navigation' ? 'Go' : 'Do'}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    zIndex: 1000,
    alignItems: 'center',
    paddingTop: 120,
  },
  backdrop: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  palette: {
    width: 520,
    maxHeight: 400,
    backgroundColor: 'rgba(20,20,40,0.98)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.4,
    shadowRadius: 32,
    elevation: 20,
  },
  input: {
    fontSize: 15,
    color: '#fff',
    padding: 16,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  list: {
    maxHeight: 300,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  itemSelected: {
    backgroundColor: 'rgba(108,92,231,0.12)',
  },
  itemIcon: {
    fontSize: 14,
    width: 20,
    textAlign: 'center',
    color: 'rgba(255,255,255,0.4)',
  },
  itemIconSelected: {
    color: '#6C5CE7',
  },
  itemLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    flex: 1,
  },
  itemLabelSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  itemType: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emptyText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.3)',
    textAlign: 'center',
    paddingVertical: 24,
  },
});
