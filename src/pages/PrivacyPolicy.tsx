import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Clock } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';

export default function PrivacyPolicy() {
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
            <CardTitle className="text-2xl">Polityka Prywatności</CardTitle>
            <p className="text-muted-foreground">Ostatnia aktualizacja: 3 stycznia 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-xl font-semibold">1. Administrator danych</h2>
              <p>
                Administratorem Twoich danych osobowych jest {APP_NAME}. Kontakt: privacy@hourlyx.com
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">2. Jakie dane zbieramy</h2>
              <p>Przetwarzamy następujące kategorie danych osobowych:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Dane identyfikacyjne:</strong> imię i nazwisko, adres email</li>
                <li><strong>Dane logowania:</strong> hasło (w formie zaszyfrowanej)</li>
                <li><strong>Dane dotyczące czasu pracy:</strong> daty, godziny, notatki</li>
                <li><strong>Dane organizacyjne:</strong> przynależność do firmy, rola w systemie</li>
                <li><strong>Dane techniczne:</strong> adres IP, informacje o urządzeniu, logi aktywności</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">3. Cele przetwarzania danych</h2>
              <p>Twoje dane przetwarzamy w celu:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Świadczenia usługi śledzenia czasu pracy (art. 6 ust. 1 lit. b RODO)</li>
                <li>Obsługi Twojego konta i subskrypcji (art. 6 ust. 1 lit. b RODO)</li>
                <li>Zapewnienia bezpieczeństwa systemu (art. 6 ust. 1 lit. f RODO)</li>
                <li>Wypełnienia obowiązków prawnych (art. 6 ust. 1 lit. c RODO)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">4. Okres przechowywania danych</h2>
              <p>
                Dane przechowujemy przez okres korzystania z usługi oraz przez 3 lata po jej zakończeniu, 
                chyba że przepisy prawa wymagają dłuższego okresu przechowywania.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">5. Twoje prawa</h2>
              <p>Przysługują Ci następujące prawa zgodnie z RODO:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Prawo dostępu</strong> do swoich danych osobowych</li>
                <li><strong>Prawo do sprostowania</strong> nieprawidłowych danych</li>
                <li><strong>Prawo do usunięcia</strong> danych ("prawo do bycia zapomnianym")</li>
                <li><strong>Prawo do ograniczenia</strong> przetwarzania</li>
                <li><strong>Prawo do przenoszenia</strong> danych</li>
                <li><strong>Prawo do sprzeciwu</strong> wobec przetwarzania</li>
                <li><strong>Prawo do cofnięcia zgody</strong> w dowolnym momencie</li>
                <li><strong>Prawo do skargi</strong> do organu nadzorczego (UODO)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold">6. Udostępnianie danych</h2>
              <p>
                Twoje dane mogą być udostępniane podmiotom przetwarzającym dane w naszym imieniu 
                (np. dostawcy usług hostingowych, płatniczych). Nie sprzedajemy danych osobowych 
                podmiotom trzecim.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">7. Bezpieczeństwo danych</h2>
              <p>
                Stosujemy odpowiednie środki techniczne i organizacyjne zapewniające bezpieczeństwo 
                danych, w tym szyfrowanie, kontrolę dostępu i regularne audyty bezpieczeństwa.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold">8. Kontakt</h2>
              <p>
                W sprawach dotyczących przetwarzania danych osobowych możesz skontaktować się z nami 
                pod adresem: privacy@hourlyx.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
