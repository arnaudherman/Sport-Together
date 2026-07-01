import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useCommentRepository } from '@/core/di/repositories-context';
import type { Comment } from '@/domain/entities/comment';
import type { FeedItem } from '@/domain/entities/feed';
import { avatarColor, handle, initial, timeAgo } from '@/ui/format';
import { colors, font, radius } from '@/ui/theme';

/** Fil de réponses d'un post (commentaires) + composer (ADR-0010). */
export function CommentsScreen({ item, onBack }: { item: FeedItem; onBack: () => void }) {
  const commentRepo = useCommentRepository();
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await commentRepo.listForItem(item.id);
      if (mounted.current) setComments(data);
    } catch {
      if (mounted.current) setComments([]);
    }
  }, [commentRepo, item.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function send() {
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      await commentRepo.add(item.id, value);
      setText('');
      await load();
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  const postAv = avatarColor(item.authorId || item.authorName);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.topRow}>
        <Pressable onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }} style={styles.backRow}>
          <Ionicons name="chevron-back" size={20} color={colors.accent} />
          <Text style={styles.back}>Retour</Text>
        </Pressable>
        <Text style={styles.title}>Réponses</Text>
        <View style={styles.spacer} />
      </View>

      <FlatList
        data={comments}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.post}>
            <View style={[styles.avatar, { backgroundColor: postAv.bg }]}>
              <Text style={[styles.avatarText, { color: postAv.fg }]}>{initial(item.authorName)}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>
                {item.authorName} <Text style={styles.h}>{handle(item.authorName)}</Text>
              </Text>
              <Text style={styles.postText}>{item.summary}</Text>
            </View>
          </View>
        }
        renderItem={({ item: c }) => {
          const av = avatarColor(c.authorId || c.authorName);
          return (
            <View style={styles.comment}>
              <View style={[styles.avatarSm, { backgroundColor: av.bg }]}>
                <Text style={[styles.avatarSmText, { color: av.fg }]}>{initial(c.authorName)}</Text>
              </View>
              <View style={styles.body}>
                <Text style={styles.name}>
                  {c.authorName} <Text style={styles.h}>· {timeAgo(c.createdAt)}</Text>
                </Text>
                <Text style={styles.commentText}>{c.text}</Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>Sois le premier à répondre 💬</Text>}
      />

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Écris une réponse…"
          placeholderTextColor={colors.textFaint}
          value={text}
          onChangeText={setText}
          multiline
        />
        <Pressable style={[styles.send, (!text.trim() || busy) && styles.dim]} onPress={send} disabled={!text.trim() || busy}>
          <Ionicons name="arrow-up" size={20} color="#0B0B0D" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: 16 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8 },
  backRow: { flexDirection: 'row', alignItems: 'center', width: 90 },
  back: { fontSize: 15, color: colors.accent, fontWeight: '700' },
  title: { ...font.h1 },
  spacer: { width: 90 },
  list: { paddingBottom: 12 },
  post: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 6 },
  avatar: { width: 42, height: 42, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '800' },
  avatarSm: { width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' },
  avatarSmText: { fontSize: 14, fontWeight: '800' },
  body: { flex: 1, gap: 2 },
  name: { ...font.title, fontWeight: '800' },
  h: { color: colors.textMuted, fontWeight: '400', fontSize: 13 },
  postText: { ...font.body, marginTop: 2 },
  comment: { flexDirection: 'row', gap: 10, paddingVertical: 10 },
  commentText: { ...font.body },
  empty: { color: colors.textMuted, textAlign: 'center', marginTop: 24 },
  composer: { flexDirection: 'row', gap: 10, alignItems: 'flex-end', paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.lg, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, color: colors.text, maxHeight: 100 },
  send: { width: 40, height: 40, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  dim: { opacity: 0.4 },
});
