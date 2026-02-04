# Biometric Authentication Setup Guide

## Overview

This guide covers the implementation of biometric authentication (fingerprint and face recognition) for the Restaurant App, including setup, testing, and deployment.

## Dependencies Required

The following dependencies should already be installed with Expo:

```bash
npm install expo-local-authentication expo-secure-store expo-device
```

Or with yarn:

```bash
yarn add expo-local-authentication expo-secure-store expo-device
```

## Platform Support

### iOS
- **Touch ID**: iPhone 5s and later
- **Face ID**: iPhone X and later
- Requires iOS 11.0 or later

### Android
- **Fingerprint**: Android 6.0 (API 23) and later
- **Face Recognition**: Android 10 (API 29) and later (device dependent)
- Requires device with biometric hardware

## Configuration

### 1. iOS Configuration

Add to `ios/Espeto/Info.plist`:

```xml
<key>NSFaceIDUsageDescription</key>
<string>Usamos Face ID para autenticação rápida e segura no aplicativo</string>
```

### 2. Android Configuration

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.USE_BIOMETRIC" />
<uses-permission android:name="android.permission.USE_FINGERPRINT" />
```

### 3. Expo Configuration

Add to `app.json`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-local-authentication",
        {
          "faceIDPermission": "Usamos Face ID para autenticação rápida e segura"
        }
      ]
    ]
  }
}
```

## Implementation Components

### 1. BiometricAuthService (`src/services/BiometricAuthService.ts`)

Core service that handles:
- Device capability detection
- Biometric enrollment
- Authentication with fingerprint/face
- Session token management (30-day expiration)
- Secure storage with Expo SecureStore
- Fallback to password on failure

### 2. BiometricSetupModal (`src/components/BiometricSetupModal.tsx`)

UI component for biometric enrollment:
- Availability check
- Device capability display
- Enrollment flow
- Setup instructions for unavailable devices
- Benefits explanation

## Integration with AuthContext

Update `src/context/AuthContext.tsx` to integrate biometric authentication:

```typescript
import BiometricAuthService from '../services/BiometricAuthService';
import * as Device from 'expo-device';

// Add state for biometric auth
const [biometricEnabled, setBiometricEnabled] = useState(false);

// Check if biometric is enabled on mount
useEffect(() => {
  const checkBiometric = async () => {
    if (user) {
      const isEnabled = await BiometricAuthService.isEnabledForUser(user.uid);
      setBiometricEnabled(isEnabled);
    }
  };
  checkBiometric();
}, [user]);

// Biometric login function
const loginWithBiometric = async () => {
  try {
    if (!user) {
      throw new Error('Usuário não autenticado');
    }

    // Authenticate with biometric
    const result = await BiometricAuthService.authenticate(
      user.uid,
      'Autentique para fazer login'
    );

    if (!result.success) {
      if (result.fallbackToPassword) {
        // Show password login screen
        setShowPasswordLogin(true);
      } else {
        throw new Error(result.error);
      }
      return;
    }

    // Validate session token
    const token = await BiometricAuthService.getSessionToken(user.uid);
    if (!token) {
      throw new Error('Token de sessão inválido');
    }

    // Login successful
    console.log('Biometric login successful');
  } catch (error) {
    console.error('Biometric login error:', error);
    // Fallback to password
    setShowPasswordLogin(true);
  }
};
```

## Usage Examples

### 1. Check if Biometric is Available

```typescript
import BiometricAuthService from '../services/BiometricAuthService';

const availability = await BiometricAuthService.isAvailable();

if (availability.available) {
  console.log(`Biometric available: ${availability.biometricType}`);
  // Show biometric setup option
} else {
  console.log(`Biometric unavailable: ${availability.reason}`);
  // Hide biometric option
}
```

### 2. Enroll User for Biometric Auth

```typescript
import BiometricAuthService from '../services/BiometricAuthService';
import * as Device from 'expo-device';

const deviceId = Device.modelId || Device.deviceName || 'unknown';

try {
  await BiometricAuthService.enrollUser(userId, deviceId);
  console.log('Biometric enrollment successful');
} catch (error) {
  console.error('Enrollment failed:', error);
}
```

### 3. Authenticate with Biometric

```typescript
import BiometricAuthService from '../services/BiometricAuthService';

const result = await BiometricAuthService.authenticate(
  userId,
  'Autentique para continuar'
);

if (result.success) {
  console.log('Authentication successful');
  // Proceed with authenticated action
} else if (result.fallbackToPassword) {
  console.log('User chose password fallback');
  // Show password input
} else {
  console.error('Authentication failed:', result.error);
}
```

### 4. Store and Validate Session Token

```typescript
import BiometricAuthService from '../services/BiometricAuthService';

// After successful Firebase authentication
const firebaseToken = await user.getIdToken();

// Store session token
await BiometricAuthService.storeSessionToken(userId, firebaseToken);

// Later, validate token
const isValid = await BiometricAuthService.validateSessionToken(userId);

if (isValid) {
  // Token is valid, proceed
  const token = await BiometricAuthService.getSessionToken(userId);
} else {
  // Token expired or invalid, re-authenticate
  await BiometricAuthService.clearSessionToken(userId);
}
```

