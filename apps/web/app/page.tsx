'use client';

import { AuthProvider } from '../lib/auth';
import { StoreProvider } from '../lib/store';
import { JournalProvider } from '../lib/journal';
import { AppShell } from '../components/AppShell';

export default function Home() {
  return (
    <AuthProvider>
      <StoreProvider>
        <JournalProvider>
          <AppShell />
        </JournalProvider>
      </StoreProvider>
    </AuthProvider>
  );
}
