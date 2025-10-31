# Mobile Application Example

This document provides example code for integrating the Timesheet Manager API into mobile applications.

---

## React Native Example

### Installation

```bash
npm install @abz/timesheet-types
# or
yarn add @abz/timesheet-types
```

### Setup

```typescript
// src/api/client.ts
import { createApiClient } from '@abz/timesheet-types';

export const apiClient = createApiClient(
  'https://api.timesheetmanager.abzgroup.com/api'
);

export async function login(email: string, password: string) {
  const response = await apiClient.post('/auth/login', { email, password });
  if (response.success && response.data) {
    apiClient.setToken(response.data.accessToken);
    return response.data;
  }
  throw new Error(response.error || 'Login failed');
}
```

### Timesheet List Screen

```typescript
// src/screens/TimesheetListScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, FlatList, ActivityIndicator, Text } from 'react-native';
import { Timesheet } from '@abz/timesheet-types';
import { apiClient } from '../api/client';

export default function TimesheetListScreen() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadTimesheets();
  }, []);

  const loadTimesheets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/timesheets');
      if (response.success && response.data) {
        setTimesheets(response.data.data || []);
      } else {
        setError(response.error || 'Failed to load timesheets');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'red' }}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={timesheets}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <View style={{ padding: 16, borderBottomWidth: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold' }}>
            {item.periodStart} - {item.periodEnd}
          </Text>
          <Text style={{ color: '#666' }}>Status: {item.status}</Text>
        </View>
      )}
      onRefresh={loadTimesheets}
      refreshing={loading}
    />
  );
}
```

### Timesheet Editor Screen

```typescript
// src/screens/TimesheetEditorScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, Alert } from 'react-native';
import { TimesheetEntry } from '@abz/timesheet-types';
import { apiClient } from '../api/client';

interface Props {
  timesheetId: string;
}

export default function TimesheetEditorScreen({ timesheetId }: Props) {
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddEntry = async () => {
    try {
      setLoading(true);
      const response = await apiClient.post(
        `/timesheets/${timesheetId}/entries`,
        {
          date,
          type: 'embarque',
          startTime,
          endTime,
          notes,
        }
      );

      if (response.success) {
        Alert.alert('Success', 'Entry added successfully');
        // Clear form
        setDate('');
        setStartTime('');
        setEndTime('');
        setNotes('');
      } else {
        Alert.alert('Error', response.error || 'Failed to add entry');
      }
    } catch (err) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={{ padding: 16 }}>
      <TextInput
        placeholder="Date (YYYY-MM-DD)"
        value={date}
        onChangeText={setDate}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Start Time (HH:MM)"
        value={startTime}
        onChangeText={setStartTime}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="End Time (HH:MM)"
        value={endTime}
        onChangeText={setEndTime}
        style={{ borderWidth: 1, padding: 8, marginBottom: 8 }}
      />
      <TextInput
        placeholder="Notes"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={{ borderWidth: 1, padding: 8, marginBottom: 16, height: 100 }}
      />
      <Button
        title={loading ? 'Adding...' : 'Add Entry'}
        onPress={handleAddEntry}
        disabled={loading}
      />
    </View>
  );
}
```

### Notification Preferences Screen

```typescript
// src/screens/NotificationPreferencesScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Switch, Text, Button } from 'react-native';
import { NotificationPreferences } from '@abz/timesheet-types';
import { apiClient } from '../api/client';

export default function NotificationPreferencesScreen() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    userId: '',
    emailNotifications: true,
    pushNotifications: true,
    deadlineReminders: true,
    approvalNotifications: true,
    rejectionNotifications: true,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    const response = await apiClient.get('/notifications/preferences');
    if (response.success && response.data) {
      setPreferences(response.data as NotificationPreferences);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      const response = await apiClient.patch('/notifications/preferences', preferences);
      if (response.success) {
        alert('Preferences saved');
      }
    } finally {
      setLoading(false);
    }
  };

  const togglePreference = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <View style={{ padding: 16 }}>
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>Email Notifications</Text>
          <Switch
            value={preferences.emailNotifications}
            onValueChange={() => togglePreference('emailNotifications')}
          />
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>Push Notifications</Text>
          <Switch
            value={preferences.pushNotifications}
            onValueChange={() => togglePreference('pushNotifications')}
          />
        </View>
      </View>

      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text>Deadline Reminders</Text>
          <Switch
            value={preferences.deadlineReminders}
            onValueChange={() => togglePreference('deadlineReminders')}
          />
        </View>
      </View>

      <Button
        title={loading ? 'Saving...' : 'Save Preferences'}
        onPress={handleSave}
        disabled={loading}
      />
    </View>
  );
}
```

---

## Flutter Example

### Setup

```dart
// lib/api/client.dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class ApiClient {
  final String baseUrl;
  String? _token;

  ApiClient(this.baseUrl);

  void setToken(String token) {
    _token = token;
  }

  Future<Map<String, dynamic>> get(String path) async {
    final response = await http.get(
      Uri.parse('$baseUrl$path'),
      headers: {
        'Authorization': 'Bearer $_token',
        'Content-Type': 'application/json',
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load data');
    }
  }

  Future<Map<String, dynamic>> post(String path, Map<String, dynamic> data) async {
    final response = await http.post(
      Uri.parse('$baseUrl$path'),
      headers: {
        'Authorization': 'Bearer $_token',
        'Content-Type': 'application/json',
      },
      body: jsonEncode(data),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to create resource');
    }
  }
}
```

---

## Best Practices

1. **Error Handling**: Always handle errors gracefully
2. **Loading States**: Show loading indicators during API calls
3. **Token Management**: Refresh tokens before expiration
4. **Offline Support**: Cache data for offline access
5. **Rate Limiting**: Implement exponential backoff for retries
6. **Security**: Never store sensitive data in plain text
7. **Testing**: Write unit tests for API interactions

---

**Last Updated**: 2025-10-16

