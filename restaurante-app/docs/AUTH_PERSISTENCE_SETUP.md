# Authentication Persistence Setup Guide

## Overview

This guide covers the implementation of secure authentication state persistence for the Restaurant App, enabling users to stay logged in across app restarts with automatic session management.

## Features

- ✅ Secure storage using Expo SecureStore
- ✅ 30-day session timeout
- ✅ Automatic session validation
- ✅ Session extension/refresh
- ✅ Comprehensive validation before persistence
- ✅ Automatic cleanup of expired sessions
- ✅ Session info display

## Dependencies

The following dependencies should already be installed with Expo:

```bash
npm install expo-secure-store
```

Or with yarn:

```bash
yarn add expo-secure-store
```

## Implementation

### AuthPersistenceService

The `AuthPersistenceService` provides the following functionality:

#### 1. Persist Authentication State

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';
import { User } from 'firebase/auth';

// After successful Firebase authentication
const user: User = userCredential.user;
const sessionToken = await user.getIdToken();
const refreshToken = user.refreshToken;

await AuthPersistenceService.persistAuthState(user, sessionToken, refreshToken);
```

#### 2. Restore Authentication State

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';

// On app startup
const authState = await AuthPersistenceService.restoreAuthState();

if (authState) {
  // Auth state restored successfully
  console.log('User ID:', authState.userId);
  console.log('Email:', authState.email);
  console.log('Session expires:', authState.expiresAt);
  
  // Validate session token with Firebase
  // ... (see integration example below)
} else {
  // No persisted state or session expired
  // Show login screen
}
```

#### 3. Clear Authentication State

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';

// On logout
await AuthPersistenceService.clearAuthState();
```

#### 4. Check Session Status

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';

// Check if session is expired
const isExpired = await AuthPersistenceService.isSessionExpired();

// Get remaining session time
const remainingMs = await AuthPersistenceService.getRemainingSessionTime();
const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

console.log(`Session expires in ${remainingDays} days`);
```

#### 5. Extend Session

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';

// Refresh session token
const newToken = await user.getIdToken(true); // Force refresh

// Extend session with new token
await AuthPersistenceService.extendSession(newToken);
```

## Integration with AuthContext

Update `src/context/AuthContext.tsx` to integrate persistence:

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';
import { auth } from '../config/firebaseConfig';
import { signInWithCustomToken } from 'firebase/auth';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [initializing, setInitializing] = useState(true);

  // Restore auth state on mount
  useEffect(() => {
    const restoreAuth = async () => {
      try {
        const authState = await AuthPersistenceService.restoreAuthState();

        if (authState) {
          // Validate session token with Firebase
          try {
            // Sign in with custom token or validate existing session
            const userCredential = await signInWithCustomToken(auth, authState.sessionToken);
            setUser(userCredential.user);
            
            console.log('[Auth] Session restored successfully');
          } catch (error) {
            console.error('[Auth] Session validation failed:', error);
            // Clear invalid session
            await AuthPersistenceService.clearAuthState();
          }
        }
      } catch (error) {
        console.error('[Auth] Error restoring auth state:', error);
      } finally {
        setInitializing(false);
        setLoading(false);
      }
    };

    restoreAuth();
  }, []);

  // Persist auth state on login
  const login = async (email: string, password: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const sessionToken = await userCredential.user.getIdToken();
      const refreshToken = userCredential.user.refreshToken;

      // Persist auth state
      await AuthPersistenceService.persistAuthState(
        userCredential.user,
        sessionToken,
        refreshToken
      );

      setUser(userCredential.user);
    } catch (error) {
      console.error('[Auth] Login error:', error);
      throw error;
    }
  };

  // Clear auth state on logout
  const logout = async () => {
    try {
      await auth.signOut();
      await AuthPersistenceService.clearAuthState();
      setUser(null);
    } catch (error) {
      console.error('[Auth] Logout error:', error);
      throw error;
    }
  };

  // Check and refresh session periodically
  useEffect(() => {
    if (!user) return;

    const checkSession = async () => {
      const needsRefresh = await AuthPersistenceService.needsRefresh(7); // 7 days threshold

      if (needsRefresh) {
        try {
          const newToken = await user.getIdToken(true); // Force refresh
          await AuthPersistenceService.extendSession(newToken);
          console.log('[Auth] Session refreshed');
        } catch (error) {
          console.error('[Auth] Session refresh failed:', error);
        }
      }
    };

    // Check every hour
    const intervalId = setInterval(checkSession, 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, initializing, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

## Validation Rules

### Before Persistence

The service validates the following before persisting auth state:

1. **User Object**
   - User ID is present and valid format
   - Email format is valid (if present)

2. **Session Token**
   - Token is non-empty string
   - Token follows JWT format (header.payload.signature)

3. **Timestamps**
   - Timestamps are valid ISO 8601 format
   - Session duration is within bounds (1 min to 30 days)

### On Restoration

The service validates the following when restoring auth state:

1. **Required Fields**
   - userId, sessionToken, expiresAt are present

2. **Format Validation**
   - User ID format is valid
   - Email format is valid (if present)
   - Timestamps are valid ISO format

3. **Session Validity**
   - Session has not expired
   - Session duration is reasonable (1 min to 30 days)

4. **Data Integrity**
   - No corrupted data
   - All fields have expected types

## Security Considerations

### 1. Secure Storage

- Auth state stored in Expo SecureStore
- Encrypted at rest using device keychain (iOS) / Keystore (Android)
- Data isolated per app
- Cannot be accessed by other apps

### 2. Session Timeout

- 30-day maximum session duration
- Automatic expiration enforcement
- Expired sessions automatically cleared
- Session extension requires valid token

### 3. Validation

- Comprehensive validation before persistence
- Validation on restoration
- Invalid states rejected and cleared
- Prevents corrupted data from being used

### 4. Token Management

- Session tokens validated with Firebase
- Tokens refreshed before expiration
- Invalid tokens trigger re-authentication
- Refresh tokens stored securely

## Testing

### Run Property-Based Tests

```bash
npm test -- __tests__/property/auth-persistence.test.ts
```

### Test Coverage

The implementation includes property-based tests for:
- **Property 7**: Authentication state persistence
- **Property 8**: Session timeout enforcement
- **Property 9**: Auth state validation before persistence

### Manual Testing Checklist

- [ ] Test auth state persistence on login
- [ ] Test auth state restoration on app restart
- [ ] Test session expiration after 30 days
- [ ] Test session extension/refresh
- [ ] Test logout clears auth state
- [ ] Test invalid auth state rejection
- [ ] Test corrupted data handling
- [ ] Test with multiple users
- [ ] Test on iOS device
- [ ] Test on Android device

## Usage Examples

### Display Session Info

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';

const SessionInfo = () => {
  const [sessionInfo, setSessionInfo] = useState<any>(null);

  useEffect(() => {
    const loadSessionInfo = async () => {
      const info = await AuthPersistenceService.getSessionInfo();
      setSessionInfo(info);
    };

    loadSessionInfo();
  }, []);

  if (!sessionInfo?.isActive) {
    return <Text>Nenhuma sessão ativa</Text>;
  }

  return (
    <View>
      <Text>Sessão expira em: {sessionInfo.remainingDays} dias</Text>
      <Text>Email: {sessionInfo.email}</Text>
      <Text>Data de expiração: {sessionInfo.expiresAt.toLocaleDateString()}</Text>
    </View>
  );
};
```

