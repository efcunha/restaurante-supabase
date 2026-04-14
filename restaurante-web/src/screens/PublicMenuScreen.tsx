import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Platform,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPublicMenu,
  filterProducts,
  PublicMenu,
  PublicMenuCategory,
  PublicProduct,
} from '../services/PublicMenuService';
import { StateView } from '../ui';
import logger, { LOG_CATEGORY } from '../utils/logger';
import {
  borderRadius,
  breakpoints,
  designColors,
  fontSizes,
  fontWeights,
  lineHeights,
  shadows,
  spacing,
} from '../design-system';

const CARD_IMAGE_RATIO = 3 / 4;
const CHIP_HEIGHT = 36;
const HERO_MAX_RATIO = 0.35;
const SEARCH_DEBOUNCE_MS = 300;

interface Props {
  slug?: string;
  route?: { params?: { slug?: string } };
}

type ProductRow = PublicProduct[];
type ProductSection = { title: string; slug: string; data: ProductRow[] };

interface ProductCardProps {
  product: PublicProduct;
  primaryColor: string;
  imageHeight: number;
}

function ProductCard({ product, primaryColor, imageHeight }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(product.image_url) && !imgError;

  return (
    <View style={styles.card}>
      <View style={[styles.cardImageContainer, { height: imageHeight }]}>
        {!imgLoaded && !imgError && <View style={[styles.imagePlaceholder, { height: imageHeight }]} />}
        {hasImage ? (
          <Image
            source={{ uri: product.image_url! }}
            style={[styles.cardImage, { height: imageHeight }]}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            accessibilityLabel={product.photo_alt || product.name}
          />
        ) : (
          <View style={[styles.imageFallback, { height: imageHeight }]}>
            <Text style={styles.imageFallbackLabel}>Sem imagem</Text>
          </View>
        )}
        {product.tags?.length ? (
          <View style={styles.badgeRow}>
            {product.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.badge}>
                <Text style={styles.badgeText}>{formatTag(tag)}</Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.ingredients?.length ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {product.ingredients.join(', ')}
          </Text>
        ) : product.description ? (
          <Text style={styles.cardDescription} numberOfLines={1}>
            {product.description}
          </Text>
        ) : null}
        <Text style={[styles.cardPrice, { color: primaryColor }]}>{formatPrice(product)}</Text>
      </View>
    </View>
  );
}

