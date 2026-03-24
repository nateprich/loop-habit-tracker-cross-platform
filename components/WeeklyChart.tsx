import { useEffect } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { getLast7Dates } from '@/database/completions';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withSpring,
} from 'react-native-reanimated';

interface WeeklyChartProps {
  habits: { id: string }[];
  completions: Map<string, Set<string>>;
  barColor: string;
  secondaryTextColor: string;
  cardColor: string;
}

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function AnimatedBarColumn({
  pct,
  label,
  barColor,
  secondaryTextColor,
  delay,
}: {
  pct: number;
  label: string;
  barColor: string;
  secondaryTextColor: string;
  delay: number;
}) {
  const height = useSharedValue(0);

  useEffect(() => {
    height.value = withDelay(
      delay,
      withSpring(Math.max(pct * 100, 2), { damping: 12, stiffness: 100 })
    );
  }, [pct, delay, height]);

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${height.value}%`,
    backgroundColor: barColor,
  }));

  return (
    <RNView style={styles.barColumn}>
      <Text style={[styles.pctLabel, { color: secondaryTextColor }]}>
        {Math.round(pct * 100)}%
      </Text>
      <RNView style={styles.barTrack}>
        <Animated.View style={[styles.barFill, animatedStyle]} />
      </RNView>
      <Text style={[styles.dayLabel, { color: secondaryTextColor }]}>
        {label}
      </Text>
    </RNView>
  );
}

export default function WeeklyChart({
  habits,
  completions,
  barColor,
  secondaryTextColor,
  cardColor,
}: WeeklyChartProps) {
  const dates = getLast7Dates();
  const totalHabits = habits.length;

  const data = dates.map((date) => {
    const completed = habits.filter(
      (h) => completions.get(h.id)?.has(date)
    ).length;
    const pct = totalHabits > 0 ? completed / totalHabits : 0;
    const dayIndex = new Date(date + 'T12:00:00').getDay();
    return { date, label: DAY_LABELS[dayIndex], pct, completed };
  });

  return (
    <View style={[styles.container, { backgroundColor: cardColor }]}>
      <Text style={[styles.title, { color: secondaryTextColor }]}>
        Last 7 Days
      </Text>
      <RNView style={styles.chartRow}>
        {data.map((d, i) => (
          <AnimatedBarColumn
            key={d.date}
            pct={d.pct}
            label={d.label}
            barColor={barColor}
            secondaryTextColor={secondaryTextColor}
            delay={i * 80}
          />
        ))}
      </RNView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
  },
  chartRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 140,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end',
  },
  pctLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  barTrack: {
    flex: 1,
    width: 20,
    borderRadius: 4,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  barFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 2,
  },
  dayLabel: {
    fontSize: 11,
    marginTop: 6,
  },
});
