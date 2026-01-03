import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export default function CookiePolicy() {
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="mb-6">
          <Link to="/auth">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Powrót
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-primary">{APP_NAME}</span>
            </div>
            <CardTitle className="text-2xl">Polityka Cookies</CardTitle>
            <p className="text-muted-foreground">Ostatnia aktualizacja: 3 stycznia 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold">1. Czym są pliki cookies?</h2>
              <p>
                Pliki cookies (ciasteczka) to małe pliki tekstowe zapisywane na Twoim urządzeniu 
                podczas korzystania z naszej aplikacji. Służą one do prawidłowego funkcjonowania 
                serwisu oraz poprawy jakości usług.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. Jakie cookies wykorzystujemy</h2>
              
              <h3 className="text-lg font-medium mt-4">Cookies niezbędne</h3>
              <p>
                Są konieczne do prawidłowego działania aplikacji. Obejmują:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Sesja użytkownika:</strong> przechowywanie informacji o zalogowaniu</li>
                <li><strong>Token autoryzacyjny:</strong> bezpieczna identyfikacja użytkownika</li>
                <li><strong>Preferencje interfejsu:</strong> tryb ciemny/jasny</li>
              </ul>

              <h3 className="text-lg font-medium mt-4">Cookies funkcjonalne</h3>
              <p>
                Służą do zapamiętywania Twoich preferencji:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Zgoda na cookies:</strong> zapamiętanie Twojego wyboru</li>
                <li><strong>Język interfejsu:</strong> preferencje językowe</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. Okres przechowywania</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Cookies sesyjne:</strong> usuwane po zamknięciu przeglądarki</li>
                <li><strong>Cookies trwałe:</strong> przechowywane do 1 roku</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Zarządzanie cookies</h2>
              <p>
                Możesz zarządzać plikami cookies poprzez ustawienia swojej przeglądarki. 
                Pamiętaj, że wyłączenie niezbędnych cookies może uniemożliwić korzystanie z aplikacji.
              </p>
              <p className="mt-2">
                Aby zmienić ustawienia cookies w przeglądarce, zapoznaj się z dokumentacją 
                swojej przeglądarki lub skorzystaj z panelu ustawień cookies na dole strony.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Podstawa prawna</h2>
              <p>
                Stosowanie plików cookies odbywa się na podstawie:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Art. 173 ustawy Prawo telekomunikacyjne</li>
                <li>Art. 6 ust. 1 lit. a i f RODO (zgoda i prawnie uzasadniony interes)</li>
                <li>Dyrektywy ePrivacy (2002/58/WE)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. Kontakt</h2>
              <p>
                W sprawach dotyczących plików cookies możesz skontaktować się z nami 
                pod adresem: privacy@hourlyx.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
