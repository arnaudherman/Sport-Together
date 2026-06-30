import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFeedRepository } from '@/core/di/repositories-context';
import type { FeedItem } from '@/domain/entities/feed';
import { FeedItemCard } from '@/ui/feed-item-card';

export default function HomeScreen() {
  const feedRepository = useFeedRepository();
  const [items, setItems] = useState<FeedItem[]>([]);

  useEffect(() => {
    let active = true;
    feedRepository.listGroupFeed('demo-group').then((feed) => {
      if (active) setItems(feed);
    });
    return () => {
      active = false;
    };
  }, [feedRepository]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Feed du groupe</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <FeedItemCard item={item} />}
        contentContainerStyle={styles.list}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16 },
  title: { fontSize: 22, fontWeight: '700', paddingVertical: 16 },
  list: { gap: 12, paddingBottom: 24 },
});