## Security Features

### 1. Secure Storage

- All biometric enrollment data stored in Expo SecureStore
- Session tokens encrypted at rest
- Device keychain integration (iOS) / Keystore (Android)
- Data isolated per user

### 2. Session Management

- 30-day session token expiration
- Automatic token validation before use
- Token cleared on logout
- Re-authentication required after expiration

### 3. Fallback Mechanism

- Password fallback always available
- User can cancel biometric prompt
- Graceful degradation on device issues
- Clear error messages

### 4. Privacy

- Biometric data never leaves device
- No biometric templates stored in app
- Only enrollment status tracked
- User can unenroll anytime

## Testing

### Run Property-Based Tests

```bash
npm test -- __tests__/property/biometric-auth.test.ts
```

### Test Coverage

The implementation includes property-based tests for:
- **Property 37**: Biometric fallback to password
- **Property 38**: Token validation after biometric auth

### Manual Testing Checklist

- [ ] Test on device with fingerprint sensor
- [ ] Test on device with face recognition
- [ ] Test on device without biometric hardware
- [ ] Test enrollment flow
- [ ] Test authentication success
- [ ] Test authentication failure
- [ ] Test password fallback
- [ ] Test session token expiration
- [ ] Test unenrollment
- [ ] Test with multiple users

## Platform-Specific Behavior

### iOS

- **Touch ID**: Requires physical touch on home button
- **Face ID**: Requires face scan, works in dark
- **Fallback**: Shows "Enter Password" button
- **Lockout**: After 5 failed attempts, requires passcode

### Android

- **Fingerprint**: Varies by device manufacturer
- **Face**: May not work in low light (device dependent)
- **Fallback**: Shows "Use PIN/Pattern/Password"
- **Lockout**: After 5 failed attempts, requires device unlock

## Troubleshooting

### Issue: "Biometric hardware not available"

**Solution**: 
- Verify device has biometric sensor
- Check if biometric is enrolled in device settings
- Ensure app has necessary permissions

### Issue: "Authentication failed immediately"

**Solution**:
- Check if device is locked
- Verify biometric is enrolled
- Try re-enrolling biometric in device settings

### Issue: "Session token invalid"

**Solution**:
- Check if token has expired (30 days)
- Verify SecureStore is accessible
- Clear token and re-authenticate

### Issue: Face ID not working on iOS

**Solution**:
- Verify `NSFaceIDUsageDescription` in Info.plist
- Check if Face ID is enabled in device settings
- Ensure app has permission to use Face ID

### Issue: Fingerprint not working on Android

**Solution**:
- Verify `USE_BIOMETRIC` permission in manifest
- Check if fingerprint is enrolled
- Test on physical device (not emulator)

## Best Practices

1. **Always provide password fallback** - Never rely solely on biometric
2. **Check availability before showing option** - Hide if not available
3. **Clear error messages** - Explain why biometric failed
4. **Respect user choice** - Don't force biometric enrollment
5. **Test on real devices** - Emulators have limited biometric support
6. **Handle all error cases** - User cancel, lockout, not enrolled, etc.
7. **Validate tokens regularly** - Don't assume token is valid
8. **Log biometric events** - For security auditing

## Deployment Checklist

- [ ] Install required dependencies
- [ ] Configure iOS Info.plist
- [ ] Configure Android manifest
- [ ] Update Expo config
- [ ] Integrate with AuthContext
- [ ] Add biometric setup to user settings
- [ ] Add biometric option to login screen
- [ ] Test on iOS device with Touch ID
- [ ] Test on iOS device with Face ID
- [ ] Test on Android device with fingerprint
- [ ] Test password fallback
- [ ] Test session token expiration
- [ ] Deploy to staging
- [ ] Validate with test users
- [ ] Deploy to production

## Performance Considerations

- Biometric authentication is fast (< 1 second typically)
- SecureStore operations are synchronous on iOS, async on Android
- Token validation is local, no network required
- Enrollment data is small (< 1KB per user)

## Accessibility

- Provide clear labels for biometric prompts
- Support VoiceOver/TalkBack
- Ensure password fallback is accessible
- Use high contrast for UI elements

## References

- [Expo Local Authentication](https://docs.expo.dev/versions/latest/sdk/local-authentication/)
- [Expo Secure Store](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [iOS Biometric Authentication](https://developer.apple.com/documentation/localauthentication)
- [Android Biometric API](https://developer.android.com/training/sign-in/biometric-auth)
- [OWASP Mobile Security](https://owasp.org/www-project-mobile-security/)

## Support

For issues or questions:
- Check Expo documentation for platform-specific issues
- Review property-based tests for expected behavior
- Test on physical devices before reporting bugs
- Contact development team for assistance
