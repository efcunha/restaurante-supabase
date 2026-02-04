# Multi-Factor Authentication (MFA) Setup Guide

## Overview

This guide covers the implementation of TOTP-based Multi-Factor Authentication (MFA) for the Restaurant App, including setup, testing, and deployment.

## Dependencies Required

Add the following dependencies to `package.json`:

```bash
npm install react-native-qrcode-svg
npm install expo-crypto
npm install expo-clipboard
```

Or with yarn:

```bash
yarn add react-native-qrcode-svg expo-crypto expo-clipboard
```

## Firebase Configuration

### 1. Enable Multi-Factor Authentication in Firebase Console

1. Go to Firebase Console → Authentication → Sign-in method
2. Click on "Advanced" section
3. Enable "Multi-factor authentication"
4. Select "TOTP" as the second factor

### 2. Update Security Rules

Add the following rules to `firestore.rules`:

```javascript
// MFA Enrollments Collection
match /mfa_enrollments/{userId} {
  // Users can only read/write their own enrollment data
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
  
  // Admins can read all enrollments
  allow read: if request.auth.token.role == 'admin';
}
```

### 3. Create Firestore Indexes

Add to `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "mfa_enrollments",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "enrolledAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Implementation Components

### 1. MFAService (`src/services/MFAService.ts`)

Core service that handles:
- MFA enrollment (TOTP setup)
- Code verification
- Backup codes generation and validation
- Account lockout after failed attempts
- Role-based MFA requirements

### 2. MFASetupModal (`src/components/MFASetupModal.tsx`)

UI component for MFA enrollment:
- QR code display for TOTP setup
- Verification code input
- Backup codes display and copy
- Step-by-step wizard interface

### 3. MFAVerificationModal (`src/components/MFAVerificationModal.tsx`)

UI component for MFA verification during login:
- TOTP code input
- Backup code input (fallback)
- Error handling and retry logic

## Integration with AuthContext

Update `src/context/AuthContext.tsx` to integrate MFA:

```typescript
import MFAService from '../services/MFAService';
import { MultiFactorError } from 'firebase/auth';

// In your login function:
const handleLogin = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    // Login successful
    setUser(userCredential.user);
  } catch (error: any) {
    // Check if MFA is required
    if (error.code === 'auth/multi-factor-auth-required') {
      const resolver = error.resolver;
      // Show MFA verification modal
      setMfaResolver(resolver);
      setShowMfaModal(true);
    } else {
      // Handle other errors
      console.error('Login error:', error);
    }
  }
};
```

## Usage Examples

### 1. Check if MFA is Required for User Role

```typescript
import MFAService from '../services/MFAService';

const userRole = 'admin'; // or 'manager', 'garcom', etc.
const isRequired = MFAService.isRequiredForRole(userRole);

if (isRequired) {
  // Prompt user to enroll in MFA
  setShowMfaSetupModal(true);
}
```

### 2. Enroll User in MFA

```typescript
import MFAService from '../services/MFAService';
import { useAuth } from '../context/AuthContext';

const { user } = useAuth();

// Start enrollment
const { secret, qrCodeUrl, backupCodes } = await MFAService.startEnrollment(
  user,
  'Restaurant App'
);

// Display QR code to user
// User scans with authenticator app
// User enters verification code

// Complete enrollment
await MFAService.completeEnrollment(
  user,
  secret,
  verificationCode,
  backupCodes
);
```

### 3. Verify MFA During Login

```typescript
import MFAService from '../services/MFAService';

// After catching auth/multi-factor-auth-required error
const resolver = error.resolver;

// User enters TOTP code
await MFAService.verifyCode(resolver, totpCode);

// Or user enters backup code
const isValid = await MFAService.verifyBackupCode(userId, backupCode);
```

## Security Features

### 1. Account Lockout

- After 5 consecutive failed MFA attempts, account is locked for 30 minutes
- Lockout is automatically lifted after the duration
- Failed attempts counter is reset on successful verification

### 2. Backup Codes

- 10 cryptographically secure backup codes generated during enrollment
- Each code can be used only once
- Codes are 8 characters, alphanumeric, uppercase
- Users can regenerate backup codes if needed

### 3. Role-Based Requirements

- MFA is **required** for `admin` and `manager` roles
- MFA is **optional** for other roles (`garcom`, `cozinha`, `caixa`)
- Role checking is case-insensitive

## Testing

### Run Property-Based Tests

```bash
npm test -- __tests__/property/mfa-requirements.test.ts
```

### Test Coverage

The implementation includes property-based tests for:
- **Property 34**: MFA requirement for privileged roles
- **Property 35**: Backup codes generation (uniqueness, format)
- **Property 36**: Account lockout after failed attempts

## Deployment Checklist

- [ ] Install required dependencies
- [ ] Enable MFA in Firebase Console
- [ ] Update Firestore security rules
- [ ] Deploy Firestore indexes
- [ ] Integrate MFAService with AuthContext
- [ ] Add MFA setup flow to user settings
- [ ] Add MFA verification to login flow
- [ ] Test MFA enrollment and verification
- [ ] Test account lockout mechanism
- [ ] Test backup codes functionality
- [ ] Deploy to staging environment
- [ ] Validate with test users
- [ ] Deploy to production

## Troubleshooting

### Issue: QR Code Not Displaying

**Solution**: Ensure `react-native-qrcode-svg` is properly installed and linked.

### Issue: "auth/multi-factor-auth-required" Not Caught

**Solution**: Make sure Firebase MFA is enabled in console and user has enrolled.

### Issue: Backup Codes Not Working

**Solution**: Verify that `mfa_enrollments` collection has correct security rules.

### Issue: Account Locked Indefinitely

**Solution**: Check `lockedUntil` timestamp in Firestore. Manually reset if needed:

```javascript
await updateDoc(doc(db, 'mfa_enrollments', userId), {
  failedAttempts: 0,
  lockedUntil: null,
});
```

## Best Practices

1. **Always show backup codes** to users during enrollment
2. **Encourage users to save backup codes** in a secure location
3. **Provide clear error messages** for failed verification attempts
4. **Log MFA events** for security auditing
5. **Test thoroughly** before requiring MFA for production users
6. **Have a recovery process** for users who lose access to authenticator

## Support

For issues or questions:
- Check Firebase Authentication documentation
- Review property-based tests for expected behavior
- Contact development team for assistance

## References

- [Firebase Multi-Factor Authentication](https://firebase.google.com/docs/auth/web/multi-factor)
- [TOTP RFC 6238](https://tools.ietf.org/html/rfc6238)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
