/**
 * Reading Statistics screen
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useStatisticsStore } from '@/stores/statisticsStore';
import { useThemeStore, lightColors, darkColors } from '@/stores/themeStore';
import { EmptyState } from '@/components/EmptyState';

export default function StatisticsScreen() {
  const { stats, isLoading, dailyReadingTime, loadStats, loadDailyReadingTime, refreshStats } = useStatisticsStore();
  const resolvedTheme = useThemeStore((state) => state.resolvedTheme);
  const colors = resolvedTheme === 'dark' ? darkColors : lightColors;

  useEffect(() => {
    loadStats();
    loadDailyReadingTime(30);
  }, [loadStats, loadDailyReadingTime]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (!stats && !isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>
        </View>
        <EmptyState
          title="No reading data"
          message="Start reading to see your statistics"
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.text }]}>Statistics</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refreshStats} />
        }
      >
        {stats && (
          <>
            {/* Overview Cards */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Overview</Text>
              <View style={styles.cardRow}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.cardValue, { color: colors.primary }]}>
                    {formatTime(stats.totalReadingTime)}
                  </Text>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Total Reading</Text>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.cardValue, { color: colors.primary }]}>
                    {stats.totalPagesRead}
                  </Text>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Pages Read</Text>
                </View>
              </View>
              <View style={styles.cardRow}>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.cardValue, { color: colors.primary }]}>
                    {stats.averageReadingSpeed}
                  </Text>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>WPM</Text>
                </View>
                <View style={[styles.card, { backgroundColor: colors.card }]}>
                  <Text style={[styles.cardValue, { color: colors.primary }]}>
                    {stats.readingStreak}
                  </Text>
                  <Text style={[styles.cardLabel, { color: colors.textSecondary }]}>Day Streak</Text>
                </View>
              </View>
            </View>

            {/* Sessions */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Sessions</Text>
              <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Today</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{stats.sessionsToday}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>This Week</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{stats.sessionsThisWeek}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>This Month</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>{stats.sessionsThisMonth}</Text>
                </View>
              </View>
            </View>

            {/* Most Read Document */}
            {stats.mostReadDocument && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Most Read</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                  <Text style={[styles.documentTitle, { color: colors.text }]}>
                    {stats.mostReadDocument.title}
                  </Text>
                  <Text style={[styles.documentTime, { color: colors.textSecondary }]}>
                    {formatTime(stats.mostReadDocument.timeSpent)}
                  </Text>
                </View>
              </View>
            )}

            {/* Daily Reading Time */}
            {dailyReadingTime.length > 0 && (
              <View style={styles.section}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Last 30 Days</Text>
                <View style={[styles.infoCard, { backgroundColor: colors.card }]}>
                  {dailyReadingTime.slice(0, 7).map((day, index) => (
                    <View key={index} style={styles.infoRow}>
                      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      <Text style={[styles.infoValue, { color: colors.text }]}>
                        {formatTime(day.seconds)}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  cardLabel: {
    fontSize: 14,
  },
  infoCard: {
    padding: 16,
    borderRadius: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  documentTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  documentTime: {
    fontSize: 14,
  },
});
