import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'hourlyx_cookie_consent';

type ConsentStatus = 'accepted' | 'rejected' | null;

export function CookieConsent() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const storedConsent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (storedConsent === 'accepted' || storedConsent === 'rejected') {
      setConsentStatus(storedConsent);
    } else {
      // Show banner after a short delay for better UX
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setConsentStatus('accepted');
    setIsVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected');
    setConsentStatus('rejected');
    setIsVisible(false);
  };

  // Don't render if consent already given
  if (consentStatus !== null || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <Card className="mx-auto max-w-4xl p-4 shadow-lg border-2 bg-card">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <Cookie className="h-6 w-6 text-primary flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium mb-1">Używamy plików cookies</p>
              <p className="text-muted-foreground">
                Korzystamy z plików cookies w celu zapewnienia prawidłowego działania aplikacji 
                i poprawy jakości usług.{' '}
                <Link to="/cookie-policy" className="text-primary hover:underline">
                  Dowiedz się więcej
                </Link>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="flex-1 sm:flex-none"
            >
              Tylko niezbędne
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 sm:flex-none"
            >
              Akceptuję wszystkie
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReject}
              className="hidden sm:flex"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Zamknij</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
