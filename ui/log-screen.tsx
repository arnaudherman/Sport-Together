import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItemType } from '@/domain/entities/feed';
import { celebrationFor, progressSnapshot, type Celebration, type ProgressSnapshot } from '@/domain/usecases/celebration';
import { levelProgress, xpForType } from '@/domain/usecases/gamification';
import { validateMeal } from '@/domain/usecases/nutrition';
import { CelebrationOverlay } from '@/ui/celebration-overlay';
import { Ring } from '@/ui/ring';
import { Surface } from '@/ui/surface';
import { Avatar } from '@/ui/avatar';
import { colors, font, radius } from '@/ui/theme';

const TABS: { type: FeedItemType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { type: 'session', label: 'Séance', icon: 'barbell-outline' },
  { type: 'steps', label: 'Pas', icon: 'footsteps-outline' },
  { type: 'meal', label: 'Repas', icon: 'restaurant-outline' },
  { type: 'rest', label: 'Repos', icon: 'bed-outline' },
  { type: 'sleep', label: 'Sommeil', icon: 'moon-outline' },
];
const DURATIONS = [15, 30, 45, 60];
const SLEEP_HOURS = [6, 7, 8, 9];

const REWARD_HINT: Record<FeedItemType, string> = {
  session: 'Ta série 🔥 continue et tu approches un palier de ton arbre.',
  steps: 'Ta série 🔥 continue.',
  meal: 'Ta série 🔥 continue. Suivi bienveillant, jamais d\'objectif de poids.',
  rest: 'Ta série 🔥 est protégée : la récupération fait partie de la progression.',
  sleep: 'Bien dormir compte autant qu\'une séance — ta série 🔥 continue.',
};

