#!/usr/bin/env node

/**
 * Bundle Size Analysis Script
 * 
 * Analyzes the React Native bundle and provides insights on:
 * - Total bundle size
 * - Size by category (dependencies, app code, assets)
 * - Largest dependencies
 * - Optimization recommendations
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const CONFIG = {
  bundlePath: 'android-release.bundle',
  platform: 'android',
  maxSizeMB: 10,
  warningSizeMB: 8,
};

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatSize(bytes) {
  const mb = bytes / (1024 * 1024);
  const kb = bytes / 1024;
  return mb >= 1 ? `${mb.toFixed(2)} MB` : `${kb.toFixed(2)} KB`;
}

function buildBundle() {
  log('\n📦 Building bundle...', 'cyan');
  
  try {
    execSync(
      `npx react-native bundle \
        --platform ${CONFIG.platform} \
        --dev false \
        --entry-file index.js \
        --bundle-output ${CONFIG.bundlePath} \
        --assets-dest ${CONFIG.platform}-release`,
      { stdio: 'inherit' }
    );
    log('✅ Bundle built successfully\n', 'green');
  } catch (error) {
    log('❌ Failed to build bundle', 'red');
    process.exit(1);
  }
}

function analyzeBundleSize() {
  log('📊 Analyzing bundle size...', 'cyan');
  
  if (!fs.existsSync(CONFIG.bundlePath)) {
    log(`❌ Bundle file not found: ${CONFIG.bundlePath}`, 'red');
    log('Run with --build flag to build the bundle first', 'yellow');
    process.exit(1);
  }
  
  const stats = fs.statSync(CONFIG.bundlePath);
  const sizeMB = stats.size / (1024 * 1024);
  
  log(`\n📏 Bundle Size: ${formatSize(stats.size)}`, 'blue');
  
  // Check against thresholds
  if (sizeMB > CONFIG.maxSizeMB) {
    log(`❌ Bundle size exceeds maximum (${CONFIG.maxSizeMB} MB)`, 'red');
    return false;
  } else if (sizeMB > CONFIG.warningSizeMB) {
    log(`⚠️  Bundle size approaching limit (${CONFIG.warningSizeMB} MB)`, 'yellow');
  } else {
    log(`✅ Bundle size is within limits`, 'green');
  }
  
  return true;
}

function analyzeDependencies() {
  log('\n📦 Analyzing dependencies...', 'cyan');
  
  const packageJson = JSON.parse(
    fs.readFileSync('package.json', 'utf-8')
  );
  
  const dependencies = Object.keys(packageJson.dependencies || {});
  const devDependencies = Object.keys(packageJson.devDependencies || {});
  
  log(`\n📚 Dependencies: ${dependencies.length}`, 'blue');
  log(`🔧 Dev Dependencies: ${devDependencies.length}`, 'blue');
  
  // Check for large dependencies
  const largeDependencies = [
    'moment',
    'lodash',
    'firebase',
    'react-native-vector-icons',
  ];
  
  const foundLarge = dependencies.filter(dep =>
    largeDependencies.some(large => dep.includes(large))
  );
  
  if (foundLarge.length > 0) {
    log('\n⚠️  Large dependencies detected:', 'yellow');
    foundLarge.forEach(dep => {
      log(`   - ${dep}`, 'yellow');
    });
    log('\nConsider replacing with smaller alternatives:', 'yellow');
    log('   - moment → date-fns or dayjs', 'yellow');
    log('   - lodash → lodash-es with tree shaking', 'yellow');
  }
}

function checkForOptimizations() {
  log('\n🔍 Checking for optimization opportunities...', 'cyan');
  
  const recommendations = [];
  
  // Check for Hermes
  const androidGradle = fs.existsSync('android/app/build.gradle')
    ? fs.readFileSync('android/app/build.gradle', 'utf-8')
    : '';
  
  if (!androidGradle.includes('enableHermes: true')) {
    recommendations.push({
      title: 'Enable Hermes Engine',
      description: 'Hermes can reduce bundle size by 30-40%',
      impact: 'High',
    });
  }
  
  // Check for console.log removal
  const babelConfig = fs.existsSync('babel.config.js')
    ? fs.readFileSync('babel.config.js', 'utf-8')
    : '';
  
  if (!babelConfig.includes('transform-remove-console')) {
    recommendations.push({
      title: 'Remove console.log in production',
      description: 'Install babel-plugin-transform-remove-console',
      impact: 'Medium',
    });
  }
  
  // Check for lazy loading
  const hasLazyLoading = fs.existsSync('src/navigation/LazyScreens.tsx');
  
  if (!hasLazyLoading) {
    recommendations.push({
      title: 'Implement lazy loading',
      description: 'Use React.lazy() for screen components',
      impact: 'High',
    });
  }
  
  if (recommendations.length > 0) {
    log('\n💡 Optimization Recommendations:\n', 'magenta');
    recommendations.forEach((rec, index) => {
      log(`${index + 1}. ${rec.title} (Impact: ${rec.impact})`, 'magenta');
      log(`   ${rec.description}\n`, 'reset');
    });
  } else {
    log('✅ No obvious optimization opportunities found', 'green');
  }
}

function generateReport() {
  log('\n📄 Generating report...', 'cyan');
  
  const report = {
    timestamp: new Date().toISOString(),
    bundleSize: fs.existsSync(CONFIG.bundlePath)
      ? fs.statSync(CONFIG.bundlePath).size
      : 0,
    platform: CONFIG.platform,
  };
  
  const reportPath = 'bundle-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  log(`✅ Report saved to ${reportPath}`, 'green');
}

function printUsage() {
  console.log(`
Usage: node analyze-bundle.js [options]

Options:
  --build         Build the bundle before analyzing
  --platform      Platform to analyze (android|ios) [default: android]
  --max-size      Maximum bundle size in MB [default: 10]
  --report        Generate JSON report
  --help          Show this help message

Examples:
  node analyze-bundle.js --build
  node analyze-bundle.js --platform ios --max-size 12
  node analyze-bundle.js --build --report
  `);
}

// Main execution
function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    printUsage();
    return;
  }
  
  log('\n🚀 React Native Bundle Analyzer', 'cyan');
  log('================================\n', 'cyan');
  
  // Parse arguments
  if (args.includes('--platform')) {
    const platformIndex = args.indexOf('--platform');
    CONFIG.platform = args[platformIndex + 1] || 'android';
    CONFIG.bundlePath = `${CONFIG.platform}-release.bundle`;
  }
  
  if (args.includes('--max-size')) {
    const sizeIndex = args.indexOf('--max-size');
    CONFIG.maxSizeMB = parseFloat(args[sizeIndex + 1]) || 10;
  }
  
  // Build if requested
  if (args.includes('--build')) {
    buildBundle();
  }
  
  // Analyze
  const sizeOk = analyzeBundleSize();
  analyzeDependencies();
  checkForOptimizations();
  
  // Generate report if requested
  if (args.includes('--report')) {
    generateReport();
  }
  
  log('\n================================\n', 'cyan');
  
  // Exit with appropriate code
  process.exit(sizeOk ? 0 : 1);
}

main();
