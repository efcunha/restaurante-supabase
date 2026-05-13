import fs from 'node:fs';
import path from 'node:path';

const promiseKtPath = path.resolve(
  process.cwd(),
  'node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/Promise.kt'
);

const escPosPackageJsonPath = path.resolve(
  process.cwd(),
  'node_modules/react-native-esc-pos-printer/package.json'
);

const escPosReactNativeConfigPath = path.resolve(
  process.cwd(),
  'node_modules/react-native-esc-pos-printer/react-native.config.js'
);

const escPosAndroidBuildGradlePath = path.resolve(
  process.cwd(),
  'node_modules/react-native-esc-pos-printer/android/build.gradle'
);

const expoJSIUtilsHeaderPath = path.resolve(
  process.cwd(),
  'node_modules/expo-modules-core/ios/JSI/EXJSIUtils.h'
);

const expoDevLauncherRCTBridgePath = path.resolve(
  process.cwd(),
  'node_modules/expo-dev-launcher/ios/ReactNative/EXDevLauncherRCTBridge.m'
);

function patchExpoModulesCorePromise() {
  if (!fs.existsSync(promiseKtPath)) {
    console.log('[postinstall] expo-modules-core Promise.kt not found, skipping patch');
    return;
  }

  const original = fs.readFileSync(promiseKtPath, 'utf8');

  const replacements = [
    ['override fun reject(code: String, message: String?) {', 'override fun reject(code: String?, message: String?) {'],
    ['override fun reject(code: String, throwable: Throwable?) {', 'override fun reject(code: String?, throwable: Throwable?) {'],
    ['override fun reject(code: String, message: String?, throwable: Throwable?) {', 'override fun reject(code: String?, message: String?, throwable: Throwable?) {'],
    ['override fun reject(code: String, userInfo: WritableMap) {', 'override fun reject(code: String?, userInfo: WritableMap) {'],
    ['override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {', 'override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) {'],
    ['override fun reject(code: String, message: String?, userInfo: WritableMap) {', 'override fun reject(code: String?, message: String?, userInfo: WritableMap) {'],
    ['expoPromise.reject(code, message, null)', 'expoPromise.reject(code ?: unknownCode, message, null)'],
    ['expoPromise.reject(code, null, throwable)', 'expoPromise.reject(code ?: unknownCode, null, throwable)'],
    ['expoPromise.reject(code, message, throwable)', 'expoPromise.reject(code ?: unknownCode, message, throwable)'],
    ['expoPromise.reject(code, null, null)', 'expoPromise.reject(code ?: unknownCode, null, null)']
  ];

  let updated = original;
  for (const [from, to] of replacements) {
    updated = updated.split(from).join(to);
  }

  if (updated === original) {
    console.log('[postinstall] expo-modules-core patch already applied or pattern not found');
    return;
  }

  fs.writeFileSync(promiseKtPath, updated, 'utf8');
  console.log('[postinstall] expo-modules-core Promise.kt patch applied');
}

