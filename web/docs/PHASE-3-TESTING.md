# Phase 3: Backend API Testing Guide

Complete testing guide for the Database Setup Wizard API endpoints.

## Prerequisites

1. **Environment Variables**
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

2. **Authentication**
   - You need a valid authentication token
   - User must have admin role

3. **Tools**
   - curl (command line)
   - Postman (GUI)
   - Or any HTTP client

---

## Test Scenarios

### Scenario 1: Complete Wizard Flow

**Step 1: Initialize Wizard**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "initialize"
  }'
```

**Expected Result:**
- Status: 200
- Response contains `totalLayers: 12`
- All layers have `status: "pending"`

---

**Step 2: Dry Run Layer 1**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "dry-run",
    "options": {
      "layer": 1
    }
  }'
```

**Expected Result:**
- Status: 200
- Response contains SQL content
- `statementsCount` > 0
- No errors

---

**Step 3: Execute Layer 1**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "execute",
    "options": {
      "layer": 1,
      "createBackup": false,
      "dryRun": false
    }
  }'
```

**Expected Result:**
- Status: 200
- `success: true`
- `statementsExecuted` > 0
- `errors: []`

---

**Step 4: Check Progress**
```bash
curl -X GET http://localhost:3000/api/admin/database/setup-wizard/progress \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result:**
- Status: 200
- `completedLayers: 1`
- `percentComplete: 8` (1/12 ≈ 8%)
- Layer 1 has `status: "completed"`

---

**Step 5: Execute Remaining Layers**
```bash
# Execute layers 2-12
for i in {2..12}; do
  curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer YOUR_TOKEN" \
    -d "{
      \"action\": \"execute\",
      \"options\": {
        \"layer\": $i
      }
    }"
  sleep 2
done
```

---

**Step 6: Validate Database**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "validate"
  }'
```

**Expected Result:**
- Status: 200
- `overallScore` > 90
- `missingTables: 0`
- `missingIndexes: 0`

---

### Scenario 2: Rollback

**Step 1: Get Rollback Info**
```bash
curl -X GET http://localhost:3000/api/admin/database/setup-wizard/rollback \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected Result:**
- Status: 200
- `available: true`
- `statementsCount` > 0

---

**Step 2: Execute Rollback**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard/rollback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "confirmToken": "ROLLBACK-CONFIRM",
    "createBackup": true
  }'
```

**Expected Result:**
- Status: 200
- `success: true`
- `rollbackExecuted: true`

---

### Scenario 3: Error Handling

**Test 1: Invalid Layer**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "action": "execute",
    "options": {
      "layer": 999
    }
  }'
```

**Expected Result:**
- Status: 500
- Error message: "Layer 999 not found"

---

**Test 2: Missing Confirmation Token**
```bash
curl -X POST http://localhost:3000/api/admin/database/setup-wizard/rollback \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "confirmToken": "WRONG-TOKEN"
  }'
```

**Expected Result:**
- Status: 400
- Error message: "Invalid confirmation token"

---

**Test 3: Unauthorized Access**
```bash
curl -X GET http://localhost:3000/api/admin/database/setup-wizard/progress
```

**Expected Result:**
- Status: 401
- Error message: "Unauthorized"

---

## Postman Collection

Import this collection into Postman:

```json
{
  "info": {
    "name": "Database Setup Wizard API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Initialize Wizard",
      "request": {
        "method": "POST",
        "url": "{{baseUrl}}/api/admin/database/setup-wizard",
        "body": {
          "mode": "raw",
          "raw": "{\"action\": \"initialize\"}"
        }
      }
    }
  ]
}
```

---

## Automated Testing Script

See `web/scripts/test-wizard-api.ts` for automated testing.

---

## Next Steps

After successful testing:
1. ✅ All endpoints working correctly
2. ✅ Error handling verified
3. ✅ Progress tracking accurate
4. ✅ Rollback functional

**Proceed to Phase 4: Frontend Wizard UI**

