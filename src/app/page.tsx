import { HomeRedirect } from '@/features/home/HomeRedirect';
import { ENTRY_FALLBACK_SCRIPT } from '@/lib/entryFallback';

// The proxy answers unknown paths with this page; the script sends them to their own exported file.
export default function Page() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ENTRY_FALLBACK_SCRIPT }} />
      <HomeRedirect />
    </>
  );
}
