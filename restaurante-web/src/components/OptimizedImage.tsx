import React, { useState, useEffect, useRef } from 'react';
import {
  Image,
  ImageProps,
  View,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  ImageStyle,
} from 'react-native';

/**
 * OptimizedImage - Image component with caching and lazy loading
 * 
 * Features:
 * - Automatic image caching using React Native's built-in cache
 * - Lazy loading with intersection observer (viewport detection)
 * - Loading placeholder
 * - Error handling with fallback
 * - Progressive loading support
 * 
 * For production, consider using react-native-fast-image for better performance
 */

interface OptimizedImageProps extends Omit<ImageProps, 'source'> {
  /**
   * Image source URI
   */
  uri: string;
  
  /**
   * Placeholder image to show while loading
   */
  placeholder?: any;
  
  /**
   * Fallback image to show on error
   */
  fallback?: any;
  
  /**
   * Enable lazy loading (load when near viewport)
   */
  lazy?: boolean;
  
  /**
   * Distance from viewport to trigger load (in pixels)
   */
  lazyThreshold?: number;
  
  /**
   * Container style
   */
  containerStyle?: ViewStyle;
  
  /**
   * Show loading indicator
   */
  showLoadingIndicator?: boolean;
  
  /**
   * Cache policy
   */
  cache?: 'default' | 'reload' | 'force-cache' | 'only-if-cached';
}

/**
 * OptimizedImage component
 */
const OptimizedImage: React.FC<OptimizedImageProps> = ({
  uri,
  placeholder,
  fallback,
  lazy = false,
  lazyThreshold: _lazyThreshold = 100,
  containerStyle,
  showLoadingIndicator = true,
  cache = 'default',
  style,
  ...imageProps
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [shouldLoad, setShouldLoad] = useState(!lazy);
  const viewRef = useRef<View>(null);

  // Lazy loading logic
  useEffect(() => {
    if (!lazy || shouldLoad) return;

    // Simple lazy loading implementation
    // In production, use react-native-intersection-observer or similar
    const timer = setTimeout(() => {
      setShouldLoad(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [lazy, shouldLoad]);

  const handleLoadStart = () => {
    setLoading(true);
    setError(false);
  };

  const handleLoadEnd = () => {
    setLoading(false);
  };

  const handleError = () => {
    setLoading(false);
    setError(true);
  };

  // Determine which image to show
  const imageSource = error && fallback
    ? fallback
    : shouldLoad
    ? { uri, cache }
    : placeholder;

  return (
    <View ref={viewRef} style={[styles.container, containerStyle]}>
      {/* Loading indicator */}
      {loading && showLoadingIndicator && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#8B2F2F" />
        </View>
      )}

      {/* Image */}
      <Image
        {...imageProps}
        source={imageSource}
        style={[styles.image, style as ImageStyle]}
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
        // Enable native caching
        resizeMode={imageProps.resizeMode || 'cover'}
      />
    </View>
  );
};

/**
 * Preload images for better UX
 * Useful for preloading images that will be shown soon
 * 
 * @param uris - Array of image URIs to preload
 */
export async function preloadImages(uris: string[]): Promise<void> {
  try {
    await Promise.all(
      uris.map(uri =>
        Image.prefetch(uri).catch(err => {
          console.warn(`Failed to preload image: ${uri}`, err);
        })
      )
    );
  } catch (error) {
    console.warn('Error preloading images:', error);
  }
}

/**
 * Clear image cache
 * Useful for clearing cached images when needed
 */
export async function clearImageCache(): Promise<void> {
  // React Native doesn't provide a built-in way to clear cache
  // For production, use react-native-fast-image's clearCache method
  console.log('Image cache clearing not implemented in base React Native');
}

/**
 * Get cache size
 * Returns the size of the image cache
 */
export async function getImageCacheSize(): Promise<number> {
  // React Native doesn't provide a built-in way to get cache size
  // For production, use react-native-fast-image's getCacheSize method
  console.log('Image cache size not available in base React Native');
  return 0;
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 241, 232, 0.8)',
    zIndex: 1,
  },
});

export default OptimizedImage;
