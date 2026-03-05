-- ============================================
-- Multi-Tenant Isolation Test
-- ============================================
-- This script tests that RLS policies properly isolate data between businesses
-- Run this in Supabase SQL Editor to verify multi-tenancy works

-- ============================================
-- STEP 1: Create 2 test users and businesses
-- ============================================

-- Test User 1
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  'test-business-1@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Test Business 1", "company_name": "Acme Corp"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Test User 2
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_user_meta_data,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000002',
  'test-business-2@example.com',
  crypt('password123', gen_salt('bf')),
  NOW(),
  '{"full_name": "Test Business 2", "company_name": "TechCo Inc"}'::jsonb,
  NOW(),
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Business 1
INSERT INTO businesses (
  id,
  owner_id,
  name,
  api_key_hash,
  api_key_prefix,
  billing_period_start
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Acme Corp',
  md5('test_key_1'),
  'so_live_test1...',
  CURRENT_DATE
) ON CONFLICT (id) DO NOTHING;

-- Business 2
INSERT INTO businesses (
  id,
  owner_id,
  name,
  api_key_hash,
  api_key_prefix,
  billing_period_start
) VALUES (
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'TechCo Inc',
  md5('test_key_2'),
  'so_live_test2...',
  CURRENT_DATE
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 2: Insert test data for both businesses
-- ============================================

-- Conversations for Business 1
INSERT INTO conversations (
  id,
  business_id,
  user_id,
  started_at,
  status
) VALUES (
  '20000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  NOW(),
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Conversations for Business 2
INSERT INTO conversations (
  id,
  business_id,
  user_id,
  started_at,
  status
) VALUES (
  '20000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  NOW(),
  'active'
) ON CONFLICT (id) DO NOTHING;

-- Knowledge base for Business 1
INSERT INTO knowledge_base (
  id,
  business_id,
  user_id,
  title,
  content,
  embedding
) VALUES (
  '30000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Business 1 Knowledge',
  'This is private data for Business 1',
  array_fill(0, ARRAY[1536])::vector -- Dummy embedding
) ON CONFLICT (id) DO NOTHING;

-- Knowledge base for Business 2
INSERT INTO knowledge_base (
  id,
  business_id,
  user_id,
  title,
  content,
  embedding
) VALUES (
  '30000000-0000-0000-0000-000000000002',
  '10000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000002',
  'Business 2 Knowledge',
  'This is private data for Business 2',
  array_fill(0, ARRAY[1536])::vector -- Dummy embedding
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STEP 3: Test RLS isolation
-- ============================================

-- Set session to Business 1 owner
SET LOCAL request.jwt.claims.sub = '00000000-0000-0000-0000-000000000001';

-- Business 1 should see only their own data
SELECT
  'Business 1 Conversations' AS test,
  COUNT(*) AS count,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Should see exactly 1 conversation'
  END AS result
FROM conversations;

SELECT
  'Business 1 Knowledge Base' AS test,
  COUNT(*) AS count,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Should see exactly 1 knowledge item'
  END AS result
FROM knowledge_base;

-- ============================================
-- STEP 4: Test cross-tenant access is blocked
-- ============================================

-- Try to access Business 2's conversation as Business 1
SELECT
  'Cross-tenant access test' AS test,
  COUNT(*) AS count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS - RLS blocked cross-tenant access'
    ELSE '❌ FAIL - RLS VULNERABILITY! Can see other business data'
  END AS result
FROM conversations
WHERE id = '20000000-0000-0000-0000-000000000002';

-- ============================================
-- STEP 5: Verify businesses table isolation
-- ============================================

SELECT
  'Businesses table' AS test,
  COUNT(*) AS count,
  CASE
    WHEN COUNT(*) = 1 THEN '✅ PASS - Can only see own business'
    ELSE '❌ FAIL - Should see exactly 1 business'
  END AS result
FROM businesses;

-- ============================================
-- STEP 6: Cleanup (optional)
-- ============================================
-- Uncomment to remove test data:

-- DELETE FROM knowledge_base WHERE id IN ('30000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000002');
-- DELETE FROM conversations WHERE id IN ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000002');
-- DELETE FROM businesses WHERE id IN ('10000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000002');
-- DELETE FROM auth.users WHERE id IN ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

-- ============================================
-- EXPECTED RESULTS
-- ============================================
-- All tests should show ✅ PASS
-- If any test shows ❌ FAIL, there is a security issue with RLS policies
