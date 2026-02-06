# Image Optimization Guide

This guide explains how to optimize images in the React Native application for better performance.

## Current Implementation

The app includes `OptimizedImage` component with basic caching and lazy loading using React Native's built-in `Image` component.

### Features
- Automatic caching using React Native's cache
- Lazy loading support
- Loading placeholders
- Error handling with fallback images
- Preloading support

### Usage

```tsx
import OptimizedImage from '../components/OptimizedImage';

// Basic usage
<OptimizedImage
  uri="https://example.com/image.jpg"
  style={{ width: 200, height: 200 }}
/>

// With lazy loading
<OptimizedImage
  uri="https://example.com/image.jpg"
  lazy={true}
  lazyThreshold={100}
  style={{ width: 200, height: 200 }}
/>

// With placeholder and fallback
<OptimizedImage
  uri="https://example.com/image.jpg"
  placeholder={require('../assets/placeholder.png')}
  fallback={require('../assets/error.png')}
  style={{ width: 200, height: 200 }}
/>
```

## Recommended: react-native-fast-image

For production apps with many images, we recommend using `react-native-fast-image` for better performance.

### Installation

```bash
npm install react-native-fast-image
# or
yarn add react-native-fast-image

# For iOS
cd ios && pod install
```

### Benefits
- Much faster image loading
- Better caching (disk + memory)
- Priority-based loading
- Preloading support
- Cache management APIs

### Migration Example

Replace `OptimizedImage` with `FastImage`:

```tsx
import FastImage from 'react-native-fast-image';

// Basic usage
<FastImage
  source={{
    uri: 'https://example.com/image.jpg',
    priority: FastImage.priority.normal,
    cache: FastImage.cacheControl.immutable,
  }}
  style={{ width: 200, height: 200 }}
  resizeMode={FastImage.resizeMode.cover}
/>

// With preloading
FastImage.preload([
  {
    uri: 'https://example.com/image1.jpg',
    priority: FastImage.priority.high,
  },
  {
    uri: 'https://example.com/image2.jpg',
  },
]);

// Clear cache
FastImage.clearMemoryCache();
FastImage.clearDiskCache();
```

## Best Practices

### 1. Image Sizing
- Always specify width and height
- Use appropriate image sizes (don't load 4K images for thumbnails)
- Consider using CDN with image resizing (e.g., Cloudinary, imgix)

### 2. Caching Strategy
- Use `cache: 'force-cache'` for static images
- Use `cache: 'reload'` for frequently updated images
- Implement cache invalidation for user-uploaded images

### 3. Lazy Loading
- Enable lazy loading for images below the fold
- Set appropriate threshold (100-200px)
- Preload images for next screen during navigation

### 4. Placeholders
- Use low-quality image placeholders (LQIP)
- Consider blurhash for better UX
- Show loading indicators for slow connections

### 5. Error Handling
- Always provide fallback images
- Log image loading errors for monitoring
- Retry failed loads with exponential backoff

### 6. Performance Optimization
```tsx
// Preload images for next screen
useEffect(() => {
  const unsubscribe = navigation.addListener('focus', () => {
    preloadImages([
      'https://example.com/next-screen-image1.jpg',
      'https://example.com/next-screen-image2.jpg',
    ]);
  });
  return unsubscribe;
}, [navigation]);

// Clear cache on logout
const handleLogout = async () => {
  await clearImageCache();
  // ... logout logic
};
```

## Image Formats

### Recommended Formats
- **WebP**: Best compression, supported on most devices
- **JPEG**: Good for photos
- **PNG**: Good for graphics with transparency
- **SVG**: Best for icons and logos (use react-native-svg)

### Format Selection
```tsx
// Use WebP with JPEG fallback
const imageUri = Platform.select({
  web: 'https://example.com/image.webp',
  default: 'https://example.com/image.jpg',
});
```

## Monitoring

### Track Image Performance
```tsx
const handleLoadStart = () => {
  console.time(`image-load-${uri}`);
};

const handleLoadEnd = () => {
  console.timeEnd(`image-load-${uri}`);
};

<OptimizedImage
  uri={uri}
  onLoadStart={handleLoadStart}
  onLoadEnd={handleLoadEnd}
/>
```

### Monitor Cache Size
```tsx
// Check cache size periodically
useEffect(() => {
  const checkCacheSize = async () => {
    const size = await getImageCacheSize();
    if (size > 100 * 1024 * 1024) { // 100MB
      await clearImageCache();
    }
  };
  
  checkCacheSize();
}, []);
```

## Testing

### Test Image Loading
```tsx
// Test with slow network
import { Image } from 'react-native';

// Simulate slow loading
const slowUri = 'https://via.placeholder.com/600/92c952?text=Slow+Image';

<OptimizedImage
  uri={slowUri}
  showLoadingIndicator={true}
/>
```

### Test Error Handling
```tsx
// Test with invalid URI
<OptimizedImage
  uri="https://invalid-url.com/image.jpg"
  fallback={require('../assets/error.png')}
/>
```

## Migration Checklist

- [ ] Install react-native-fast-image (optional)
- [ ] Replace Image components with OptimizedImage
- [ ] Add placeholders for all images
- [ ] Implement lazy loading for list images
- [ ] Add error fallbacks
- [ ] Implement preloading for critical images
- [ ] Set up cache management
- [ ] Monitor image loading performance
- [ ] Optimize image sizes on server/CDN
- [ ] Test on slow networks

## Resources

- [React Native Image Documentation](https://reactnative.dev/docs/image)
- [react-native-fast-image](https://github.com/DylanVann/react-native-fast-image)
- [Image Optimization Best Practices](https://web.dev/fast/#optimize-your-images)
