/**
 * Fixed-data benchmark flows for the companion article.
 * @format
 */

import React, {useEffect, useRef, useState} from 'react';
import {
  Button,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {
  Measure,
  MeasureConfig,
  SpanStatus,
  type Span,
} from '@measuresh/react-native';

type CatalogItem = {
  id: number;
  name: string;
  inStock: boolean;
};

// React Native provides performance.now() at runtime; the 0.81 typings omit it.
declare const performance: {now(): number};

// Benchmark trial log, read from logcat/console by the device harness. It is
// independent of Measure so every trial is recorded even if an upload fails.
function logTrial(flow: string, startedAt: number, status: 'ok' | 'error') {
  const durationMs = performance.now() - startedAt;
  console.log(
    `PERFLAB ${JSON.stringify({flow, duration_ms: Number(durationMs.toFixed(2)), status})}`,
  );
}

const g = globalThis as {nativeFabricUIManager?: unknown; RN$Bridgeless?: boolean};
console.log(
  `PERFLAB ${JSON.stringify({
    flow: 'runtime',
    fabric: g.nativeFabricUIManager != null,
    bridgeless: g.RN$Bridgeless === true,
    dev: __DEV__,
  })}`,
);

const ITEMS: CatalogItem[] = Array.from({length: 300}, (_, index) => ({
  id: index + 1,
  name: `Item ${String(index + 1).padStart(3, '0')}`,
  inStock: (index + 1) % 7 !== 0,
}));

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [measureReady, setMeasureReady] = useState(false);
  const navigationSpan = useRef<Span | null>(null);
  const updateSpan = useRef<Span | null>(null);
  const navigationStart = useRef<number | null>(null);
  const updateStart = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    Measure.init({config: new MeasureConfig({})})
      .then(() => {
        if (mounted) {
          setMeasureReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setMeasureReady(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (measureReady) {
      Measure.trackScreenView({
        screenName: selectedId === null ? 'Catalog' : 'Item Detail',
      }).catch(() => {});
    }
  }, [measureReady, selectedId]);

  useEffect(() => {
    const span = updateSpan.current;
    const startedAt = updateStart.current;
    if (span === null && startedAt === null) {
      return;
    }
    const frame = requestAnimationFrame(() => {
      if (updateStart.current === startedAt && startedAt !== null) {
        logTrial('favorite_update', startedAt, 'ok');
        updateStart.current = null;
      }
      if (span !== null && updateSpan.current === span) {
        span.setStatus(SpanStatus.Ok).end();
        updateSpan.current = null;
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [favoriteIds]);

  useEffect(() => {
    return () => {
      navigationSpan.current?.setStatus(SpanStatus.Error).end();
      updateSpan.current?.setStatus(SpanStatus.Error).end();
    };
  }, []);

  const visibleItems = ITEMS.filter(item => item.inStock).map(item => ({
    ...item,
    isFavorite: favoriteIds.has(item.id),
  }));
  const selectedItem = ITEMS.find(item => item.id === selectedId);

  function openItem(item: CatalogItem) {
    navigationStart.current = performance.now();
    if (measureReady) {
      navigationSpan.current?.setStatus(SpanStatus.Error).end();
      navigationSpan.current = Measure.startSpan({name: 'catalog_to_detail'});
      navigationSpan.current.setAttribute('item_id', item.id);
      navigationSpan.current.setAttribute('item_count', visibleItems.length);
    }
    setSelectedId(item.id);
  }

  function closeItem() {
    if (navigationStart.current !== null) {
      logTrial('catalog_to_detail', navigationStart.current, 'error');
      navigationStart.current = null;
    }
    navigationSpan.current?.setStatus(SpanStatus.Error).end();
    navigationSpan.current = null;
    setSelectedId(null);
  }

  function toggleFavorite(item: CatalogItem) {
    updateStart.current = performance.now();
    if (measureReady) {
      updateSpan.current?.setStatus(SpanStatus.Error).end();
      updateSpan.current = Measure.startSpan({name: 'favorite_update'});
      updateSpan.current.setAttribute('item_id', item.id);
    }
    setFavoriteIds(current => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function markDetailLayout() {
    const span = navigationSpan.current;
    const startedAt = navigationStart.current;
    if (span === null && startedAt === null) {
      return;
    }
    span?.setCheckpoint('detail_layout');
    requestAnimationFrame(() => {
      if (startedAt !== null && navigationStart.current === startedAt) {
        logTrial('catalog_to_detail', startedAt, 'ok');
        navigationStart.current = null;
      }
      if (span !== null && navigationSpan.current === span) {
        span.setCheckpoint('post_layout_frame');
        span.setStatus(SpanStatus.Ok).end();
        navigationSpan.current = null;
      }
    });
  }

  return (
    <SafeAreaView style={styles.container}>
      {selectedItem ? (
        // Distinct keys make the detail view mount (and fire onLayout) instead of
        // React reusing the catalog's container view.
        <View key="detail" style={styles.container} onLayout={markDetailLayout}>
          <Button title="Back to catalog" onPress={closeItem} />
          <Text>{selectedItem.name}</Text>
          <Text>{selectedItem.inStock ? 'In stock' : 'Out of stock'}</Text>
          <Button
            title={favoriteIds.has(selectedItem.id) ? 'Remove favorite' : 'Add favorite'}
            onPress={() => toggleFavorite(selectedItem)}
            accessibilityLabel={`Toggle favorite for ${selectedItem.name}`}
          />
        </View>
      ) : (
        <View key="catalog" style={styles.container}>
          <Text>Catalog ({visibleItems.length} available items)</Text>
          <Text>Measure JS: {measureReady ? 'initialized' : 'initializing'}</Text>
          <FlatList
            data={visibleItems}
            keyExtractor={item => String(item.id)}
            renderItem={({item}) => (
              <View>
                <Text>{item.name}{item.isFavorite ? ' · Favorite' : ''}</Text>
                <Button
                  title="Open"
                  onPress={() => openItem(item)}
                  accessibilityLabel={`Open ${item.name}`}
                />
                <Button
                  title={item.isFavorite ? 'Remove favorite' : 'Add favorite'}
                  onPress={() => toggleFavorite(item)}
                  accessibilityLabel={`Toggle favorite for ${item.name}`}
                />
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default App;
