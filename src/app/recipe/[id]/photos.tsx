import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { getRepositories } from '@/data';
import { useFocusQuery } from '@/lib/useFocusQuery';

export default function PhotoViewerScreen() {
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const { width, height } = useWindowDimensions();
  const { recipes } = getRepositories();
  const query = useFocusQuery(() => recipes.get(id), [id]);
  const photos = (query.data?.photos ?? []).filter((p) => p.stepId === null);
  const start = Math.max(0, Math.min(Number(index ?? 0) || 0, Math.max(photos.length - 1, 0)));
  const [current, setCurrent] = useState(start);

  return (
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {photos.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: start * width, y: 0 }}
          onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}>
          {photos.map((p) => (
            // Pinch-to-zoom via the native zoom scale of a nested ScrollView (iOS).
            <ScrollView
              key={p.id}
              style={{ width, height }}
              contentContainerStyle={{ width, height, justifyContent: 'center' }}
              maximumZoomScale={4}
              minimumZoomScale={1}
              centerContent
              showsHorizontalScrollIndicator={false}
              showsVerticalScrollIndicator={false}>
              <Image source={{ uri: p.uri }} style={{ width, height: height * 0.8 }} contentFit="contain" />
            </ScrollView>
          ))}
        </ScrollView>
      ) : null}
      <SafeAreaView edges={['top']} style={{ position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 }} pointerEvents="box-none">
        <AppText style={{ color: '#fff' }}>{photos.length > 1 ? `${current + 1} / ${photos.length}` : ''}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={() => router.back()} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
      </SafeAreaView>
    </View>
  );
}
