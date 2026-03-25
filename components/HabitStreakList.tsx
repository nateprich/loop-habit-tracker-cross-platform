import { useEffect } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeInLeft,
} from 'react-native-reanimated';

interface HabitStreakItem {
  name: string;
  color: string;
  streak: number;
}

interface HabitStreakListProps {
  habits: HabitStreakItem[];
  maxStreak: number;
  secondaryTextColor: string;
  textColor: string;
  cardColor: string;
}

function AnimatedBar({ color, pct, delay }: { color: string; pct: number; delay: number }) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(delay, withTiming(pct, { duration: 600 }));
  }, [pct, delay, width]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return <Animated.View style={[styles.barFill, animatedStyle]} />;
}

export default function HabitStreakList({
  habits,
  maxStreak,
  secondaryTextColor,
  textColor,
  cardColor,
}: HabitStreakListProps) {
  if (habits.length === 0) return null;

  return (
    <View style={[styles.container, { backgroundColor: cardColor }]}>
      <Text style={[styles.title, { color: secondaryTextColor }]}>
        Current Streaks
      </Text>
      {habits.map((habit, i) => (
        <Animated.View key={i} style={styles.row} entering={FadeInLeft.delay(i * 60).duration(300)}>
          <RNView style={styles.labelRow}>
            <RNView style={[styles.dot, { backgroundColor: habit.color }]} />
            <Text style={[styles.name, { color: textColor }]} numberOfLines={1}>
              {habit.name}
            </Text>
            <Text style={[styles.streakCount, { color: secondaryTextColor }]}>
              {habit.streak}d
            </Text>
          </RNView>
          <RNView style={styles.barTrack}>
            <AnimatedBar
              color={habit.color}
              pct={maxStreak > 0 ? (habit.streak / maxStreak) * 100 : 0}
              delay={200 + i * 60}
            />
          </RNView>
        </Animated.View>
      ))}
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
  row: {
    marginBottom: 10,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  name: {
    flex: 1,
    fontSize: 14,
  },
  streakCount: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 8,
  },
  barTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.15)',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 2,
  },
});
