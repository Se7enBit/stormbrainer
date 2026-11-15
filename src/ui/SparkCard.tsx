import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { Spark } from '../sparks/types';
import { strings } from '../strings';
import { Button } from './Button';
import { cardFontSize, colors, spacing, typeColors } from './theme';

interface Props {
  spark: Spark;
  onNext: () => void;
  onReroll: () => void;
  onClose: () => void;
  /** Waiting for the next AI spark: show a spinner and disable Next/Reroll. */
  loading?: boolean;
}

/** A full-screen card in very large text, laid out by spark type. */
export function SparkCard({ spark, onNext, onReroll, onClose, loading = false }: Props) {
  const accent = typeColors[spark.type];
  const fontSize = cardFontSize(spark.text);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.typeLabel, { color: accent }]}>{strings.types[spark.type]}</Text>
        {loading && <ActivityIndicator color={colors.textMuted} />}
        {spark.source === 'deck' && <Text style={styles.badge}>{strings.card.offlineBadge}</Text>}
      </View>

      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text
          style={[styles.text, { fontSize, lineHeight: Math.round(fontSize * 1.2) }]}
          accessibilityRole="header"
        >
          {spark.text}
        </Text>
        <CardDetail spark={spark} accent={accent} />
      </ScrollView>

      <View style={styles.actions}>
        <Button label={strings.card.close} onPress={onClose} grow />
        <Button label={strings.card.reroll} onPress={onReroll} disabled={loading} grow />
        <Button label={strings.card.next} onPress={onNext} disabled={loading} primary grow />
      </View>
    </View>
  );
}

function CardDetail({ spark, accent }: { spark: Spark; accent: string }) {
  switch (spark.type) {
    case 'debate':
      return spark.options ? (
        <Options options={spark.options} joiner={strings.card.versus} accent={accent} labelled />
      ) : null;
    case 'whatIf':
      return spark.options ? (
        <Options options={spark.options} joiner={strings.card.or} accent={accent} />
      ) : null;
    case 'hotTake':
      return <Text style={[styles.hint, { color: accent }]}>{strings.card.hotTakeHint}</Text>;
    case 'memoryLane':
      return <Text style={[styles.hint, { color: accent }]}>{strings.card.memoryLaneHint}</Text>;
  }
}

function Options({
  options,
  joiner,
  accent,
  labelled = false,
}: {
  options: [string, string];
  joiner: string;
  accent: string;
  labelled?: boolean;
}) {
  const [a, b] = options;
  return (
    <View style={styles.options}>
      <Option label={labelled ? 'A' : undefined} text={a} accent={accent} />
      <Text style={styles.joiner}>{joiner}</Text>
      <Option label={labelled ? 'B' : undefined} text={b} accent={accent} />
    </View>
  );
}

function Option({ label, text, accent }: { label?: string; text: string; accent: string }) {
  return (
    <View style={[styles.option, { borderColor: accent }]}>
      {label && <Text style={[styles.optionLabel, { color: accent }]}>{label}</Text>}
      <Text style={styles.optionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    padding: spacing.lg,
    gap: spacing.md,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  typeLabel: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  badge: {
    color: colors.textMuted,
    fontSize: 13,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
  },
  body: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: spacing.xl,
    paddingVertical: spacing.lg,
  },
  text: {
    color: colors.text,
    fontWeight: '700',
  },
  hint: {
    fontSize: 24,
    fontWeight: '600',
  },
  options: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderRadius: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
  optionLabel: {
    fontSize: 28,
    fontWeight: '800',
  },
  optionText: {
    flex: 1,
    color: colors.text,
    fontSize: 28,
    fontWeight: '600',
  },
  joiner: {
    alignSelf: 'center',
    color: colors.textMuted,
    fontSize: 20,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
