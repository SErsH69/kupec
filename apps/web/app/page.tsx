'use client';

import { AuthProvider } from '../lib/auth';
import { StoreProvider } from '../lib/store';
import { JournalProvider } from '../lib/journal';
import { AppShell } from '../components/AppShell';
import { ErrorBoundary, GlobalErrorLogger } from '../components/ErrorBoundary';

export default function Home() {
  return (
    <ErrorBoundary>
      <GlobalErrorLogger />
      <AuthProvider>
        <StoreProvider>
          <JournalProvider>
            <AppShell />
          </JournalProvider>
        </StoreProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