function formatPrice(product: PublicProduct): string {
  if (product.prices && Object.keys(product.prices).length > 0) {
    const prices = Object.values(product.prices).filter((v) => v > 0);
    if (!prices.length) {
      return Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) {
      return min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    return `${min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} - ${max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`;
  }
  return Number(product.price || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

const TAG_LABELS: Record<string, string> = {
  vegano: 'Vegano',
  vegetariano: 'Vegetariano',
  sem_gluten: 'Sem gluten',
  organico: 'Organico',
  picante: 'Picante',
  novidade: 'Novo',
  mais_pedido: 'Mais pedido',
};

function formatTag(tag: string): string {
  return TAG_LABELS[tag] || tag;
}

function chunkProducts(products: PublicProduct[], columns: number): ProductRow[] {
  const rows: ProductRow[] = [];
  for (let i = 0; i < products.length; i += columns) {
    rows.push(products.slice(i, i + columns));
  }
  return rows;
}

export default function PublicMenuScreen({ slug, route }: Props) {
  const resolvedSlug = slug || route?.params?.slug || '';
  const insets = useSafeAreaInsets();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();

  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const sectionListRef = useRef<SectionList<ProductRow, ProductSection>>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadMenu = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setNotFound(false);

      if (!resolvedSlug) {
        setNotFound(true);
        return;
      }

      const data = await fetchPublicMenu(resolvedSlug);
      if (!data) {
        setNotFound(true);
        logger.warn('PublicMenuScreen menu nao encontrado', {
          category: LOG_CATEGORY.MENU,
          slug: resolvedSlug,
        });
        return;
      }

      setMenu(data);
      setActiveCategory(data.categories[0]?.slug || '');
      logger.info('PublicMenuScreen menu carregado', {
        category: LOG_CATEGORY.MENU,
        slug: resolvedSlug,
        categories: data.categories.length,
      });
    } catch (error) {
      setErrorMessage('Nao foi possivel carregar o cardapio agora.');
      logger.error('PublicMenuScreen falha ao carregar menu', error, {
        category: LOG_CATEGORY.MENU,
        slug: resolvedSlug,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMenu();
  }, [resolvedSlug]);

  const primaryColor = menu?.company?.menu_primary_color || designColors.primary[700];
  const columns = viewportWidth >= breakpoints.lg ? 3 : viewportWidth >= breakpoints.md ? 2 : 1;
  const gridGap = spacing[2];
  const horizontalPadding = spacing[3] * 2;
  const cardWidth = (viewportWidth - horizontalPadding - (columns - 1) * gridGap) / columns;
  const cardImageHeight = Math.max(120, Math.floor(cardWidth * CARD_IMAGE_RATIO));
  const heroHeight = Math.round(viewportHeight * HERO_MAX_RATIO);

  const filteredCategories = useMemo((): PublicMenuCategory[] => {
    if (!menu) return [];
    if (!debouncedSearchQuery.trim()) return menu.categories;
    return menu.categories
      .map((cat) => ({
        ...cat,
        products: filterProducts(cat.products, debouncedSearchQuery),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [menu, debouncedSearchQuery]);

  const sections = useMemo(
    () =>
      filteredCategories.map((cat) => ({
        title: cat.label,
        slug: cat.slug,
        data: chunkProducts(cat.products, columns),
      })),
    [filteredCategories, columns],
  );

  const topState: 'loading' | 'error' | 'empty' | 'ready' = loading
    ? 'loading'
    : errorMessage
      ? 'error'
      : notFound || !menu
        ? 'empty'
        : 'ready';

  const handleCategoryChip = (categorySlug: string) => {
    setActiveCategory(categorySlug);
    const sectionIndex = sections.findIndex((s) => s.slug === categorySlug);
    if (sectionIndex >= 0) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex,
        itemIndex: 0,
        animated: true,
        viewOffset: CHIP_HEIGHT + spacing[4],
      });
    }
  };

  if (topState !== 'ready') {
    return (
      <View style={styles.centered}>
        <StateView
          state={topState}
          message={
            topState === 'loading'
              ? 'Carregando cardapio...'
              : topState === 'error'
                ? errorMessage || 'Falha ao carregar cardapio.'
                : 'Cardapio nao encontrado para este endereco.'
          }
          onRetry={loadMenu}
        />
      </View>
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {menu.company.menu_banner_url ? (
        <View style={{ height: heroHeight }}>
          <Image
            source={{ uri: menu.company.menu_banner_url }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={220}
            cachePolicy="memory-disk"
          />
          <View
            style={[
              styles.heroGradient,
              Platform.OS === 'web'
                ? ({ background: 'linear-gradient(to bottom, transparent 35%, rgba(0,0,0,0.58) 100%)' } as any)
                : undefined,
            ]}
          />
          {menu.company.menu_logo_url ? (
            <Image
              source={{ uri: menu.company.menu_logo_url }}
              style={styles.logoOverlay}
              contentFit="contain"
              transition={180}
              cachePolicy="memory-disk"
            />
          ) : null}
        </View>
      ) : (
        <View style={[styles.heroFallback, { height: heroHeight, backgroundColor: primaryColor }]}>
          <Text style={styles.heroFallbackName}>{menu.company.name}</Text>
        </View>
      )}

      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{menu.company.name}</Text>
        {menu.company.city ? <Text style={styles.companyCity}>{menu.company.city}</Text> : null}
      </View>

      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>Buscar</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar no cardapio..."
            placeholderTextColor={designColors.text.tertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar produto"
          />
        </View>
      </View>

      <View style={styles.chipBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipBarContent}
          keyboardShouldPersistTaps="handled"
        >
          {filteredCategories.map((cat) => (
            <TouchableOpacity
              key={cat.slug}
              style={[
                styles.chip,
                activeCategory === cat.slug && {
                  backgroundColor: primaryColor,
                  borderColor: primaryColor,
                },
              ]}
              onPress={() => handleCategoryChip(cat.slug)}
              activeOpacity={0.75}
              accessibilityLabel={`Categoria ${cat.label}`}
            >
              <Text style={[styles.chipText, activeCategory === cat.slug && styles.chipTextActive]}>
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {sections.length === 0 ? (
        <View style={styles.emptySearchContainer}>
          <StateView
            state="empty"
            message={`Nenhum produto encontrado para \"${debouncedSearchQuery}\".`}
            onRetry={() => setSearchQuery('')}
          />
        </View>
      ) : (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item, index) => `${item.map((p) => p.id).join('-')}-${index}`}
          extraData={`${primaryColor}-${columns}`}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: spacing[6] + insets.bottom }]}
          onViewableItemsChanged={({ viewableItems }) => {
            if (!viewableItems.length) return;
            const slug = viewableItems[0].section?.slug;
            if (slug && slug !== activeCategory) {
              setActiveCategory(slug);
            }
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.cardRow}>
              {item.map((product) => (
                <View key={product.id} style={[styles.cardCell, { width: `${100 / columns}%` }]}>
                  <ProductCard product={product} primaryColor={primaryColor} imageHeight={cardImageHeight} />
                </View>
              ))}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: designColors.neutral[50],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
    backgroundColor: designColors.neutral[50],
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'transparent',
  },
  heroFallback: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  heroFallbackName: {
    color: designColors.text.inverse,
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[4],
    width: 64,
    height: 64,
    borderRadius: borderRadius.lg,
    backgroundColor: designColors.surface.card,
  },
  companyInfo: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    backgroundColor: designColors.surface.card,
  },
  companyName: {
    fontSize: fontSizes['2xl'],
    fontWeight: '800',
    color: designColors.text.primary,
    marginBottom: 2,
  },
  companyCity: {
    fontSize: fontSizes.sm,
    color: designColors.text.secondary,
  },
  searchWrapper: {
    backgroundColor: designColors.surface.card,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: designColors.surface.elevated,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing[3],
    minHeight: 42,
    borderWidth: 1,
    borderColor: designColors.border.subtle,
  },
  searchIcon: {
    fontSize: fontSizes.sm,
    color: designColors.text.tertiary,
    marginRight: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: fontSizes.base,
    color: designColors.text.primary,
    paddingVertical: 0,
  },
  chipBar: {
    borderBottomWidth: 1,
    borderBottomColor: designColors.border.subtle,
    backgroundColor: designColors.surface.card,
  },
  chipBarContent: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    flexDirection: 'row',
    gap: spacing[2],
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing[3],
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1,
    borderColor: designColors.border.default,
    backgroundColor: designColors.surface.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.semibold,
    color: designColors.text.secondary,
  },
  chipTextActive: {
    color: designColors.text.inverse,
  },
  listContent: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
  },
  sectionHeader: {
    paddingHorizontal: spacing[1],
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
  },
  sectionTitle: {
    fontSize: fontSizes.xl,
    fontWeight: '800',
    color: designColors.text.primary,
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: spacing[2],
  },
  cardCell: {
    paddingHorizontal: spacing[1],
  },
  card: {
    backgroundColor: designColors.surface.card,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: designColors.border.subtle,
    ...(shadows.sm as object),
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: designColors.neutral[100],
  },
  cardImage: {
    width: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    width: '100%',
    backgroundColor: designColors.neutral[200],
    top: 0,
    left: 0,
  },
  imageFallback: {
    width: '100%',
    backgroundColor: designColors.neutral[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackLabel: {
    color: designColors.text.secondary,
    fontSize: fontSizes.sm,
    fontWeight: fontWeights.medium,
  },
  badgeRow: {
    position: 'absolute',
    bottom: spacing[1],
    left: spacing[1],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
  },
  badgeText: {
    color: designColors.text.inverse,
    fontSize: fontSizes.xs,
    fontWeight: fontWeights.semibold,
  },
  cardBody: {
    padding: spacing[2],
  },
  cardName: {
    fontSize: fontSizes.sm,
    fontWeight: '700',
    color: designColors.text.primary,
    lineHeight: fontSizes.base * lineHeights.tight,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: fontSizes.xs,
    color: designColors.text.secondary,
    lineHeight: fontSizes.sm * lineHeights.tight,
    marginBottom: spacing[1],
  },
  cardPrice: {
    fontSize: fontSizes.base,
    fontWeight: '800',
    marginTop: spacing[1],
  },
  emptySearchContainer: {
    paddingHorizontal: spacing[3],
    paddingTop: spacing[4],
  },
});
