import fs from 'node:fs';
import path from 'node:path';

const promiseKtPath = path.resolve(
  process.cwd(),
  'node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/Promise.kt'
);

if (!fs.existsSync(promiseKtPath)) {
  console.log('[postinstall] expo-modules-core Promise.kt not found, skipping patch');
  process.exit(0);
}

const original = fs.readFileSync(promiseKtPath, 'utf8');

const replacements = [
  ['override fun reject(code: String, message: String?) {', 'override fun reject(code: String?, message: String?) {'],
  ['expoPromise.reject(code, message, null)', 'expoPromise.reject(code ?: unknownCode, message, null)'],
  ['override fun reject(code: String, throwable: Throwable?) {', 'override fun reject(code: String?, throwable: Throwable?) {'],
  ['expoPromise.reject(code, null, throwable)', 'expoPromise.reject(code ?: unknownCode, null, throwable)'],
  ['override fun reject(code: String, message: String?, throwable: Throwable?) {', 'override fun reject(code: String?, message: String?, throwable: Throwable?) {'],
  ['expoPromise.reject(code, message, throwable)', 'expoPromise.reject(code ?: unknownCode, message, throwable)'],
  ['override fun reject(code: String, userInfo: WritableMap) {', 'override fun reject(code: String?, userInfo: WritableMap) {'],
  ['override fun reject(code: String, throwable: Throwable?, userInfo: WritableMap) {', 'override fun reject(code: String?, throwable: Throwable?, userInfo: WritableMap) {'],
  ['override fun reject(code: String, message: String?, userInfo: WritableMap) {', 'override fun reject(code: String?, message: String?, userInfo: WritableMap) {']
];

let updated = original;
for (const [from, to] of replacements) {
  updated = updated.replace(from, to);
}

if (updated === original) {
  console.log('[postinstall] expo-modules-core patch already applied or pattern not found');
  process.exit(0);
}

fs.writeFileSync(promiseKtPath, updated, 'utf8');
console.log('[postinstall] expo-modules-core Promise.kt patch applied');
