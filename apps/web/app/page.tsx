'use client';

import { AuthProvider } from '../lib/auth';
import { StoreProvider } from '../lib/store';
import { JournalProvider } from '../lib/journal';
import { AppShell } from '../components/AppShell';
import { AlertsWatcher } from '../components/AlertsWatcher';
import { ErrorBoundary, GlobalErrorLogger } from '../components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <GlobalErrorLogger />
      <AuthProvider>
        <StoreProvider>
          <JournalProvider>
            <AlertsWatcher />
            <AppShell />
          </JournalProvider>
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
