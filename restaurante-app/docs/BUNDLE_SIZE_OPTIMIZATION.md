# Bundle Size Optimization Guide

This guide provides strategies and tools for optimizing the React Native app bundle size.

## Current Bundle Analysis

### Analyze Bundle Size

```bash
# Generate bundle stats
npx react-native bundle \
  --platform android \
  --dev false \
  --entry-file index.js \
  --bundle-output android-release.bundle \
  --assets-dest android-release

# Check bundle size
ls -lh android-release.bundle

# For iOS
npx react-native bundle \
  --platform ios \
  --dev false \
  --entry-file index.js \
  --bundle-output ios-release.bundle \
  --assets-dest ios-release

ls -lh ios-release.bundle
```

### Visualize Bundle Contents

```bash
# Install bundle analyzer
npm install --save-dev react-native-bundle-visualizer

# Generate visualization
npx react-native-bundle-visualizer
```

## Optimization Strategies

### 1. Remove Unused Dependencies

#### Audit Dependencies
```bash
# Find unused dependencies
npm install -g depcheck
depcheck

# Remove unused packages
npm uninstall <package-name>
```

#### Common Unused Dependencies to Check
- Development dependencies in production
- Duplicate packages (check with `npm ls <package>`)
- Large packages with smaller alternatives
- Polyfills not needed for target platforms

### 2. Code Splitting with Lazy Loading

Already implemented in `src/navigation/LazyScreens.tsx`:

```tsx
// Lazy load screens
const LazyAdminScreen = createLazyScreen(
  () => import('../screens/AdminScreen'),
  'Carregando...'
);

// Use in navigation
<Stack.Screen name="Admin" component={LazyAdminScreen} />
```

### 3. Optimize Images

#### Image Optimization Checklist
- [ ] Compress images before bundling
- [ ] Use WebP format where possible
- [ ] Remove unused images from assets
- [ ] Use SVG for icons instead of PNG
- [ ] Load images from CDN instead of bundling

#### Tools
```bash
# Install image optimization tools
npm install --save-dev imagemin imagemin-webp

# Optimize images
npx imagemin src/assets/*.{jpg,png} --out-dir=src/assets/optimized
```

### 4. Tree Shaking

#### Enable Tree Shaking in Metro

Create/update `metro.config.js`:

```javascript
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Enable tree shaking
config.transformer = {
  ...config.transformer,
  minifierConfig: {
    keep_classnames: true,
    keep_fnames: true,
    mangle: {
      keep_classnames: true,
      keep_fnames: true,
    },
  },
};

module.exports = config;
```

#### Import Only What You Need

```tsx
// ❌ Bad - imports entire library
import _ from 'lodash';
const result = _.map(array, fn);

// ✅ Good - imports only needed function
import map from 'lodash/map';
const result = map(array, fn);

// ✅ Better - use native methods
const result = array.map(fn);
```

### 5. Replace Large Dependencies

#### Common Replacements

| Large Package | Smaller Alternative | Size Savings |
|--------------|---------------------|--------------|
| moment | date-fns or dayjs | ~70% |
| lodash | lodash-es + tree shaking | ~50% |
| axios | fetch API | ~15KB |
| uuid | crypto.randomUUID() | ~10KB |

#### Example: Replace Moment with date-fns

```bash
# Remove moment
npm uninstall moment

# Install date-fns
npm install date-fns
```

```tsx
// Before (moment)
import moment from 'moment';
const formatted = moment(date).format('DD/MM/YYYY');

// After (date-fns)
import { format } from 'date-fns';
const formatted = format(date, 'dd/MM/yyyy');
```

### 6. Optimize Imports

#### Use Barrel Exports Carefully

```tsx
// ❌ Bad - imports entire module
import { Button, Text, View } from './components';

// ✅ Good - direct imports
import Button from './components/Button';
import Text from './components/Text';
import View from './components/View';
```

#### Configure Path Aliases

In `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@components/*": ["src/components/*"],
      "@screens/*": ["src/screens/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```