### Auto-Refresh Session

```typescript
import AuthPersistenceService from '../services/AuthPersistenceService';
import { useAuth } from '../context/AuthContext';

const useSessionRefresh = () => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const refreshSession = async () => {
      const needsRefresh = await AuthPersistenceService.needsRefresh(7);

      if (needsRefresh) {
        try {
          const newToken = await user.getIdToken(true);
          await AuthPersistenceService.extendSession(newToken);
          console.log('Session refreshed automatically');
        } catch (error) {
          console.error('Auto-refresh failed:', error);
        }
      }
    };

    // Check daily
    const intervalId = setInterval(refreshSession, 24 * 60 * 60 * 1000);

    return () => clearInterval(intervalId);
  }, [user]);
};
```

## Troubleshooting

### Issue: Auth state not persisting

**Solution**:
- Check if SecureStore is available on device
- Verify app has necessary permissions
- Check for validation errors in logs

### Issue: Session expires immediately

**Solution**:
- Verify session token is valid JWT format
- Check timestamp formats are ISO 8601
- Ensure session duration is 30 days

### Issue: Restored auth state invalid

**Solution**:
- Check Firebase token is still valid
- Verify user still exists in Firebase
- Clear auth state and re-login

### Issue: SecureStore errors on Android

**Solution**:
- Ensure device has secure lock screen enabled
- Check Android Keystore is accessible
- Try clearing app data and re-login

## Best Practices

1. **Always validate restored state** - Don't assume persisted data is valid
2. **Refresh tokens proactively** - Don't wait for expiration
3. **Clear state on logout** - Prevent unauthorized access
4. **Handle errors gracefully** - Fallback to login screen
5. **Log persistence events** - For debugging and auditing
6. **Test on real devices** - Emulators may have limited SecureStore support
7. **Monitor session duration** - Alert users before expiration
8. **Validate with Firebase** - Always verify tokens with backend

## Deployment Checklist

- [ ] Install expo-secure-store dependency
- [ ] Integrate AuthPersistenceService with AuthContext
- [ ] Add session restoration on app startup
- [ ] Add session persistence on login
- [ ] Add session clearing on logout
- [ ] Implement session refresh logic
- [ ] Add session info display (optional)
- [ ] Test on iOS device
- [ ] Test on Android device
- [ ] Test session expiration
- [ ] Test with multiple users
- [ ] Deploy to staging
- [ ] Validate with test users
- [ ] Deploy to production

## References

- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [Firebase Auth Persistence](https://firebase.google.com/docs/auth/web/auth-state-persistence)
- [iOS Keychain Services](https://developer.apple.com/documentation/security/keychain_services)
- [Android Keystore](https://developer.android.com/training/articles/keystore)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)

## Support

For issues or questions:
- Check Expo SecureStore documentation
- Review property-based tests for expected behavior
- Test on physical devices
- Contact development team for assistance
