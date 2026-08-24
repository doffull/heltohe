import { Button } from '@/components/ui/button';
import { openCookiePreferences } from '@/context/CookieConsentContext';
import { LegalPageRenderer } from './LegalPageRenderer';

export default function Cookies() {
  return (
    <LegalPageRenderer
      pageKey="cookies"
      extraContent={
        <div className="not-prose my-6">
          <Button onClick={openCookiePreferences} className="text-xs font-bold uppercase tracking-widest">
            Gérer mes préférences cookies
          </Button>
        </div>
      }
    />
  );
}
