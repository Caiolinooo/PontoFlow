# Mobile Integration Guide

**Last Updated**: 2025-10-16  
**Target Platforms**: React Native, Expo

## Overview

This guide explains how to integrate the ABZ Timesheet Manager API with mobile applications using React Native or Expo.

## Prerequisites

- Node.js 18+
- React Native 0.72+ or Expo SDK 49+
- TypeScript 5+
- @abz/timesheet-types package

## Installation

### React Native

```bash
npx react-native init TimesheetMobile --template react-native-template-typescript
cd TimesheetMobile
npm install @abz/timesheet-types
npm install @supabase/supabase-js
npm install @react-navigation/native @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
```

### Expo

```bash
npx create-expo-app TimesheetMobile --template expo-template-blank-typescript
cd TimesheetMobile
npm install @abz/timesheet-types
npm install @supabase/supabase-js
npm install @react-navigation/native @react-navigation/stack
npx expo install react-native-screens react-native-safe-area-context
```

## Project Structure

```
TimesheetMobile/
├── src/
│   ├── api/
│   │   ├── client.ts          # API client setup
│   │   ├── auth.ts            # Authentication API
│   │   ├── timesheets.ts      # Timesheet API
│   │   └── employees.ts       # Employee API
│   ├── screens/
│   │   ├── LoginScreen.tsx
│   │   ├── TimesheetListScreen.tsx
│   │   ├── TimesheetDetailScreen.tsx
│   │   └── ProfileScreen.tsx
│   ├── components/
│   │   ├── TimesheetCard.tsx
│   │   ├── EntryForm.tsx
│   │   └── LoadingSpinner.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useTimesheets.ts
│   │   └── useEntries.ts
│   ├── types/
│   │   └── index.ts           # Re-export @abz/timesheet-types
│   └── utils/
│       ├── storage.ts         # AsyncStorage helpers
│       └── formatters.ts      # Date/time formatters
├── App.tsx
└── package.json
```

## API Client Setup

### Create API Client

```typescript
// src/api/client.ts
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-domain.com';

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers = {
    'Content-Type': 'application/json',
    ...(session?.access_token && {
      Authorization: `Bearer ${session.access_token}`,
    }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'API request failed');
  }

  return response.json();
}
```

### Authentication API

```typescript
// src/api/auth.ts
import { supabase } from './client';
import type { SignInRequest, SignInResponse } from '@abz/timesheet-types';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function getCurrentUser() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) throw error;
  return user;
}
```

### Timesheet API

```typescript
// src/api/timesheets.ts
import { apiRequest } from './client';
import type {
  Timesheet,
  TimesheetEntry,
  CreateTimesheetEntryRequest,
  SubmitTimesheetRequest,
} from '@abz/timesheet-types';

export async function getTimesheets(): Promise<Timesheet[]> {
  return apiRequest<Timesheet[]>('/api/employee/timesheets');
}

export async function getTimesheet(id: string): Promise<Timesheet> {
  return apiRequest<Timesheet>(`/api/employee/timesheets/${id}`);
}

export async function createEntry(
  timesheetId: string,
  data: CreateTimesheetEntryRequest
): Promise<TimesheetEntry> {
  return apiRequest<TimesheetEntry>(
    `/api/employee/timesheets/${timesheetId}/entries`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  );
}

export async function submitTimesheet(
  timesheetId: string
): Promise<{ success: boolean }> {
  return apiRequest(`/api/employee/timesheets/${timesheetId}/submit`, {
    method: 'POST',
  });
}
```

## React Hooks

### useAuth Hook

```typescript
// src/hooks/useAuth.ts
import { useState, useEffect } from 'react';
import { supabase } from '../api/client';
import { signIn, signOut, getCurrentUser } from '../api/auth';

export function useAuth() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    getCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return {
    user,
    loading,
    signIn,
    signOut,
  };
}
```

### useTimesheets Hook

```typescript
// src/hooks/useTimesheets.ts
import { useState, useEffect } from 'react';
import { getTimesheets } from '../api/timesheets';
import type { Timesheet } from '@abz/timesheet-types';

export function useTimesheets() {
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTimesheets = async () => {
    try {
      setLoading(true);
      const data = await getTimesheets();
      setTimesheets(data);
      setError(null);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTimesheets();
  }, []);

  return {
    timesheets,
    loading,
    error,
    refetch: fetchTimesheets,
  };
}
```

## Screen Examples

### Login Screen

```typescript
// src/screens/LoginScreen.tsx
import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet, Alert } from 'react-native';
import { useAuth } from '../hooks/useAuth';

export function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (error) {
      Alert.alert('Error', (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button
        title={loading ? 'Loading...' : 'Sign In'}
        onPress={handleLogin}
        disabled={loading}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
});
```

### Timesheet List Screen

```typescript
// src/screens/TimesheetListScreen.tsx
import React from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useTimesheets } from '../hooks/useTimesheets';
import type { Timesheet } from '@abz/timesheet-types';

export function TimesheetListScreen({ navigation }: any) {
  const { timesheets, loading, error, refetch } = useTimesheets();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text>Error: {error.message}</Text>
      </View>
    );
  }

  const renderItem = ({ item }: { item: Timesheet }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('TimesheetDetail', { id: item.id })}
    >
      <Text style={styles.period}>
        {item.periodo_ini} - {item.periodo_fim}
      </Text>
      <Text style={styles.status}>{item.status}</Text>
    </TouchableOpacity>
  );

  return (
    <FlatList
      data={timesheets}
      renderItem={renderItem}
      keyExtractor={(item) => item.id}
      onRefresh={refetch}
      refreshing={loading}
      contentContainerStyle={styles.list}
    />
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 15,
  },
  card: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  period: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  status: {
    fontSize: 14,
    color: '#666',
  },
});
```

## Environment Variables

Create `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_API_URL=https://your-domain.com
```

## Testing

### Unit Tests

```typescript
// src/api/__tests__/timesheets.test.ts
import { getTimesheets } from '../timesheets';

jest.mock('../client', () => ({
  apiRequest: jest.fn(),
}));

describe('Timesheet API', () => {
  it('should fetch timesheets', async () => {
    const mockTimesheets = [
      { id: '1', status: 'draft' },
      { id: '2', status: 'submitted' },
    ];

    require('../client').apiRequest.mockResolvedValue(mockTimesheets);

    const result = await getTimesheets();
    expect(result).toEqual(mockTimesheets);
  });
});
```

## Best Practices

1. **Error Handling**: Always wrap API calls in try-catch
2. **Loading States**: Show loading indicators during API calls
3. **Offline Support**: Use AsyncStorage for caching
4. **Type Safety**: Use @abz/timesheet-types for all API interactions
5. **Authentication**: Store tokens securely using Supabase Auth
6. **Refresh Tokens**: Handle token refresh automatically
7. **Network Errors**: Provide retry mechanisms

## Resources

- [React Native Documentation](https://reactnative.dev/)
- [Expo Documentation](https://docs.expo.dev/)
- [Supabase React Native Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-react-native)
- [@abz/timesheet-types Package](../packages/types/README.md)

---

**Next Steps**: Build your mobile app using this guide as a foundation.