function patchEscPosCodegenConfig() {
  if (!fs.existsSync(escPosPackageJsonPath)) {
    console.log('[postinstall] react-native-esc-pos-printer package.json not found, skipping patch');
    return;
  }

  const original = fs.readFileSync(escPosPackageJsonPath, 'utf8');
  const parsed = JSON.parse(original);

  if (!parsed.codegenConfig) {
    console.log('[postinstall] react-native-esc-pos-printer codegenConfig already removed');
    return;
  }

  // RN 0.84 autolinking points to android/build/generated/source/codegen/jni,
  // but this package ships generated code under android/generated/jni.
  // Removing codegenConfig prevents the invalid CMake add_subdirectory entry.
  delete parsed.codegenConfig;

  fs.writeFileSync(escPosPackageJsonPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  console.log('[postinstall] react-native-esc-pos-printer codegenConfig removed');
}

function patchEscPosReactNativeConfig() {
  if (!fs.existsSync(escPosReactNativeConfigPath)) {
    console.log('[postinstall] react-native-esc-pos-printer react-native.config.js not found, skipping patch');
    return;
  }

  const original = fs.readFileSync(escPosReactNativeConfigPath, 'utf8');

  if (!original.includes('cmakeListsPath')) {
    console.log('[postinstall] react-native-esc-pos-printer cmakeListsPath already removed');
    return;
  }

  const updated = original
    .split("        cmakeListsPath: 'generated/jni/CMakeLists.txt',")
    .join('');

  fs.writeFileSync(escPosReactNativeConfigPath, updated, 'utf8');
  console.log('[postinstall] react-native-esc-pos-printer cmakeListsPath removed');
}

function patchEscPosAndroidBuildGradle() {
  if (!fs.existsSync(escPosAndroidBuildGradlePath)) {
    console.log('[postinstall] react-native-esc-pos-printer android/build.gradle not found, skipping patch');
    return;
  }

  let content = fs.readFileSync(escPosAndroidBuildGradlePath, 'utf8');
  let changed = false;

  // Patch 1: Remove legacy new-arch sourceSets (generated/java + generated/jni)
  const legacySourceSetBlock = `  sourceSets {
    main {
      if (isNewArchitectureEnabled()) {
          java.srcDirs += [
            "generated/java",
            "generated/jni"
          ]
      } else {
              java.srcDirs += ['src/oldarch']
      }
    }
  }
`;
  const fixedSourceSetBlock = `  sourceSets {
    main {
      // Always include src/oldarch: it provides NativeEscPosPrinterSpec and
      // NativeEscPosPrinterDiscoverySpec (package com.escposprinter) as
      // old-arch-compatible AbstractClass stubs extending ReactContextBaseJavaModule.
      // With com.facebook.react plugin removed (Patch 2) codegen does NOT run,
      // so we rely on these pre-generated stubs to satisfy the Java imports.
      java.srcDirs += ['src/oldarch']
    }
  }
`;
  if (content.includes('java.srcDirs += [\n            "generated/java"')) {
    content = content.replace(legacySourceSetBlock, fixedSourceSetBlock);
    changed = true;
    console.log('[postinstall] react-native-esc-pos-printer sourceSets patched for RN 0.84');
  } else {
    console.log('[postinstall] react-native-esc-pos-printer sourceSets already patched');
  }

  // Patch 2: Remove "apply plugin: com.facebook.react" conditional block.
  // With newArchEnabled=true in the host app, this plugin gets applied to
  // react-native-esc-pos-printer and generates codegen. However, the generated
  // JNI directory is added to Android-autolinking.cmake before it actually
  // exists, causing a CMake configuration failure on RN 0.84 / EAS builds.
  // Removing this prevents the Gradle autolinking from including this library
  // in the CMake native build (old-arch bridge handles it instead).
  const applyPluginBlock = `if (isNewArchitectureEnabled()) {
  apply plugin: "com.facebook.react"
}`;
  const applyPluginComment = `// react-native-esc-pos-printer: com.facebook.react plugin removed by postinstall.
// The package ships pre-generated JNI stubs but does not support the full
// RN 0.84 codegen pipeline when hosted in a new-arch app build.
// Old-arch NativeModules bridge is used instead.`;
  if (content.includes(applyPluginBlock)) {
    content = content.replace(applyPluginBlock, applyPluginComment);
    changed = true;
    console.log('[postinstall] react-native-esc-pos-printer apply plugin:com.facebook.react removed');
  } else {
    console.log('[postinstall] react-native-esc-pos-printer apply plugin already removed or not present');
  }

  // Patch 3: Remove "react { ... }" block that configures codegen spec.
  // Required to prevent the Gradle autolinking from generating codegen artifacts
  // for this library (would reference a non-existent JNI directory in CMake).
  const reactBlock = `if (isNewArchitectureEnabled()) {
  react {
    jsRootDir = file("../src/")
    libraryName = "RNEscPosPrinterSpec"
    codegenJavaPackageName = "com.escposprinter"
  }
}`;
  const reactBlockComment = `// react-native-esc-pos-printer: react{} codegen block removed by postinstall.
// See Patch 2 comment above for rationale.`;
  if (content.includes(reactBlock)) {
    content = content.replace(reactBlock, reactBlockComment);
    changed = true;
    console.log('[postinstall] react-native-esc-pos-printer react{} codegen block removed');
  } else {
    console.log('[postinstall] react-native-esc-pos-printer react{} block already removed or not present');
  }

  if (changed) {
    fs.writeFileSync(escPosAndroidBuildGradlePath, content, 'utf8');
  }
}

function patchExpoModulesCoreJSI() {
  // Patch 4: Add missing React includes to EXJSIUtils.h
  // In RN 0.84, TurboModuleUtils.h no longer transitively includes CallInvoker.h,
  // so react::CallInvoker is undefined when expo-modules-core is compiled.
  // Error: "no member named 'CallInvoker' in namespace 'facebook::react'"
  // Also ensure CallbackWrapper.h is present for:
  // Error: "no member named 'CallbackWrapper' in namespace 'facebook::react'"
  // Fix: inject direct includes after ReactCommon/TurboModuleUtils.h import.
  if (!fs.existsSync(expoJSIUtilsHeaderPath)) {
    console.log('[postinstall] expo-modules-core EXJSIUtils.h not found, skipping patch');
    return;
  }

  let original = fs.readFileSync(expoJSIUtilsHeaderPath, 'utf8');
  const anchor = '#import <ReactCommon/TurboModuleUtils.h>';
  const injectCallInvoker = '#include <ReactCommon/CallInvoker.h>';
  const injectCallbackWrapper = '#include <react/bridging/CallbackWrapper.h>';

  if (!original.includes(anchor)) {
    console.log('[postinstall] expo-modules-core EXJSIUtils.h anchor not found, skipping patch');
    return;
  }

  let changed = false;

  if (!original.includes(injectCallInvoker)) {
    original = original.replace(anchor, `${anchor}\n${injectCallInvoker}`);
    changed = true;
  }

  if (!original.includes(injectCallbackWrapper)) {
    original = original.replace(anchor, `${anchor}\n${injectCallbackWrapper}`);
    changed = true;
  }

  if (!changed) {
    console.log('[postinstall] expo-modules-core EXJSIUtils.h React includes already patched');
    return;
  }

  fs.writeFileSync(expoJSIUtilsHeaderPath, original, 'utf8');
  console.log('[postinstall] expo-modules-core EXJSIUtils.h React includes patch applied');
}

function patchExpoDevLauncherIOSBridge() {
  // Patch 5: RN 0.84 removed initWithParentBridge: from RCTCxxBridge.
  // expo-dev-launcher still calls [super initWithParentBridge:bridge], causing:
  // "no visible @interface for 'RCTCxxBridge' declares the selector 'initWithParentBridge:'"
  // Fallback to [super init] to keep compilation working for internal preview builds.
  if (!fs.existsSync(expoDevLauncherRCTBridgePath)) {
    console.log('[postinstall] expo-dev-launcher EXDevLauncherRCTBridge.m not found, skipping patch');
    return;
  }

  let source = fs.readFileSync(expoDevLauncherRCTBridgePath, 'utf8');
  const oldCall = 'if ((self = [super initWithParentBridge:bridge])) {';
  const newCall = 'if ((self = [super init])) {';

  if (!source.includes(oldCall)) {
    if (source.includes(newCall)) {
      console.log('[postinstall] expo-dev-launcher RN 0.84 bridge patch already applied');
    } else {
      console.log('[postinstall] expo-dev-launcher bridge patch pattern not found, skipping patch');
    }
    return;
  }

  source = source.replace(oldCall, newCall);
  fs.writeFileSync(expoDevLauncherRCTBridgePath, source, 'utf8');
  console.log('[postinstall] expo-dev-launcher RN 0.84 bridge patch applied');
}

patchExpoModulesCorePromise();
patchEscPosCodegenConfig();
patchEscPosReactNativeConfig();
patchEscPosAndroidBuildGradle();
patchExpoModulesCoreJSI();
patchExpoDevLauncherIOSBridge();
