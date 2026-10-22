/**
 * Product catalog with the companion article's interaction markers.
 * @format
 */

import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  ScrollView,
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

type Product = {
  id: number;
  title: string;
  description: string;
  category: string;
  price: number;
  rating: number;
  stock: number;
  brand?: string;
  thumbnail: string;
  images: string[];
};

type ProductResponse = {products: Product[]};

const colors = {
  light: {
    background: '#fafafa',
    card: '#ffffff',
    foreground: '#171717',
    muted: '#737373',
    border: '#e5e5e5',
    primary: '#171717',
    primaryForeground: '#fafafa',
    subtle: '#f5f5f5',
    success: '#16a34a',
  },
  dark: {
    background: '#09090b',
    card: '#18181b',
    foreground: '#fafafa',
    muted: '#a1a1aa',
    border: '#27272a',
    primary: '#fafafa',
    primaryForeground: '#18181b',
    subtle: '#27272a',
    success: '#4ade80',
  },
};

type AppStyles = ReturnType<typeof createStyles>;

function ActionButton({
  label,
  accessibilityLabel,
  onPress,
  variant,
  compact = false,
  styles,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  variant: 'primary' | 'outline' | 'ghost';
  compact?: boolean;
  styles: AppStyles;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={({pressed}) => [
        styles.button,
        variant === 'primary'
          ? styles.primaryButton
          : variant === 'outline'
            ? styles.outlineButton
            : styles.ghostButton,
        compact && styles.compactButton,
        pressed && styles.pressedButton,
      ]}>
      <Text
        style={[
          variant === 'primary' ? styles.primaryButtonText : styles.buttonText,
          compact && styles.compactButtonText,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

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

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <StatusBar
        backgroundColor={isDarkMode ? colors.dark.background : colors.light.background}
        barStyle={isDarkMode ? 'light-content' : 'dark-content'}
      />
      <AppContent isDarkMode={isDarkMode} />
    </SafeAreaProvider>
  );
}

function AppContent({isDarkMode}: {isDarkMode: boolean}) {
  const styles = useMemo(
    () => createStyles(isDarkMode ? colors.dark : colors.light),
    [isDarkMode],
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(
    'loading',
  );
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(() => new Set());
  const [measureReady, setMeasureReady] = useState(false);
  const navigationSpan = useRef<Span | null>(null);
  const updateSpan = useRef<Span | null>(null);
  const navigationStart = useRef<number | null>(null);
  const updateStart = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadState('loading');
    fetch('https://dummyjson.com/products?limit=0', {
      signal: controller.signal,
    })
      .then(response => {
        if (!response.ok) {
          throw new Error(`Products request failed: ${response.status}`);
        }
        return response.json() as Promise<ProductResponse>;
      })
      .then(data => {
        if (!Array.isArray(data.products)) {
          throw new Error('Products response is missing products');
        }
        setProducts(data.products);
        setLoadState('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setLoadState('error');
        }
      });
    return () => controller.abort();
  }, [loadAttempt]);

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

  const selectedProduct = products.find(product => product.id === selectedId);
  const visibleProducts = favoritesOnly
    ? products.filter(product => favoriteIds.has(product.id))
    : products;

  function openItem(item: Product) {
    navigationStart.current = performance.now();
    if (measureReady) {
      navigationSpan.current?.setStatus(SpanStatus.Error).end();
      navigationSpan.current = Measure.startSpan({name: 'catalog_to_detail'});
      navigationSpan.current.setAttribute('item_id', item.id);
      navigationSpan.current.setAttribute('item_count', products.length);
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

  function toggleFavorite(item: Product) {
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
    <SafeAreaView style={styles.safeArea}>
      {selectedProduct ? (
        // Distinct keys make the detail view mount (and fire onLayout) instead of
        // React reusing the catalog's container view.
        <View key="detail" style={styles.screen} onLayout={markDetailLayout}>
          <View style={styles.detailHeader}>
            <ActionButton
              label="← Back to catalog"
              accessibilityLabel="Back to catalog"
              onPress={closeItem}
              variant="ghost"
              styles={styles}
            />
            <ActionButton
              label={favoriteIds.has(selectedProduct.id) ? '♥︎ Saved' : '♡ Favorite'}
              accessibilityLabel={`Toggle favorite for product ${selectedProduct.id}: ${selectedProduct.title}`}
              onPress={() => toggleFavorite(selectedProduct)}
              variant="outline"
              compact
              styles={styles}
            />
          </View>
          <ScrollView contentContainerStyle={styles.detailContent}>
            <View style={styles.detailImageFrame}>
              <Image
                source={{
                  uri: selectedProduct.images[0] || selectedProduct.thumbnail,
                }}
                style={styles.detailImage}
                resizeMode="contain"
                accessibilityLabel={selectedProduct.title}
              />
            </View>
            <View style={styles.detailCard}>
              <Text style={styles.eyebrow}>
                {selectedProduct.brand || selectedProduct.category}
              </Text>
              <Text style={styles.detailTitle}>{selectedProduct.title}</Text>
              <View style={styles.detailMeta}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>
                    {selectedProduct.stock > 0 ? 'In stock' : 'Out of stock'}
                  </Text>
                </View>
                <Text style={styles.rating}>
                  ★ {selectedProduct.rating.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.detailPrice}>
                ${selectedProduct.price.toFixed(2)}
              </Text>
              <View style={styles.divider} />
              <Text style={styles.fieldLabel}>About this product</Text>
              <Text style={styles.description}>
                {selectedProduct.description}
              </Text>
            </View>
          </ScrollView>
        </View>
      ) : (
        <View key="catalog" style={styles.screen}>
          <View style={styles.catalogHeader}>
            <View style={styles.catalogTopBar}>
              <Text style={styles.eyebrow}>THE CATALOG</Text>
              <ActionButton
                label={`♡ Favorites ${favoriteIds.size}`}
                accessibilityLabel={favoritesOnly ? 'Show all products' : 'Show favorites'}
                onPress={() => setFavoritesOnly(value => !value)}
                variant={favoritesOnly ? 'primary' : 'outline'}
                compact
                styles={styles}
              />
            </View>
            <Text style={styles.title}>
              {favoritesOnly ? 'Favorites' : 'Products'}
            </Text>
            <Text style={styles.subtitle}>
              {loadState === 'ready'
                ? favoritesOnly
                  ? `${visibleProducts.length} saved products`
                  : `${products.length} products to explore`
                : 'Explore the collection'}
            </Text>
            <View style={styles.measureStatus}>
              <Text style={measureReady ? styles.measureReady : styles.measurePending}>
                {measureReady ? '✓' : '○'}
              </Text>
              <Text style={styles.measureText}>
                Measure {measureReady ? 'initialized' : 'initializing'}
              </Text>
            </View>
          </View>
          <FlatList
            data={visibleProducts}
            extraData={favoriteIds}
            keyExtractor={item => String(item.id)}
            numColumns={3}
            columnWrapperStyle={styles.productRow}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyCard}>
                {loadState === 'loading' ? (
                  <>
                    <ActivityIndicator
                      color={isDarkMode ? colors.dark.foreground : colors.light.foreground}
                    />
                    <Text style={styles.emptyText}>Loading products…</Text>
                  </>
                ) : loadState === 'error' ? (
                  <>
                    <Text style={styles.emptyTitle}>Products unavailable</Text>
                    <Text style={styles.emptyText}>
                      Check your connection and try again.
                    </Text>
                    <ActionButton
                      label="Try again"
                      accessibilityLabel="Try loading products again"
                      onPress={() => setLoadAttempt(attempt => attempt + 1)}
                      variant="outline"
                      styles={styles}
                    />
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle}>No favorites yet</Text>
                    <Text style={styles.emptyText}>
                      Save a product to keep it here.
                    </Text>
                    <ActionButton
                      label="Browse products"
                      accessibilityLabel="Show all products"
                      onPress={() => setFavoritesOnly(false)}
                      variant="outline"
                      styles={styles}
                    />
                  </>
                )}
              </View>
            }
            renderItem={({item}) => (
              <View style={styles.productCard}>
                <View style={styles.productImageFrame}>
                  <Image
                    source={{uri: item.thumbnail}}
                    style={styles.productImage}
                    resizeMode="contain"
                    accessibilityLabel={item.title}
                  />
                </View>
                <View style={styles.productBody}>
                  <Text style={styles.productCategory} numberOfLines={1}>
                    {item.category.replace(/-/g, ' ')}
                  </Text>
                  <Text style={styles.productTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.productMeta}>
                    <Text style={styles.productPrice}>
                      ${item.price.toFixed(2)}
                    </Text>
                    <Text style={styles.productRating}>
                      ★ {item.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
                <View style={styles.productActions}>
                  <ActionButton
                    label="Open"
                    accessibilityLabel={`Open product ${item.id}: ${item.title}`}
                    onPress={() => openItem(item)}
                    variant="primary"
                    compact
                    styles={styles}
                  />
                  <ActionButton
                    label={favoriteIds.has(item.id) ? '♥︎' : '♡'}
                    accessibilityLabel={`Toggle favorite for product ${item.id}: ${item.title}`}
                    onPress={() => toggleFavorite(item)}
                    variant="outline"
                    compact
                    styles={styles}
                  />
                </View>
              </View>
            )}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(theme: typeof colors.light) {
  return StyleSheet.create({
    safeArea: {flex: 1, backgroundColor: theme.background},
    screen: {flex: 1, backgroundColor: theme.background},
    catalogHeader: {paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12},
    catalogTopBar: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    eyebrow: {
      color: theme.muted,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.2,
    },
    title: {
      color: theme.foreground,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.8,
      marginTop: 4,
    },
    subtitle: {color: theme.muted, fontSize: 13, marginTop: 2},
    measureStatus: {alignItems: 'center', flexDirection: 'row', gap: 6, marginTop: 8},
    measureReady: {color: theme.success, fontSize: 16, fontWeight: '700'},
    measurePending: {color: theme.muted, fontSize: 16},
    measureText: {color: theme.muted, fontSize: 12},
    listContent: {paddingHorizontal: 16, paddingBottom: 24},
    productRow: {gap: 8},
    productCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      marginBottom: 8,
      overflow: 'hidden',
      width: '31.8%',
    },
    productImageFrame: {
      backgroundColor: theme.subtle,
      height: 92,
      margin: 6,
      borderRadius: 6,
    },
    productImage: {height: '100%', width: '100%'},
    productBody: {flexGrow: 1, paddingHorizontal: 8},
    productCategory: {
      color: theme.muted,
      fontSize: 8,
      fontWeight: '700',
      letterSpacing: 0.3,
      textTransform: 'uppercase',
    },
    productTitle: {
      color: theme.foreground,
      fontSize: 12,
      fontWeight: '600',
      lineHeight: 16,
      marginTop: 3,
      minHeight: 32,
    },
    productMeta: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginTop: 6,
    },
    productRating: {color: theme.muted, fontSize: 9},
    productPrice: {
      color: theme.foreground,
      fontSize: 13,
      fontWeight: '700',
    },
    productActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 8,
    },
    emptyCard: {
      alignItems: 'center',
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      gap: 12,
      padding: 28,
    },
    emptyTitle: {color: theme.foreground, fontSize: 18, fontWeight: '600'},
    emptyText: {color: theme.muted, fontSize: 14, textAlign: 'center'},
    badge: {
      alignSelf: 'flex-start',
      backgroundColor: theme.subtle,
      borderRadius: 6,
      paddingHorizontal: 9,
      paddingVertical: 5,
    },
    badgeText: {color: theme.foreground, fontSize: 11, fontWeight: '600'},
    button: {
      alignItems: 'center',
      borderRadius: 6,
      justifyContent: 'center',
      minHeight: 42,
      paddingHorizontal: 14,
    },
    compactButton: {minHeight: 34, paddingHorizontal: 8},
    compactButtonText: {fontSize: 13},
    primaryButton: {backgroundColor: theme.primary},
    outlineButton: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderWidth: 1,
    },
    ghostButton: {alignSelf: 'flex-start', paddingHorizontal: 0},
    pressedButton: {opacity: 0.8},
    primaryButtonText: {
      color: theme.primaryForeground,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonText: {color: theme.foreground, fontSize: 14, fontWeight: '600'},
    detailHeader: {
      alignItems: 'center',
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 12,
    },
    detailContent: {paddingBottom: 24},
    detailImageFrame: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      height: 200,
      marginHorizontal: 20,
      overflow: 'hidden',
    },
    detailImage: {height: '100%', width: '100%'},
    detailCard: {
      backgroundColor: theme.card,
      borderColor: theme.border,
      borderRadius: 10,
      borderWidth: 1,
      marginHorizontal: 20,
      marginTop: 16,
      padding: 20,
    },
    detailTitle: {
      color: theme.foreground,
      fontSize: 26,
      fontWeight: '700',
      lineHeight: 32,
      marginBottom: 12,
      marginTop: 8,
    },
    detailMeta: {alignItems: 'center', flexDirection: 'row', gap: 12},
    rating: {color: theme.muted, fontSize: 13},
    detailPrice: {
      color: theme.foreground,
      fontSize: 24,
      fontWeight: '700',
      marginTop: 20,
    },
    divider: {
      backgroundColor: theme.border,
      height: 1,
      marginVertical: 20,
    },
    fieldLabel: {
      color: theme.foreground,
      fontSize: 14,
      fontWeight: '600',
      marginBottom: 12,
    },
    description: {
      color: theme.muted,
      fontSize: 14,
      lineHeight: 21,
      marginBottom: 24,
    },
  });
}

export default App;
