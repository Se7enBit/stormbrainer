import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Spark } from '../src/sparks/types';
import { useSavedStore } from '../src/store/savedStore';
import { useSparkStore } from '../src/store/sparkStore';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { colors, spacing, typeColors } from '../src/ui/theme';

export default function Saved() {
  const saved = useSavedStore((s) => s.saved);
  const remove = useSavedStore((s) => s.remove);
  const [deleting, setDeleting] = useState<string | null>(null);

  const showAgain = (spark: Spark) => {
    useSparkStore.getState().show(spark);
    router.navigate('/');
  };

  if (saved.length === 0) {
    return (
      <View style={styles.screen}>
        <Text style={styles.empty}>{strings.saved.empty}</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.screen}
      contentContainerStyle={styles.list}
      data={saved}
      keyExtractor={(spark) => spark.id}
      ListHeaderComponent={<Text style={styles.hint}>{strings.saved.hint}</Text>}
      renderItem={({ item }) =>
        deleting === item.id ? (
          <View style={[styles.row, styles.rowDeleting]}>
            <Text style={styles.text} numberOfLines={2}>
              {item.text}
            </Text>
            <View style={styles.actions}>
              <Button label={strings.saved.cancel} onPress={() => setDeleting(null)} grow />
              <Button
                label={strings.saved.delete}
                onPress={() => {
                  remove(item);
                  setDeleting(null);
                }}
                primary
                grow
              />
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => showAgain(item)}
            onLongPress={() => setDeleting(item.id)}
            accessibilityRole="button"
            accessibilityLabel={item.text}
            accessibilityHint={strings.saved.hint}
            accessibilityActions={[{ name: 'longpress', label: strings.saved.delete }]}
            onAccessibilityAction={() => setDeleting(item.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Text style={[styles.type, { color: typeColors[item.type] }]}>
              {strings.types[item.type]}
            </Text>
            <Text style={styles.text}>{item.text}</Text>
          </Pressable>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  hint: {
    color: colors.textMuted,
    fontSize: 14,
    marginBottom: spacing.sm,
  },
  empty: {
    color: colors.textMuted,
    fontSize: 17,
    lineHeight: 24,
    padding: spacing.lg,
  },
  row: {
    gap: spacing.xs,
    padding: spacing.md,
    borderRadius: 14,
    backgroundColor: colors.surface,
  },
  rowDeleting: {
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  pressed: {
    opacity: 0.75,
  },
  type: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  text: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