function toNumber(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const n = parseFloat(value.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
}

/** Composer type Twitter : publier une séance / des pas / un repas (ADR-0002 / 0008). */
export function LogScreen({
  groups,
  userId,
  pseudo,
  avatarUrl,
  onDone,
  onCancel,
}: {
  groups: { id: string; name: string }[];
  userId: string;
  pseudo: string;
  avatarUrl?: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const feed = useFeedRepository();
  const [type, setType] = useState<FeedItemType>('session');
  const [destGroupId, setDestGroupId] = useState<string | null>(null); // null = Mon fil (solo)
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(45);
  const [sleepHours, setSleepHours] = useState(8);
  const [steps, setSteps] = useState('');
  const [mealLabel, setMealLabel] = useState('');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [celebration, setCelebration] = useState<Celebration>(null);
  const before = useRef<ProgressSnapshot | null>(null);
  const mounted = useRef(true);
  const tz = -new Date().getTimezoneOffset();

  // Progression AVANT le log, pour décider s'il faut célébrer (level-up / palier).
  useEffect(() => {
    mounted.current = true;
    feed
      .listUserFeed(userId)
      .then((items) => {
        before.current = progressSnapshot(items, userId, tz);
      })
      .catch(() => {});
    return () => {
      mounted.current = false;
    };
  }, [feed, userId, tz]);

  async function computeCelebration(): Promise<Celebration> {
    if (!before.current) return null;
    try {
      const items = await feed.listUserFeed(userId);
      return celebrationFor(before.current, progressSnapshot(items, userId, tz));
    } catch {
      return null;
    }
  }

  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  }

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      if (type === 'session') {
        await feed.logSession(destGroupId, activity.trim() || 'Séance', duration, photoUri ?? undefined);
      } else if (type === 'rest') {
        await feed.logRest(destGroupId);
      } else if (type === 'sleep') {
        await feed.logSleep(destGroupId, sleepHours);
      } else if (type === 'steps') {
        const n = toNumber(steps);
        if (n == null || n < 0) {
          setError('Nombre de pas invalide.');
          return;
        }
        await feed.logSteps(destGroupId, Math.round(n));
      } else {
        const cal = toNumber(calories);
        const input = {
          label: mealLabel.trim(),
          caloriesKcal: cal != null ? Math.round(cal) : undefined,
          proteinG: toNumber(protein),
          carbsG: toNumber(carbs),
          fatG: toNumber(fat),
        };
        const validation = validateMeal(input);
        if (!validation.ok) {
          setError(validation.error);
          return;
        }
        await feed.logMeal(destGroupId, input, photoUri ?? undefined);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const c = await computeCelebration();
      if (c && mounted.current) {
        setCelebration(c); // l'overlay appelle onDone à sa fermeture
      } else {
        onDone();
      }
    } catch (e) {
      const message = (e as Error).message;
      if (message.startsWith('Publication créée')) {
        // La publication a réussi, seule la photo a échoué : on ne bloque pas.
        Alert.alert('Publié sans la photo', message);
        onDone();
      } else {
        setError(message);
      }
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  // Publier n'est actif que si l'entrée requise du type est renseignée (guide vs erreur).
  const canPublish =
    type === 'session' || type === 'rest' || type === 'sleep'
      ? true
      : type === 'steps'
        ? (() => {
            const n = toNumber(steps);
            return n != null && n > 0;
          })()
        : mealLabel.trim().length > 0;
  const off = busy || !canPublish;
  const destName = destGroupId ? groups.find((g) => g.id === destGroupId)?.name ?? 'ton groupe' : null;
  const rewardRatio = before.current ? levelProgress(before.current.xp).ratio : 0;

  return (
    <View style={styles.root}>
      <View style={styles.sheet}>
      <View style={styles.handle} />
      <View style={styles.bar}>
        <Pressable onPress={onCancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Annuler">
          <Text style={styles.cancel}>Annuler</Text>
        </Pressable>
        <Text style={styles.barTitle}>Nouvelle publication</Text>
        <Pressable
          style={({ pressed }) => [styles.publish, off && styles.dim, pressed && styles.pressed]}
          onPress={submit}
          disabled={off}
          accessibilityRole="button"
          accessibilityLabel="Publier"
          accessibilityState={{ disabled: off, busy }}
        >
          {busy ? <ActivityIndicator color={colors.onAccent} size="small" /> : <Text style={styles.publishText}>Publier</Text>}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {groups.length > 0 ? (
          <View style={styles.dest}>
            <Text style={styles.destLabel}>Publier dans</Text>
            <View style={styles.destChips}>
              <Pressable
                onPress={() => setDestGroupId(null)}
                style={[styles.destChip, destGroupId === null && styles.destChipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: destGroupId === null }}
                accessibilityLabel="Mon fil"
              >
                <Text style={[styles.destChipText, destGroupId === null && styles.destChipTextOn]}>Mon fil</Text>
              </Pressable>
              {groups.map((g) => (
                <Pressable
                  key={g.id}
                  onPress={() => setDestGroupId(g.id)}
                  style={[styles.destChip, destGroupId === g.id && styles.destChipOn]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: destGroupId === g.id }}
                  accessibilityLabel={g.name}
                >
                  <Text style={[styles.destChipText, destGroupId === g.id && styles.destChipTextOn]}>🔒 {g.name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.chips}>
          {TABS.map((t) => {
            const on = type === t.type;
            return (
              <Pressable
                key={t.type}
                onPress={() => setType(t.type)}
                style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                accessibilityLabel={t.label}
              >
                <Ionicons name={t.icon} size={17} color={on ? colors.accent : colors.textMuted} />
                <Text style={[styles.chipText, on && styles.chipTextOn]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.composeRow}>
          <Avatar name={pseudo || 'T'} seed={userId} size={44} url={avatarUrl} />
          {type === 'session' ? (
            <TextInput
              style={styles.compose}
              placeholder="Ta séance du jour ? Raconte… (ex. 45 min de course)"
              placeholderTextColor={colors.textFaint}
              value={activity}
              onChangeText={setActivity}
              multiline
            />
          ) : type === 'rest' ? (
            <Text style={styles.restText}>
              Aujourd&apos;hui, c&apos;est repos 😴{'\n'}
              <Text style={styles.restSub}>Ton streak est protégé — reviens en forme demain.</Text>
            </Text>
          ) : type === 'sleep' ? (
            <Text style={styles.restText}>
              Combien d&apos;heures cette nuit ? 🌙{'\n'}
              <Text style={styles.restSub}>Le sommeil est un pilier de ta progression.</Text>
            </Text>
          ) : type === 'steps' ? (
            <TextInput
              style={styles.compose}
              placeholder="Combien de pas aujourd'hui ?"
              placeholderTextColor={colors.textFaint}
              keyboardType="number-pad"
              value={steps}
              onChangeText={setSteps}
            />
          ) : (
            <TextInput
              style={styles.compose}
              placeholder="Qu'as-tu mangé ? (ex. Buddha bowl)"
              placeholderTextColor={colors.textFaint}
              value={mealLabel}
              onChangeText={setMealLabel}
            />
          )}
        </View>

        {type === 'sleep' ? (
          <View style={styles.durations}>
            {SLEEP_HOURS.map((h) => (
              <Pressable
                key={h}
                onPress={() => setSleepHours(h)}
                style={[styles.dchip, sleepHours === h && styles.dchipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: sleepHours === h }}
                accessibilityLabel={`${h} heures`}
              >
                <Text style={[styles.dchipText, sleepHours === h && styles.dchipTextOn]}>{h} h</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {type === 'session' ? (
          <View style={styles.durations}>
            {DURATIONS.map((d) => (
              <Pressable
                key={d}
                onPress={() => setDuration(d)}
                style={[styles.dchip, duration === d && styles.dchipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: duration === d }}
                accessibilityLabel={`${d} minutes`}
              >
                <Text style={[styles.dchipText, duration === d && styles.dchipTextOn]}>{d} min</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {type === 'meal' ? (
          <View style={styles.macros}>
            <TextInput style={[styles.mInput]} placeholder="kcal" placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={calories} onChangeText={setCalories} />
            <TextInput style={[styles.mInput]} placeholder="Prot." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={protein} onChangeText={setProtein} />
            <TextInput style={[styles.mInput]} placeholder="Gluc." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={carbs} onChangeText={setCarbs} />
            <TextInput style={[styles.mInput]} placeholder="Lip." placeholderTextColor={colors.textFaint} keyboardType="number-pad" value={fat} onChangeText={setFat} />
          </View>
        ) : null}

        {type === 'session' || type === 'meal' ? (
          <View style={styles.tools}>
            {photoUri ? (
              <View style={styles.photoWrap}>
                <Image source={{ uri: photoUri }} style={styles.photoPreview} contentFit="cover" />
                <Pressable
                  style={styles.photoRemove}
                  onPress={() => setPhotoUri(null)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel="Retirer la photo"
                >
                  <Ionicons name="close" size={14} color={colors.text} />
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={({ pressed }) => [styles.photoBtn, pressed && styles.pressed]}
                onPress={pickPhoto}
                accessibilityRole="button"
                accessibilityLabel="Ajouter une photo"
              >
                <Ionicons name="camera-outline" size={19} color={colors.accent} />
                <Text style={styles.photoBtnText}>Ajouter une photo</Text>
              </Pressable>
            )}
          </View>
        ) : null}

        <Surface>
          <View style={styles.reward}>
            <Ring ratio={rewardRatio} value={`${Math.round(rewardRatio * 100)}%`} caption="niveau" size={56} stroke={5.5} />
            <View style={styles.rewardBody}>
              <Text style={styles.rewardLabel}>Récompense</Text>
              <Text style={styles.rewardXp}>
                jusqu’à <Text style={styles.rewardXpNum}>+{xpForType(type)}</Text> XP
              </Text>
              <Text style={styles.rewardHint}>{REWARD_HINT[type]}</Text>
            </View>
          </View>
        </Surface>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.foot}>
          {destGroupId ? `Ta publication apparaîtra dans le fil de ${destName}.` : 'Ta publication apparaîtra dans ton fil.'}
        </Text>
      </ScrollView>

      <CelebrationOverlay celebration={celebration} onDismiss={onDone} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingTop: 46 },
  sheet: { flex: 1, borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: 'hidden', backgroundColor: '#12151D' },
  handle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.track, marginTop: 10, marginBottom: 2 },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cancel: { fontSize: 15, color: colors.textMuted, fontWeight: '600' },
  barTitle: { ...font.title },
  publish: { backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 18, paddingVertical: 9, minWidth: 84, alignItems: 'center' },
  dim: { opacity: 0.7 },
  publishText: { color: colors.onAccent, fontWeight: '800', fontSize: 14 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  scroll: { padding: 16, gap: 14 },
  dest: { gap: 8 },
  destLabel: { ...font.label },
  destChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  destChip: { paddingHorizontal: 14, paddingVertical: 9, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface },
  destChipOn: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  destChipText: { color: colors.textMuted, fontWeight: '700', fontSize: 13 },
  destChipTextOn: { color: colors.accent },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, minHeight: 44, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipOn: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderColor: colors.accent },
  chipIcon: { fontSize: 15 },
  chipText: { color: colors.textMuted, fontWeight: '700' },
  chipTextOn: { color: colors.accent },
  composeRow: { flexDirection: 'row', gap: 12 },
  compose: { flex: 1, fontSize: 18, color: colors.text, paddingTop: 8, minHeight: 60 },
  restText: { flex: 1, fontSize: 18, color: colors.text, paddingTop: 8, lineHeight: 26 },
  restSub: { fontSize: 14, color: colors.textMuted },
  durations: { flexDirection: 'row', gap: 8, paddingLeft: 56 },
  dchip: { paddingHorizontal: 14, paddingVertical: 10, minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.surface },
  dchipOn: { backgroundColor: colors.accentSoft, borderWidth: 1.5, borderColor: colors.accent },
  dchipText: { color: colors.textMuted, fontWeight: '700' },
  dchipTextOn: { color: colors.accent },
  macros: { flexDirection: 'row', gap: 8, paddingLeft: 56 },
  mInput: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, paddingHorizontal: 10, paddingVertical: 12, fontSize: 14, color: colors.text, textAlign: 'center' },
  tools: { flexDirection: 'row', gap: 20, alignItems: 'center', paddingLeft: 56, paddingTop: 2 },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.accentSoft, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 10, minHeight: 40 },
  photoBtnText: { color: colors.accent, fontWeight: '700', fontSize: 13.5 },
  photoWrap: { position: 'relative' },
  photoPreview: { width: 132, height: 74, borderRadius: radius.sm },
  photoRemove: { position: 'absolute', top: -7, right: -7, width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(10,12,16,0.9)', alignItems: 'center', justifyContent: 'center' },
  reward: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 18, paddingVertical: 16 },
  rewardBody: { flex: 1 },
  rewardLabel: { ...font.label },
  rewardXp: { color: colors.textMuted, fontSize: 13, marginTop: 3 },
  rewardXpNum: { ...font.stat, fontSize: 28, color: colors.accent },
  rewardHint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  error: { color: colors.danger, fontSize: 14 },
  foot: { color: colors.textMuted, fontSize: 13 },
});
