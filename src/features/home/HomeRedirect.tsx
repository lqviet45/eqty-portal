'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LoadingState } from '@/components/ui/States';
import { PICKER_PATH } from '@/lib/routes';

// The picker decides where to go (one company opens straight away) and asks for sign-in if needed.
export function HomeRedirect() {
  const router = useRouter();
  useEffect(() => router.replace(PICKER_PATH), [router]);
  return <LoadingState />;
}
