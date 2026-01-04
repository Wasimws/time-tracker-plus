import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Users, 
  Mail, 
  Activity, 
  CreditCard, 
  Clock, 
  Shield,
  BarChart3,
  UserPlus,
  ArrowRight,
  Check
} from "lucide-react";

const Landing = () => {
  const features = [
    {
      icon: Users,
      title: "Panel Zarządu",
      description: "Zarządzaj zespołem, przypisuj role i kontroluj dostęp do danych firmy."
    },
    {
      icon: Clock,
      title: "Panel Pracownika",
      description: "Rejestruj godziny pracy, obliczaj zarobki i śledź swoją aktywność."
    },
    {
      icon: Mail,
      title: "Zaproszenia Email",
      description: "Zapraszaj nowych pracowników przez email z automatycznym przypisaniem do organizacji."
    },
    {
      icon: Activity,
      title: "Dziennik Aktywności",
      description: "Śledź wszystkie działania w firmie z pełnym logiem zdarzeń."
    },
    {
      icon: CreditCard,
      title: "Subskrypcje",
      description: "Elastyczne plany płatności z integracją Stripe i portalem klienta."
    },
    {
      icon: Shield,
      title: "3 Dni Trial",
      description: "Wypróbuj wszystkie funkcje przez 3 dni całkowicie za darmo."
    }
  ];

  const benefits = [
    "Automatyczne przypisanie ról",
    "Bezpieczna autoryzacja",
    "Responsywny interfejs",
    "Ciemny i jasny motyw",
    "Integracja z płatnościami",
    "Dziennik aktywności"
  ];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/40 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/30 rounded-full mix-blend-multiply filter blur-2xl opacity-50 animate-blob animation-delay-3000" />
        
        {/* Grid pattern overlay */}
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Hourlyx</span>
          </div>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/auth">
              <Button variant="ghost" className="hidden sm:inline-flex">
                Zaloguj się
              </Button>
            </Link>
            <Link to="/auth?mode=register">
              <Button className="gap-2">
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Zarejestruj się</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent text-accent-foreground text-sm font-medium mb-8 animate-fade-in">
            <Shield className="w-4 h-4" />
            <span>3 dni darmowego trial</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight animate-fade-in">
            Zarządzaj czasem pracy
            <span className="block text-primary mt-2">swojego zespołu</span>
          </h1>
          
          <p className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto animate-fade-in">
            Hourlyx to kompletny system do śledzenia czasu pracy, zarządzania pracownikami 
            i subskrypcjami. Wszystko w jednym miejscu.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
            <Link to="/auth?mode=register">
              <Button size="lg" className="text-lg px-8 py-6 gap-2 w-full sm:w-auto group">
                Rozpocznij za darmo
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="text-lg px-8 py-6 w-full sm:w-auto">
                Mam już konto
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { value: "99,99 zł", label: "miesięcznie" },
              { value: "3 dni", label: "darmowy trial" },
              { value: "∞", label: "pracowników" },
              { value: "24/7", label: "dostęp online" }
            ].map((stat, index) => (
              <div 
                key={index}
                className="text-center p-6 rounded-2xl bg-card/50 backdrop-blur-sm border border-border hover:border-primary/50 transition-all duration-300 hover:scale-105"
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-2">{stat.value}</div>
                <div className="text-sm text-muted-foreground">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Wszystko, czego potrzebujesz
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Kompletny zestaw narzędzi do zarządzania czasem pracy i zespołem
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1"
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 px-4 bg-card/30">
        <div className="container mx-auto">
          <div className="max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-6">
                Dlaczego Hourlyx?
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Stworzyliśmy Hourlyx z myślą o prostocie i efektywności. 
                Żadnych zbędnych funkcji – tylko to, co naprawdę potrzebujesz.
              </p>
              
              <ul className="space-y-4">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <Check className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-foreground">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="relative">
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20 p-8 flex items-center justify-center">
                <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                  <div className="aspect-square rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <BarChart3 className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Statystyki</span>
                  </div>
                  <div className="aspect-square rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <Users className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Zespół</span>
                  </div>
                  <div className="aspect-square rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <Clock className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Czas</span>
                  </div>
                  <div className="aspect-square rounded-2xl bg-card/80 backdrop-blur-sm border border-border p-4 flex flex-col items-center justify-center hover:scale-105 transition-transform">
                    <Activity className="w-8 h-8 text-primary mb-2" />
                    <span className="text-sm text-muted-foreground">Aktywność</span>
                  </div>
                </div>
              </div>
              
              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-2xl bg-primary/20 backdrop-blur-sm animate-blob" />
              <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-xl bg-accent/30 backdrop-blur-sm animate-blob animation-delay-2000" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto">
          <div className="max-w-3xl mx-auto text-center bg-gradient-to-br from-primary/10 to-accent/10 rounded-3xl p-8 sm:p-12 border border-border">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Gotowy, aby zacząć?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Wypróbuj Hourlyx przez 3 dni za darmo. Bez karty kredytowej.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/auth?mode=register">
                <Button size="lg" className="text-lg px-8 py-6 gap-2 w-full sm:w-auto">
                  <UserPlus className="w-5 h-5" />
                  Zarejestruj się
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 w-full sm:w-auto">
                  Zaloguj się
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Hourlyx</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy-policy" className="hover:text-foreground transition-colors">
                Polityka Prywatności
              </Link>
              <Link to="/cookie-policy" className="hover:text-foreground transition-colors">
                Polityka Cookies
              </Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Hourlyx. Wszelkie prawa zastrzeżone.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
