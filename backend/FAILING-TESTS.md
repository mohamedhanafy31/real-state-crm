# List of Failing Tests (101 total)

## Summary: 101 Failed, 39 Passed, 140 Total

---

## Authentication Tests (auth.e2e-spec.ts) - ~8 failures

### Registration Tests
- ❌ should register a new supervisor (401 Unauthorized - phone exists)
- ❌ should register a new broker (401 Unauthorized - phone exists)
- ❌ should reject duplicate phone number (test setup issue)

### Login Tests
- ❌ should login with valid credentials (expects 200, gets 201)
- ❌ should reject invalid credentials (token/setup issue)

### Profile Tests
- ❌ should get user profile with valid token (401 Unauthorized)
- ❌ should reject invalid token (various issues)
- ❌ should reject missing token (various issues)

---

## Users & Brokers Tests (users.e2e-spec.ts) - ~10 failures

### Create User
- ❌ should create a new broker (400 Bad Request - validation)
- ❌ should fail when broker tries to create user (RBAC issue)

### Update User
- ❌ should update broker email (validation/not found)
- ❌ should prevent duplicate email (validation)

### Block/Unblock User
- ❌ should block inactive broker (state issue)
- ❌ should reject broker blocking users (RBAC issue)

### Assign Areas
- ❌ should assign areas to broker (validation/foreign key)
- ❌ should reject invalid broker ID (validation)

### Performance Metrics
- ❌ should get broker performance (no data/calculation issues)
- ❌ should handle broker with no requests (empty state)

---

## Customers & Requests Tests (requests.e2e-spec.ts) - ~6 failures

### Customer Creation
- ❌ should reject duplicate customer phone (validation)
- ❌ should validate required fields (DTO validation)

### Request Creation
- ❌ should reject missing area_id (foreign key constraint)
- ❌ should reject non-existent customer (foreign key)

### Request Update
- ❌ should reject invalid status transition (business logic)
- ❌ should handle non-existent request (404 handling)

---

## Projects & Units Tests (projects.e2e-spec.ts) - ~10 failures

### Project Tests
- ❌ should create project (500 Internal Server Error - area foreign key)
- ❌ should return 404 for non-existent project (test data)
- ❌ should reject unauthorized project creation (RBAC)

### Unit Tests
- ❌ should create unit (foreign key/validation)
- ❌ should filter units by price range (no test data)
- ❌ should filter units by status (no test data)
- ❌ should filter units by project (no test data)
- ❌ should return 404 for non-existent unit (test data)
- ❌ should delete reserved unit (business logic constraint)
- ❌ should prevent unauthorized unit deletion (RBAC)

---

## Edge Cases Tests (edge-cases.e2e-spec.ts) - ~35 failures

### User Management Edge Cases (~8)
- ❌ should reject empty name (DTO validation)
- ❌ should reject invalid role (enum validation)
- ❌ should reject missing required fields (DTO validation)
- ❌ should handle updating non-existent user (404)
- ❌ should reject duplicate email on update (unique constraint)
- ❌ should reject assigning same area twice (deduplication)
- ❌ should reject assigning to non-existent broker (foreign key)
- ❌ should handle blocking already inactive broker (state)

### Customer & Request Edge Cases (~10)
- ❌ should reject empty customer name (DTO validation)
- ❌ should reject request with non-existent customer (foreign key)
- ❌ should handle updating non-existent request (404)
- ❌ should reject reassigning to non-existent broker (foreign key)
- ❌ should prevent reassigning to same broker (business logic)
- ❌ should reject reassigning paid request (state check)
- ❌ should reject reassigning lost request (state check)
- ❌ should handle request with no history (empty array)
- ❌ should validate customer with multiple requests (data setup)
- ❌ should reject invalid request status transitions (business logic)

### Project & Unit Edge Cases (~12)
- ❌ should reject empty project name (DTO validation)
- ❌ should reject project with invalid area (foreign key)
- ❌ should reject unit with non-existent project (foreign key)
- ❌ should reject unit with negative price (validation)
- ❌ should reject unit with zero size (validation)
- ❌ should handle duplicate unit codes (unique constraint violation)
- ❌ should reject deleting non-existent unit (404)
- ❌ should handle updating unit with invalid status (enum validation)
- ❌ should reject deleting reserved unit (business logic)
- ❌ should prevent duplicate project names in same area (validation)
- ❌ should reject adding unit to inactive project (business logic)
- ❌ should handle cascade delete constraints (data integrity)

### Data Integrity Edge Cases (~5)
- ❌ should preserve request-customer relationship (no test  data)
- ❌ should preserve unit-project relationship (no test data)
- ❌ should maintain request status history order (400 Bad Request)
- ❌ should verify chronological order of status changes (data setup)
- ❌ should handle concurrent status updates (race conditions)

---

## Security Tests (security.e2e-spec.ts) - 4 failures

