# Firebase to Supabase Migration - Requirements

## 1. Overview

Complete the migration of a React Native restaurant management app from Firebase to Supabase, ensuring all services, authentication, and data structures are fully migrated with zero data loss.

## 2. User Stories

### 2.1 As a developer
I want all Firebase dependencies removed so that the app runs exclusively on Supabase infrastructure.

### 2.2 As a system administrator
I want all existing data migrated to Supabase so that no historical data is lost during the transition.

### 2.3 As an end user
I want the app to continue working seamlessly so that I don't experience any service interruption.

### 2.4 As a developer
I want proper database schema in Supabase so that all app features work correctly.

## 3. Acceptance Criteria

### 3.1 Database Schema Complete
- All missing Supabase tables created (`cash_registers`, `cash_movements`, `comandas`, `employees`)
- All RLS policies configured for multi-tenant security
- All triggers and functions implemented
- Schema matches app requirements

### 3.2 Services Migrated
- All 18+ Firestore services migrated to Supabase
- No imports from `firebase/firestore` in service files
- All services use `supabase` client
- Offline support maintained where needed

### 3.3 Authentication Unified
- Single auth context using Supabase Auth
- Legacy Firebase auth context removed
- Biometric auth works with Supabase
- MFA support implemented in Supabase

### 3.4 Firebase Dependencies Removed
- `firebase` and `firebase-admin` removed from package.json
- `firebaseConfig.js` deleted
- No Firebase imports in codebase (except migration scripts)
- Firebase Functions migrated to Supabase Edge Functions or RPC

### 3.5 Data Migration Complete
- All Firestore data migrated to Supabase
- Migration scripts tested and documented
- Rollback plan available
- Data integrity verified

### 3.6 Testing Complete
- All services tested with Supabase
- Offline functionality verified
- RLS policies tested for security
- Performance benchmarks met

## 4. Technical Requirements

### 4.1 Database
- PostgreSQL via Supabase
- Row Level Security (RLS) enabled
- Multi-tenant architecture (company_id)
- JSONB for flexible data structures
- Triggers for audit logging and statistics

### 4.2 Authentication
- Supabase Auth with email/password
- Biometric authentication support
- Role-based access control (admin, manager, waiter, kitchen)
- Session persistence via AsyncStorage

### 4.3 Real-time
- Supabase Realtime for live updates
- Fallback to polling where needed
- Offline queue for write operations

### 4.4 Performance
- Response time < 500ms for queries
- Offline-first architecture
- Optimistic UI updates
- Caching where appropriate

## 5. Out of Scope

- UI/UX changes
- New features
- Performance optimizations beyond migration requirements
- Mobile app redesign

## 6. Dependencies

- Supabase project configured
- Database migrations applied
- Environment variables set
- Migration scripts prepared

## 7. Risks

### 7.1 Data Loss
**Mitigation**: Comprehensive migration scripts with validation and rollback

### 7.2 Service Interruption
**Mitigation**: Phased migration with dual-write period

### 7.3 Performance Degradation
**Mitigation**: Load testing before full cutover

### 7.4 Security Issues
**Mitigation**: RLS policy review and penetration testing

## 8. Success Metrics

- Zero data loss during migration
- 100% of services using Supabase
- No Firebase dependencies in package.json
- All tests passing
- App performance maintained or improved
