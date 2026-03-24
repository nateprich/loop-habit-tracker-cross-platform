import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';
import { useColorScheme } from '@/components/useColorScheme';
import Colors from '@/constants/Colors';

export default function StatisticsScreen() {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <View style={styles.container}>
      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Total Habits
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>4</Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Current Best Streak
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>30 days</Text>
        <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
          Drink water
        </Text>
      </View>

      <View style={[styles.card, { backgroundColor: colors.card }]}>
        <Text style={[styles.cardTitle, { color: colors.secondaryText }]}>
          Today's Completion
        </Text>
        <Text style={[styles.cardValue, { color: colors.tint }]}>75%</Text>
        <Text style={[styles.cardSubtitle, { color: colors.secondaryText }]}>
          3 of 4 habits
        </Text>
      </View>

      <Text style={[styles.placeholder, { color: colors.secondaryText }]}>
        Detailed charts and history coming soon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  cardSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  placeholder: {
    textAlign: 'center',
    marginTop: 24,
    fontSize: 14,
    fontStyle: 'italic',
  },
});