### 7. Remove Console Logs in Production

#### Babel Plugin

Install plugin:
```bash
npm install --save-dev babel-plugin-transform-remove-console
```

Update `babel.config.js`:
```javascript
module.exports = function(api) {
  api.cache(true);
  
  const plugins = [];
  
  if (process.env.NODE_ENV === 'production') {
    plugins.push('transform-remove-console');
  }
  
  return {
    presets: ['babel-preset-expo'],
    plugins,
  };
};
```

### 8. Optimize React Native Modules

#### Use Hermes Engine

Hermes reduces bundle size and improves startup time.

In `android/app/build.gradle`:
```gradle
project.ext.react = [
    enableHermes: true
]
```

In `ios/Podfile`:
```ruby
use_react_native!(
  :hermes_enabled => true
)
```

### 9. Code Minification

#### Configure Minification

Already enabled by default in production builds, but you can customize:

```javascript
// metro.config.js
module.exports = {
  transformer: {
    minifierConfig: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
      mangle: true,
      output: {
        comments: false,
      },
    },
  },
};
```

### 10. Analyze and Monitor

#### Bundle Size Monitoring Script

Create `scripts/check-bundle-size.js`:

```javascript
const fs = require('fs');
const path = require('path');

const BUNDLE_PATH = 'android-release.bundle';
const MAX_SIZE_MB = 10; // Set your threshold

if (fs.existsSync(BUNDLE_PATH)) {
  const stats = fs.statSync(BUNDLE_PATH);
  const sizeMB = stats.size / (1024 * 1024);
  
  console.log(`Bundle size: ${sizeMB.toFixed(2)} MB`);
  
  if (sizeMB > MAX_SIZE_MB) {
    console.error(`❌ Bundle size exceeds ${MAX_SIZE_MB} MB!`);
    process.exit(1);
  } else {
    console.log(`✅ Bundle size is within limits`);
  }
} else {
  console.error('Bundle file not found');
  process.exit(1);
}
```

Add to `package.json`:
```json
{
  "scripts": {
    "check-bundle-size": "node scripts/check-bundle-size.js"
  }
}
```

## Optimization Checklist

### Dependencies
- [ ] Remove unused dependencies
- [ ] Replace large dependencies with smaller alternatives
- [ ] Use tree-shakeable imports
- [ ] Check for duplicate dependencies

### Code
- [ ] Implement lazy loading for screens
- [ ] Remove unused code and components
- [ ] Optimize imports (avoid barrel exports)
- [ ] Remove console.logs in production
- [ ] Use code splitting where appropriate

### Assets
- [ ] Compress images
- [ ] Use WebP format
- [ ] Remove unused images
- [ ] Use SVG for icons
- [ ] Load images from CDN

### Build Configuration
- [ ] Enable Hermes engine
- [ ] Configure minification
- [ ] Enable tree shaking
- [ ] Optimize Metro bundler config

### Monitoring
- [ ] Set up bundle size monitoring
- [ ] Track bundle size in CI/CD
- [ ] Regular bundle analysis
- [ ] Performance budgets

## Expected Results

### Before Optimization
- Bundle size: ~15-20 MB
- Startup time: 3-5 seconds
- Memory usage: 150-200 MB

### After Optimization
- Bundle size: ~8-12 MB (40-50% reduction)
- Startup time: 1.5-2.5 seconds (50% improvement)
- Memory usage: 100-150 MB (30% reduction)

## Continuous Monitoring

### CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/bundle-size.yml
name: Bundle Size Check

on: [pull_request]

jobs:
  check-size:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install dependencies
        run: npm ci
      - name: Build bundle
        run: npm run build:bundle
      - name: Check bundle size
        run: npm run check-bundle-size
```

## Resources

- [React Native Performance](https://reactnative.dev/docs/performance)
- [Metro Bundler](https://facebook.github.io/metro/)
- [Hermes Engine](https://hermesengine.dev/)
- [Bundle Size Optimization](https://reactnative.dev/docs/optimizing-javascript-loading)
