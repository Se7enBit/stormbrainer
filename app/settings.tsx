import Constants from 'expo-constants';
import { useState, type ReactNode } from 'react';
import { Linking, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { API_KEY_URL, DEFAULT_GEMINI_MODEL } from '../src/ai/gemini';
import { AI_ERROR_KINDS, type AiErrorKind } from '../src/ai/provider';
import { useSettingsStore, type KeyStatus } from '../src/store/settingsStore';
import { strings } from '../src/strings';
import { Button } from '../src/ui/Button';
import { colors, spacing } from '../src/ui/theme';

/** Set by CI, so the web preview shows which commit it was built from. */
const commit = process.env.EXPO_PUBLIC_COMMIT_SHA?.slice(0, 7) ?? 'local';

function statusText(status: KeyStatus): string | null {
  if (status === 'none') return null;
  if ((AI_ERROR_KINDS as readonly string[]).includes(status)) {
    return strings.aiErrors[status as AiErrorKind];
  }
  return strings.settings.keyStatus[status as keyof typeof strings.settings.keyStatus];
}

export default function Settings() {
  const hasKey = useSettingsStore((s) => s.hasKey);
  const keyStatus = useSettingsStore((s) => s.keyStatus);
  const model = useSettingsStore((s) => s.model);
  const saveKey = useSettingsStore((s) => s.saveKey);
  const testKey = useSettingsStore((s) => s.testKey);
  const removeKey = useSettingsStore((s) => s.removeKey);
  const setModel = useSettingsStore((s) => s.setModel);

  const [keyDraft, setKeyDraft] = useState('');
  const [modelDraft, setModelDraft] = useState(model);
  // Follow the stored model when it changes (e.g. after startup loads it).
  const [shownModel, setShownModel] = useState(model);
  if (model !== shownModel) {
    setShownModel(model);
    setModelDraft(model);
  }

  const testing = keyStatus === 'testing';
  const status = statusText(keyStatus);
  const storedNote =
    Platform.OS === 'web' ? strings.settings.storedWeb : strings.settings.storedNative;
  const version = Constants.expoConfig?.version ?? '?';

  const onSave = () => {
    const draft = keyDraft;
    setKeyDraft('');
    void saveKey(draft);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Section title={strings.settings.keySection}>
        <Text style={styles.text}>{strings.settings.keyIntro}</Text>
        {hasKey ? (
          <>
            <Text style={styles.text}>
              {strings.settings.keySaved} {storedNote}
            </Text>
            <View style={styles.row}>
              <Button
                label={strings.settings.testKey}
                onPress={() => void testKey()}
                disabled={testing}
                grow
              />
              <Button label={strings.settings.removeKey} onPress={() => void removeKey()} grow />
            </View>
          </>
        ) : (
          <>
            <TextInput
              value={keyDraft}
              onChangeText={setKeyDraft}
              onSubmitEditing={onSave}
              placeholder={strings.settings.keyPlaceholder}
              placeholderTextColor={colors.textMuted}
              accessibilityLabel={strings.settings.keyInputLabel}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              spellCheck={false}
              style={styles.input}
            />
            <Button
              label={strings.settings.saveKey}
              onPress={onSave}
              disabled={keyDraft.trim() === ''}
              primary
            />
            <Text style={styles.note}>{storedNote}</Text>
          </>
        )}
        {status && (
          <Text
            style={[styles.status, keyStatus === 'ok' && styles.statusOk]}
            accessibilityLiveRegion="polite"
          >
            {status}
          </Text>
        )}
        <Text
          style={styles.link}
          accessibilityRole="link"
          onPress={() => void Linking.openURL(API_KEY_URL)}
        >
          {strings.settings.getKey}
        </Text>
      </Section>

      <Section title={strings.settings.advanced}>
        <Text style={styles.label}>{strings.settings.modelLabel}</Text>
        <TextInput
          value={modelDraft}
          onChangeText={setModelDraft}
          onBlur={() => void setModel(modelDraft)}
          onSubmitEditing={() => void setModel(modelDraft)}
          placeholder={DEFAULT_GEMINI_MODEL}
          placeholderTextColor={colors.textMuted}
          accessibilityLabel={strings.settings.modelLabel}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          returnKeyType="done"
          style={styles.input}
        />
        <Text style={styles.note}>{strings.settings.modelHint}</Text>
      </Section>

      <Section title={strings.settings.about}>
        <Text style={styles.text}>{strings.settings.privacy}</Text>
        <Text style={styles.text}>{strings.settings.comingSoon}</Text>
        <Text style={styles.note}>
          {strings.settings.version} {version} · {commit}
        </Text>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  text: {
    color: colors.textMuted,
    fontSize: 16,
    lineHeight: 23,
  },
  label: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  input: {
    color: colors.text,
    fontSize: 16,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  note: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  status: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  statusOk: {
    color: '#6EE7A8',
  },
  link: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
