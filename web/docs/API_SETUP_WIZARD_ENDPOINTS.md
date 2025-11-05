# Database Setup Wizard API Endpoints

Complete API documentation for the Database Setup Wizard endpoints.

## Overview

The Setup Wizard provides a step-by-step approach to database initialization using pre-defined SQL migration scripts. It supports:

- ✅ Step-by-step execution (layer by layer)
- ✅ Progress tracking
- ✅ Dry-run mode (preview changes)
- ✅ Rollback capabilities
- ✅ Validation

---

## Base URL

```
/api/admin/database/setup-wizard
```

---

## Authentication

All endpoints require:
- Valid authentication token
- Admin role

---

## Endpoints

### 1. Initialize Wizard

**POST** `/api/admin/database/setup-wizard`

Initialize the wizard and load all SQL migration layers.

**Request Body:**
```json
{
  "action": "initialize"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLayers": 12,
    "completedLayers": 0,
    "currentLayer": 0,
    "status": "idle",
    "layers": [
      {
        "id": "layer-1",
        "name": "extensions",
        "order": 1,
        "description": "Extensions",
        "status": "pending",
        "components": 2
      }
    ]
  }
}
```

---

### 2. Execute Layer

**POST** `/api/admin/database/setup-wizard`

Execute a specific migration layer.

**Request Body:**
```json
{
  "action": "execute",
  "options": {
    "layer": 1,
    "createBackup": false,
    "dryRun": false,
    "skipValidation": false
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "layer": 1,
    "layerName": "extensions",
    "startedAt": "2025-01-05T10:00:00Z",
    "completedAt": "2025-01-05T10:00:02Z",
    "duration": 2000,
    "statementsExecuted": 2,
    "errors": [],
    "warnings": []
  }
}
```

---

### 3. Dry Run

**POST** `/api/admin/database/setup-wizard`

Preview what would be executed without making changes.

**Request Body:**
```json
{
  "action": "dry-run",
  "options": {
    "layer": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "layer": 1,
    "layerName": "extensions",
    "sqlContent": "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";\n...",
    "estimatedDuration": 200,
    "statementsCount": 2,
    "affectedTables": [],
    "warnings": []
  }
}
```

---

### 4. Get Status

**GET** `/api/admin/database/setup-wizard`

Get current wizard status.

**Response:**
```json
{
  "success": true,
  "data": {
    "initialized": true,
    "totalLayers": 12,
    "completedLayers": 3,
    "currentLayer": 4,
    "status": "in_progress",
    "layers": [...]
  }
}
```

---

### 5. Get Progress (Detailed)

**GET** `/api/admin/database/setup-wizard/progress`

Get detailed progress information with metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalLayers": 12,
    "completedLayers": 3,
    "currentLayer": 4,
    "status": "in_progress",
    "percentComplete": 25,
    "totalComponents": 150,
    "completedComponents": 45,
    "estimatedTimeRemaining": 180,
    "metrics": {
      "totalLayers": 12,
      "completedLayers": 3,
      "failedLayers": 0,
      "pendingLayers": 9,
      "runningLayers": 0,
      "skippedLayers": 0
    },
    "timing": {
      "startedAt": "2025-01-05T10:00:00Z",
      "estimatedCompletion": "2025-01-05T10:03:00Z",
      "estimatedTimeRemaining": 180,
      "averageLayerDuration": 2000
    },
    "layers": [...]
  }
}
```

---

### 6. Validate Database

**POST** `/api/admin/database/setup-wizard`

Validate current database structure.

**Request Body:**
```json
{
  "action": "validate"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "timestamp": "2025-01-05T10:00:00Z",
    "summary": {
      "totalTables": 27,
      "validTables": 20,
      "missingTables": 7,
      "overallScore": 74
    },
    "tables": [...],
    "indexes": [...],
    "policies": [...],
    "functions": [...],
    "errors": [],
    "warnings": []
  }
}
```

---

### 7. Rollback

**POST** `/api/admin/database/setup-wizard/rollback`

Rollback all wizard changes.

**Request Body:**
```json
{
  "confirmToken": "ROLLBACK-CONFIRM",
  "createBackup": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Rollback completed successfully",
  "data": {
    "duration": 5000,
    "stepsExecuted": 1,
    "rollbackExecuted": true,
    "summary": {
      "totalSteps": 1,
      "completedSteps": 1,
      "failedSteps": 0,
      "skippedSteps": 0
    }
  }
}
```

---

### 8. Get Rollback Info

**GET** `/api/admin/database/setup-wizard/rollback`

Get information about the rollback script.

**Response:**
```json
{
  "success": true,
  "data": {
    "available": true,
    "statementsCount": 50,
    "size": 15000,
    "warning": "Rollback will drop all tables, functions, triggers, and policies created by the wizard",
    "confirmationRequired": "ROLLBACK-CONFIRM"
  }
}
```

---

## Error Responses

All endpoints may return error responses:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Common Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not admin)
- `404` - Not Found
- `500` - Internal Server Error

---

## Usage Examples

See `PHASE-3-TESTING.md` for complete testing examples with curl and Postman.

