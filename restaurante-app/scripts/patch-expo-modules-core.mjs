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

  const original = fs.readFileSync(escPosAndroidBuildGradlePath, 'utf8');

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
      if (!isNewArchitectureEnabled()) {
        java.srcDirs += ['src/oldarch']
      }
    }
  }
`;

  if (!original.includes('java.srcDirs += [\n            "generated/java"')) {
    console.log('[postinstall] react-native-esc-pos-printer sourceSets already patched');
    return;
  }

  const updated = original.replace(legacySourceSetBlock, fixedSourceSetBlock);

  if (updated === original) {
    console.log('[postinstall] react-native-esc-pos-printer sourceSets pattern not matched, skipping patch');
    return;
  }

  fs.writeFileSync(escPosAndroidBuildGradlePath, updated, 'utf8');
  console.log('[postinstall] react-native-esc-pos-printer sourceSets patched for RN 0.84');
}

patchExpoModulesCorePromise();
patchEscPosCodegenConfig();
patchEscPosReactNativeConfig();
patchEscPosAndroidBuildGradle();