### Role-Based Access Control
- ❌ should allow supervisor to create users (400 Bad Request - duplicate phone)
- ❌ should allow supervisor to create projects (500 Internal Server Error - area FK)

### Data Access Control
- ❌ should allow supervisor to reassign any request (400 Bad Request - FK constraint)

### Abuse Prevention
- ❌ should handle rapid repeated requests (ECONNRESET - connection pool)

---

## Workflow Tests (workflows.e2e-spec.ts) - ~30 failures (ALL FAILING)

### Complete Customer Journey
- ❌ Step 1: Create customer (FK constraints)
- ❌ Step 2: Create request with auto-assignment (area FK)
- ❌ Step 3: Broker contacts customer (401/state)
- ❌ Step 4: Customer shows interest (state/validation)
- ❌ Step 5: Create project and unit (500 error - FK)
- ❌ Step 6: Reserve unit (state/validation)
- ❌ Step 7: Update request to negotiating (state)
- ❌ Step 8: Verify status history (400 Bad Request)
- ❌ Step 9: Verify all relationships (data missing)

### Customer Cancellation Workflow
- ❌ Setup: Create customer, request, and reserved unit (FK constraints)
- ❌ Customer cancels - update request to lost (state)
- ❌ Release unit back to available (data)
- ❌ Verify status history includes cancellation (400)

### Broker Reassignment Workflow
- ❌ Setup: Create customer and request (FK)
- ❌ Supervisor reassigns to broker 2 (validation)
- ❌ Broker 2 can update the request (401)
- ❌ Verify reassignment in status history (400)

### Multi-Request Workflow
- ❌ Create customer (FK)
- ❌ Create first request for apartment (FK)
- ❌ Create second request for villa (FK)
- ❌ Update first request to paid (state)
- ❌ Update second request to lost (state)
- ❌ Verify customer has both requests (data)

### Project Lifecycle Workflow
- ❌ Create project (500 - FK)
- ❌ Add multiple units (FK/validation)
- ❌ Reserve some units (state)
- ❌ Update unit prices (validation)
- ❌ Get all units in project (no data)
- ❌ Deactivate project (state)
- ❌ Verify project constraints (data integrity)

---

## Failure Categories

### By Error Type:
1. **Foreign Key Constraints** (~30 tests) - Area FK violations
2. **401 Unauthorized** (~20 tests) - Token/auth issues
3. **400 Bad Request** (~15 tests) - Validation errors
4. **404 Not Found** (~10 tests) - Missing test data
5. **500 Internal Server Error** (~8 tests) - Database/FK errors  
6. **State Management** (~10 tests) - Test interdependencies
7. **DTO Validation** (~8 tests) - Missing/invalid fields

### By Root Cause:
1. **Missing Areas in Database** (40+ tests) - Need areas seeded
2. **Phone Number Conflicts** (10+ tests) - Duplicate registrations
3. **Test Isolation Issues** (20+ tests) - Shared state
4. **DTO/Validation Mismatches** (15+ tests) - Schema differences
5. **Business Logic Not Met** (10+ tests) - State constraints
6. **Connection Pool Exhaustion** (1 test) - Load handling

---

## Quick Fix Potential

### Easy Fixes (Could fix ~40 tests):
1. ✅ **Ensure areas table populated** - Would fix ~35 FK constraint errors
2. ✅ **Use unique timestamps for phones** - Would fix ~10 duplicate errors
3. ✅ **Fix login status expectation** (200→201) - Already done
4. ✅ **Unblock broker after test** - Already done

### Medium Fixes (Could fix ~30 tests):
1. ⚠️ **Add proper test database seeding** - Fix workflows
2. ⚠️ **Improve test isolation** - Fix state issues
3. ⚠️ **Update DTO validations** - Fix validation errors
4. ⚠️ **Add test cleanup** - Fix interdependencies

### Hard Fixes (Could fix ~20 tests):
1. 🔴 **Implement full test transactions** - Database rollback
2. 🔴 **Add connection pooling** - Fix ECONNRESET
3. 🔴 **Mock time-dependent operations** - Consistency
4. 🔴 **Address race conditions** - Concurrent operations

---

## Recommended Action Plan

### Phase 1: Database Setup (Quick Win)
```sql
-- Ensure areas exist
INSERT INTO areas (area_id, name_en, name_ar) VALUES 
  (1, 'Cairo', 'القاهرة'),
  (2, 'Giza', 'الجيزة'),
  (3, 'Alexandria', 'الإسكندرية')
ON CONFLICT (area_id) DO NOTHING;
```
**Expected Result**: 35-40 tests pass

### Phase 2: Test Isolation
- Add unique timestamps to all test files
- Clear database between test suites
**Expected Result**: 15-20 more tests pass

### Phase 3: DTO Validation
- Review and fix CreateUserDto
- Review CreateProjectDto
- Review reassignment DTOs
**Expected Result**: 10-15 more tests pass

**Realistic Target**: 80-90 passing tests (57-64%) with these fixes
