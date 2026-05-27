import React, { useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { loadTasks } from '../utils/taskStore';
import { computeInsights, Insights } from '../utils/insights';
import CompactCard from '../components/cards/CompactCard';
import AnalyticsRing from '../components/AnalyticsRing';
import DashboardGrid, { GridCell } from '../components/grid/DashboardGrid';

function getAISummary(insights: Insights): string[] {
  const tips: string[] = [];
  if (insights.completionRate >= 0.8) tips.push("Your completion rate is excellent — you're in the top productivity zone.");
  else if (insights.completionRate >= 0.5) tips.push("Solid completion rate. Focus on consistency to push past 80%.");
  else tips.push("Your completion rate needs attention. Try tackling your most important task first each day.");
  if (insights.bestHour) tips.push(`You're most productive at ${insights.bestHour}. Schedule deep work during this window.`);
  if (insights.avgTasksPerDay > 5) tips.push("Your daily task load is heavy. Consider batching similar tasks together.");
  if (insights.totalMissed > insights.totalCompleted * 0.3) tips.push("High miss rate detected. Try setting more realistic deadlines.");
  return tips.slice(0, 3);
}

export default function InsightsView() {
  const [insights, setInsights] = useState<Insights | null>(null);
  const barAnims = useRef<Animated.Value[]>([]).current;

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const tasks = await loadTasks();
        const result = computeInsights(tasks);
        setInsights(result);
        result.weeklyTrend.forEach((_, i) => {
          if (!barAnims[i]) barAnims[i] = new Animated.Value(0);
          Animated.timing(barAnims[i], { toValue: 1, duration: 800, delay: i * 80, useNativeDriver: false }).start();
        });
      })();
    }, []),
  );

  if (!insights) return null;

  const maxWeekly = Math.max(...insights.weeklyTrend.map((d) => d.completed + d.missed), 1);
  const aiTips = getAISummary(insights);
  const totalAll = insights.totalCompleted + insights.totalMissed + insights.totalPending;

  return (
    <DashboardGrid>
      {/* Overview Rings */}
      <GridCell span={2}>
        <CompactCard>
          <Text style={styles.sectionTitle}>OVERVIEW</Text>
          <View style={styles.ringsRow}>
            <AnalyticsRing value={insights.totalCompleted} max={Math.max(totalAll, 1)} label="Done" color="#4ade80" />
            <AnalyticsRing value={Math.round(insights.completionRate * 100)} max={100} label="Rate" unit="%" color="#6C5CE7" />
            <AnalyticsRing value={insights.totalPending} max={Math.max(totalAll, 1)} label="Pending" color="#00D2FF" />
          </View>
        </CompactCard>
      </GridCell>

      {/* Weekly Chart */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>WEEKLY ACTIVITY</Text>
          <View style={styles.chartRow}>
            {insights.weeklyTrend.map((d, i) => {
              const total = d.completed + d.missed;
              const anim = barAnims[i] || new Animated.Value(1);
              return (
                <View key={i} style={styles.chartCol}>
                  <View style={styles.chartBarArea}>
                    <Animated.View style={[styles.chartBarCompleted, { height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, (d.completed / maxWeekly) * 60] }) }]} />
                    <Animated.View style={[styles.chartBarMissed, { height: anim.interpolate({ inputRange: [0, 1], outputRange: [0, (d.missed / maxWeekly) * 60] }) }]} />
                    {total === 0 && <View style={styles.chartBarEmpty} />}
                  </View>
                  <Text style={styles.chartLabel}>{d.day}</Text>
                </View>
              );
            })}
          </View>
          <View style={styles.legendRow}>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#4ade80' }]} /><Text style={styles.legendText}>Completed</Text></View>
            <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#ff6b6b' }]} /><Text style={styles.legendText}>Missed</Text></View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Peak Performance */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>PEAK PERFORMANCE</Text>
          <View style={styles.perfGrid}>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{insights.bestHour || '—'}</Text>
              <Text style={styles.perfLabel}>Best Hour</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{insights.bestDay || '—'}</Text>
              <Text style={styles.perfLabel}>Best Day</Text>
            </View>
            <View style={styles.perfItem}>
              <Text style={styles.perfValue}>{insights.avgTasksPerDay}</Text>
              <Text style={styles.perfLabel}>Avg / Day</Text>
            </View>
          </View>
        </CompactCard>
      </GridCell>

      {/* Categories */}
      <GridCell>
        <CompactCard>
          <Text style={styles.sectionTitle}>CATEGORIES</Text>
          {insights.categoryBreakdown.map((cat) => {
            const pct = cat.total > 0 ? cat.completed / cat.total : 0;
            return (
              <View key={cat.category} style={styles.catRow}>
                <View style={styles.catHeader}>
                  <View style={[styles.catDot, { backgroundColor: cat.color }]} />
                  <Text style={styles.catName}>{cat.category}</Text>
                  <Text style={styles.catCount}>{cat.completed}/{cat.total}</Text>
                </View>
                <View style={styles.catBarBg}>
                  <View style={[styles.catBarFill, { backgroundColor: cat.color, width: `${Math.round(pct * 100)}%` }]} />
                </View>
              </View>
            );
          })}
        </CompactCard>
      </GridCell>

      {/* AI Analysis */}
      <GridCell>
        <CompactCard glowColor="#FF6B9D">
          <Text style={styles.sectionTitle}>AI ANALYSIS</Text>
          {aiTips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <View style={styles.tipDot} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </CompactCard>
      </GridCell>
    </DashboardGrid>
  );
}

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: 'rgba(255,255,255,0.35)', marginBottom: 10 },
  ringsRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 4 },

  chartRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 80 },
  chartCol: { alignItems: 'center', flex: 1 },
  chartBarArea: { height: 60, justifyContent: 'flex-end', alignItems: 'center', gap: 2 },
  chartBarCompleted: { width: 14, backgroundColor: '#4ade80', borderRadius: 3 },
  chartBarMissed: { width: 14, backgroundColor: '#ff6b6b', borderRadius: 3 },
  chartBarEmpty: { width: 14, height: 3, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 2 },
  chartLabel: { fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 4, fontWeight: '600' },
  legendRow: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendText: { fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },

  perfGrid: { flexDirection: 'row', gap: 8 },
  perfItem: { flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 10 },
  perfValue: { fontSize: 18, fontWeight: '800', color: '#6C5CE7' },
  perfLabel: { fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 3, fontWeight: '600' },

  catRow: { marginBottom: 12 },
  catHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  catDot: { width: 6, height: 6, borderRadius: 3, marginRight: 7 },
  catName: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.8)', flex: 1 },
  catCount: { fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  catBarBg: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.06)', overflow: 'hidden' },
  catBarFill: { height: 4, borderRadius: 2 },

  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  tipDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#FF6B9D', marginTop: 6 },
  tipText: { flex: 1, fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 18, fontWeight: '500' },
});
