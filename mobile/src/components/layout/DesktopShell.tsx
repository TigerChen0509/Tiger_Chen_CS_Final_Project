import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';
import { useAuth } from '../../utils/authContext';
import { getDayStatus } from '../../utils/taskLogic';
import { loadTasks } from '../../utils/taskStore';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import CommandPalette from './CommandPalette';
import ParticleBackground from '../ParticleBackground';
import DashboardView from '../../views/DashboardView';
import TasksListView from '../../views/TasksListView';
import ScheduleView from '../../views/ScheduleView';
import TimelineViewPage from '../../views/TimelineViewPage';
import AnalyticsView from '../../views/AnalyticsView';
import AICoachView from '../../views/AICoachView';
import InsightsView from '../../views/InsightsView';
import ProgressView from '../../views/ProgressView';
import FocusView from '../../views/FocusView';
import SettingsView from '../../views/SettingsView';


type Nav = NativeStackNavigationProp<RootStackParamList>;
type ViewKey = 'dashboard' | 'tasks' | 'schedule' | 'timeline' | 'analytics' | 'ai' | 'focus' | 'progress' | 'insights' | 'settings';

export default function DesktopShell() {
  const navigation = useNavigation<Nav>();
  const { user } = useAuth();

  const [activeView, setActiveView] = useState<ViewKey>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    (async () => {
      const tasks = await loadTasks();
      const now = new Date();
      let s = 0;
      for (let i = 0; i < 60; i++) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const status = getDayStatus(tasks, key);
        if (status === 'completed' || status === 'mixed') s++;
        else if (i > 0) break;
      }
      setStreak(s);
    })();
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleNavigate = (view: string) => {
    setActiveView(view as ViewKey);
    setCommandPaletteOpen(false);
  };

  const handleAction = (action: string) => {
    if (action === 'add-task') {
      navigation.navigate('AddTask', {});
    } else if (action === 'focus') {
      setActiveView('focus');
    }
    setCommandPaletteOpen(false);
  };

  const renderView = () => {
    switch (activeView) {
      case 'dashboard': return <DashboardView onNavigate={handleNavigate} />;
      case 'tasks': return <TasksListView />;
      case 'schedule': return <ScheduleView />;
      case 'timeline': return <TimelineViewPage />;
      case 'analytics': return <AnalyticsView />;
      case 'ai': return <AICoachView />;
      case 'progress': return <ProgressView />;
      case 'insights': return <InsightsView />;
      case 'focus': return <FocusView />;
      case 'settings': return <SettingsView />;
      default: return <DashboardView onNavigate={handleNavigate} />;
    }
  };

  return (
    <View style={styles.shell}>
      <ParticleBackground />

      <View style={styles.body}>
        <Sidebar
          activeView={activeView}
          onNavigate={handleNavigate}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
          streak={streak}
          userName={user?.name}
        />

        <View style={styles.main}>
          <TopBar
            activeView={activeView}
            onCommandPalette={() => setCommandPaletteOpen(true)}
            userName={user?.name}
          />
          <View style={styles.content}>
            {renderView()}
          </View>
        </View>
      </View>

      {commandPaletteOpen && (
        <CommandPalette
          onClose={() => setCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
          onAction={handleAction}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: '#0a0a1a' },
  body: { flex: 1, flexDirection: 'row' },
  main: { flex: 1, flexDirection: 'column' },
  content: { flex: 1 },
});
