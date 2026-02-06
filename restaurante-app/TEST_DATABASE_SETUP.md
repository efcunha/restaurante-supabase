# Test Database Setup Instructions

## Problem

The test suite is failing because the `profiles` table has a foreign key constraint to `auth.users`, but Supabase Auth API is not working properly in the test environment.

## Solution

You need to remove the foreign key constraint from the test database to allow tests to create profiles without auth.users entries.

### Option 1: Remove FK Constraint (Recommended for Test Database)

Run this SQL in your **test database** (NOT production):

```sql
-- Remove the foreign key constraint
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Verify it's removed
SELECT conname, conrelid::regclass, confrelid::regclass
FROM pg_constraint
WHERE conname = 'profiles_id_fkey';
```

### Option 2: Create a Separate Test Database

1. Create a new Supabase project specifically for testing
2. Run all migrations EXCEPT the one that creates the FK constraint
3. Update `.env.test` with the new test database credentials

### Option 3: Use Database Trigger (More Complex)

Create a trigger that auto-creates auth.users entries when profiles are inserted:

```sql
CREATE OR REPLACE FUNCTION create_auth_user_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into auth.users if not exists
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    crypt('test-password', gen_salt('bf')), -- Default test password
    NOW(),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER create_auth_user_before_profile_insert
BEFORE INSERT ON profiles
FOR EACH ROW
EXECUTE FUNCTION create_auth_user_for_profile();
```

## Why This Happens

1. The `profiles` table has a foreign key: `profiles.id` → `auth.users.id`
2. Supabase Auth API (`admin.createUser()` and `signUp()`) are failing with "Database error"
3. This prevents tests from creating test users

## Recommended Approach

**For test databases**: Remove the FK constraint (Option 1)
- Tests use service role key which bypasses RLS anyway
- Tests don't need real authentication
- Simpler and faster test execution

**For production**: Keep the FK constraint
- Ensures data integrity
- Real users go through proper Auth flow

## After Fixing

Once you've applied Option 1, run the tests again:

```bash
npm test -- __tests__/setup/testDatabase.test.ts --testTimeout=15000
```

All tests should pass! ✅
