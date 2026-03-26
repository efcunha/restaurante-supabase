import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Platform,
  SectionList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  fetchPublicMenu,
  filterProducts,
  PublicMenu,
  PublicProduct,
  PublicMenuCategory,
  normalizeSearch,
} from '../services/PublicMenuService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_IMAGE_RATIO = 3 / 4; // largura / altura = 4:3
const CARD_IMAGE_HEIGHT = (SCREEN_WIDTH / 2 - 24) * CARD_IMAGE_RATIO;
const CHIP_HEIGHT = 36;
const HERO_MAX_RATIO = 0.35; // maximo 35% da viewport

interface Props {
  slug?: string;
  route?: { params?: { slug?: string } };
}

// ─────────────────────────────────────────────
// Sub-componente: ProductCard
// ─────────────────────────────────────────────
interface ProductCardProps {
  product: PublicProduct;
  primaryColor: string;
}

function ProductCard({ product, primaryColor }: ProductCardProps) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);

  const hasImage = product.image_url && !imgError;

  return (
    <View style={styles.card}>
      {/* Foto */}
      <View style={[styles.cardImageContainer, { height: CARD_IMAGE_HEIGHT }]}>
        {!imgLoaded && !imgError && (
          <View style={[styles.imagePlaceholder, { height: CARD_IMAGE_HEIGHT }]} />
        )}
        {hasImage ? (
          <Image
            source={{ uri: product.image_url! }}
            style={[styles.cardImage, { height: CARD_IMAGE_HEIGHT }]}
            onLoad={() => setImgLoaded(true)}
            onError={() => setImgError(true)}
            accessibilityLabel={product.photo_alt || product.name}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.imageFallback, { height: CARD_IMAGE_HEIGHT }]}>
            <Text style={styles.imageFallbackIcon}>🍽️</Text>
          </View>
        )}
        {/* Badges */}
        {product.tags && product.tags.length > 0 && (
          <View style={styles.badgeRow}>
            {product.tags.slice(0, 2).map((tag) => (
              <View key={tag} style={styles.badge}>
                <Text style={styles.badgeText}>{formatTag(tag)}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.cardBody}>
        <Text style={styles.cardName} numberOfLines={2}>
          {product.name}
        </Text>
        {product.ingredients && product.ingredients.length > 0 ? (
          <Text style={styles.cardDescription} numberOfLines={2}>
            {product.ingredients.join(", ")}
          </Text>
        ) : product.description ? (
          <Text style={styles.cardDescription} numberOfLines={1}>
            {product.description}
          </Text>
        ) : null}

        <View style={styles.cardFooter}>
          <Text style={[styles.cardPrice, { color: primaryColor }]}>
            {formatPrice(product)}
          </Text>
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function formatPrice(product: PublicProduct): string {
  if (product.prices && Object.keys(product.prices).length > 0) {
    const prices = Object.values(product.prices).filter((v) => v > 0);
    if (prices.length === 0) return `R$ ${product.price?.toFixed(2) ?? '0,00'}`;
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    if (min === max) return `R$ ${min.toFixed(2)}`;
    return `R$ ${min.toFixed(2)} – ${max.toFixed(2)}`;
  }
  return `R$ ${product.price?.toFixed(2) ?? '0,00'}`;
}

const TAG_LABELS: Record<string, string> = {
  vegano: '🌱 Vegano',
  vegetariano: '🥗 Veg',
  sem_gluten: 'S/ Glúten',
  organico: '♻️ Orgânico',
  picante: '🌶️ Picante',
  novidade: '✨ Novo',
  mais_pedido: '⭐ +Pedido',
};

function formatTag(tag: string): string {
  return TAG_LABELS[tag] || tag;
}

// ─────────────────────────────────────────────
// Tela principal: PublicMenuScreen
// ─────────────────────────────────────────────
export default function PublicMenuScreen({ slug, route }: Props) {
  const resolvedSlug = slug || route?.params?.slug || '';
  const insets = useSafeAreaInsets();

  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('');

  const sectionListRef = useRef<SectionList>(null);
  const chipScrollRef = useRef<ScrollView>(null);
  const sectionOffsets = useRef<Record<string, number>>({});

  // Carregar menu
  useEffect(() => {
    if (!resolvedSlug) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    fetchPublicMenu(resolvedSlug).then((data) => {
      if (data) {
        setMenu(data);
        if (data.categories.length > 0) {
          setActiveCategory(data.categories[0].slug);
        }
      } else {
        setNotFound(true);
      }
      setLoading(false);
    });
  }, [resolvedSlug]);

  const primaryColor = menu?.company?.menu_primary_color || '#E85D04';

  // Categorias filtradas por busca
  const filteredCategories = useMemo((): PublicMenuCategory[] => {
    if (!menu) return [];
    if (!searchQuery.trim()) return menu.categories;
    return menu.categories
      .map((cat) => ({
        ...cat,
        products: filterProducts(cat.products, searchQuery),
      }))
      .filter((cat) => cat.products.length > 0);
  }, [menu, searchQuery]);

  // Sections para SectionList
  const sections = filteredCategories.map((cat) => ({
    title: cat.label,
    slug: cat.slug,
    data: cat.products,
  }));

  const handleCategoryChip = (slug: string) => {
    setActiveCategory(slug);
    const offset = sectionOffsets.current[slug];
    if (offset !== undefined) {
      sectionListRef.current?.scrollToLocation({
        sectionIndex: sections.findIndex((s) => s.slug === slug),
        itemIndex: 0,
        animated: true,
        viewOffset: CHIP_HEIGHT + 48,
      });
    }
  };

  // ─── Render ───
  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E85D04" />
        <Text style={styles.loadingText}>Carregando cardápio...</Text>
      </View>
    );
  }

  if (notFound || !menu) {
    return (
      <View style={styles.centered}>
        <Text style={styles.notFoundIcon}>🍽️</Text>
        <Text style={styles.notFoundTitle}>Cardápio não encontrado</Text>
        <Text style={styles.notFoundSub}>
          Verifique o QR code ou o endereço do cardápio.
        </Text>
      </View>
    );
  }

  const heroHeight = Math.round(Dimensions.get('window').height * HERO_MAX_RATIO);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* ── HERO ── */}
      {menu.company.menu_banner_url ? (
        <View style={{ height: heroHeight }}>
          <Image
            source={{ uri: menu.company.menu_banner_url }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <View
            style={[
              styles.heroGradient,
              Platform.OS === 'web'
                ? ({ background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.55) 100%)' } as any)
                : undefined,
            ]}
          />
          {menu.company.menu_logo_url && (
            <Image
              source={{ uri: menu.company.menu_logo_url }}
              style={styles.logoOverlay}
              resizeMode="contain"
            />
          )}
        </View>
      ) : (
        <View style={[styles.heroFallback, { height: heroHeight, backgroundColor: primaryColor }]}>
          <Text style={styles.heroFallbackName}>{menu.company.name}</Text>
        </View>
      )}

      {/* ── INFO DA EMPRESA ── */}
      <View style={styles.companyInfo}>
        <Text style={styles.companyName}>{menu.company.name}</Text>
        {menu.company.city ? (
          <Text style={styles.companyCity}>📍 {menu.company.city}</Text>
        ) : null}
      </View>

      {/* ── BUSCA ── */}
      <View style={styles.searchWrapper}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar no cardápio..."
            placeholderTextColor="#9E9E9E"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            accessibilityLabel="Buscar produto"
          />
        </View>
      </View>

      {/* ── CHIPS DE CATEGORIA (sticky) ── */}
      <View style={[styles.chipBar, { backgroundColor: '#FFFFFF' }]}>
        <ScrollView
          ref={chipScrollRef}
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
            >
              <Text
                style={[
                  styles.chipText,
                  activeCategory === cat.slug && styles.chipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── LISTA DE PRODUTOS ── */}
      {sections.length === 0 ? (
        <View style={styles.emptySearch}>
          <Text style={styles.emptySearchIcon}>🔍</Text>
          <Text style={styles.emptySearchText}>
            Nenhum produto encontrado para "{searchQuery}"
          </Text>
        </View>
      ) : (
        <SectionList
          ref={sectionListRef}
          sections={sections}
          keyExtractor={(item) => item.id}
          extraData={primaryColor}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 24 + insets.bottom },
          ]}
          stickySectionHeadersEnabled={false}
          onViewableItemsChanged={({ viewableItems }) => {
            if (viewableItems.length > 0) {
              const first = viewableItems[0];
              const secIdx = first.section?.slug;
              if (secIdx && secIdx !== activeCategory) {
                setActiveCategory(secIdx);
              }
            }
          }}
          viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
          renderSectionHeader={({ section }) => (
            <View
              style={styles.sectionHeader}
              onLayout={(e) => {
                sectionOffsets.current[section.slug] = e.nativeEvent.layout.y;
              }}
            >
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item, index, section }) => {
            // Grid 2 colunas: renderizar par como linha
            if (index % 2 !== 0) return null;
            const next = section.data[index + 1];
            return (
              <View style={styles.cardRow}>
                <View style={styles.cardCell}>
                  <ProductCard
                    product={item}
                    primaryColor={primaryColor}
                  />
                </View>
                <View style={styles.cardCell}>
                  {next ? (
                    <ProductCard
                      product={next}
                      primaryColor={primaryColor}
                    />
                  ) : (
                    <View style={styles.cardPlaceholder} />
                  )}
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
    padding: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6B6B6B',
  },
  notFoundIcon: { fontSize: 56, marginBottom: 16 },
  notFoundTitle: { fontSize: 20, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 },
  notFoundSub: { fontSize: 14, color: '#6B6B6B', textAlign: 'center', lineHeight: 20 },

  // Hero
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    // Linear gradient overlay handled via a web-only inline style applied in JSX
    backgroundColor: 'transparent',
  },
  heroFallback: {
    justifyContent: 'flex-end',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  heroFallbackName: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '800',
  },
  logoOverlay: {
    position: 'absolute',
    bottom: 12,
    left: 16,
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: '#FFF',
  },

  // Empresa
  companyInfo: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  companyName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1A1A1A',
    marginBottom: 2,
  },
  companyCity: {
    fontSize: 13,
    color: '#6B6B6B',
  },

  // Busca
  searchWrapper: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: { fontSize: 16, marginRight: 6 },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1A1A1A',
    paddingVertical: 0,
  },

  // Chips
  chipBar: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFEFEF',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  chipBarContent: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
    flexDirection: 'row',
  },
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: 14,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1.5,
    borderColor: '#D0D0D0',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4A4A4A',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },

  // Lista
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  sectionHeader: {
    paddingHorizontal: 4,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1A1A1A',
  },
  cardRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  cardCell: {
    flex: 1,
    marginHorizontal: 4,
  },
  cardPlaceholder: { flex: 1 },

  // Card
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  cardImageContainer: {
    position: 'relative',
    width: '100%',
    backgroundColor: '#F2F2F0',
  },
  cardImage: {
    width: '100%',
  },
  imagePlaceholder: {
    position: 'absolute',
    width: '100%',
    backgroundColor: '#EBEBEB',
    top: 0,
    left: 0,
  },
  imageFallback: {
    width: '100%',
    backgroundColor: '#F5F0EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageFallbackIcon: { fontSize: 36 },
  badgeRow: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  cardBody: {
    padding: 10,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 18,
    marginBottom: 2,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6B6B6B',
    lineHeight: 16,
    marginBottom: 6,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  cardPrice: {
    fontSize: 15,
    fontWeight: '800',
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 22,
  },

  // Sem resultado
  emptySearch: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 48,
  },
  emptySearchIcon: { fontSize: 42, marginBottom: 12 },
  emptySearchText: {
    fontSize: 15,
    color: '#6B6B6B',
    textAlign: 'center',
    lineHeight: 22,
  },

  // Carrinho flutuante
  cartBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  cartBarText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    flex: 1,
  },
  cartBarSubtotal: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  cartBarButton: {
    backgroundColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cartBarButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
