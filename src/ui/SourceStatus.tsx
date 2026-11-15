import { Link } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import type { AiProblem } from '../ai/provider';
import type { Mode } from '../sparks/types';
import { strings } from '../strings';
import { colors } from './theme';

interface Props {
  hasKey: boolean;
  problem: AiProblem | null;
  mode?: Mode;
}

/** One line under the controls saying where sparks come from right now, and why. */
export function SourceStatus({ hasKey, problem, mode = 'sparks' }: Props) {
  if (!hasKey) {
    return (
      <Link href="/settings" style={styles.text}>
        {mode === 'brainstorm' ? strings.home.topicNeedsKey : strings.home.sourceNoKey}
      </Link>
    );
  }
  if (problem) {
    return (
      <Link href="/settings" style={[styles.text, styles.problem]} accessibilityLiveRegion="polite">
        {`${strings.home.sourceProblem} ${strings.aiReasons[problem.kind]} ${strings.home.sourceFix}`}
      </Link>
    );
  }
  return <Text style={[styles.text, styles.ok]}>{strings.home.sourceAi}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  problem: {
    color: colors.accent,
  },
  ok: {
    color: '#6EE7A8',
  },
});
