import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { 
  Clock, 
  ArrowLeft, 
  Target, 
  Users, 
  Zap, 
  Shield, 
  Mail, 
  Heart,
  CheckCircle
} from "lucide-react";

const About = () => {
  const features = [
    {
      icon: Clock,
      title: "Śledzenie czasu pracy",
      description: "Intuicyjny system rejestracji godzin pracy z możliwością dodawania notatek i obliczania zarobków."
    },
    {
      icon: Users,
      title: "Zarządzanie zespołem",
      description: "Panel zarządu umożliwiający zarządzanie pracownikami, rolami i dostępem do danych."
    },
    {
      icon: Mail,
      title: "System zaproszeń",
      description: "Zapraszaj nowych członków zespołu przez email z automatycznym przypisaniem ról."
    },
    {
      icon: Shield,
      title: "Bezpieczeństwo danych",
      description: "Zaawansowane zabezpieczenia i polityki dostępu chronią Twoje dane firmowe."
    },
    {
      icon: Zap,
      title: "Szybkość działania",
      description: "Zoptymalizowana aplikacja zapewnia płynne działanie bez opóźnień."
    },
    {
      icon: Target,
      title: "Prostota użytkowania",
      description: "Intuicyjny interfejs pozwala na szybkie wdrożenie bez szkoleń."
    }
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-primary/20 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob" />
        <div className="absolute top-0 -right-4 w-72 h-72 bg-accent/40 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-primary/15 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000" />
        
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
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Clock className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold text-foreground">Hourlyx</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link to="/">
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Powrót</span>
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <div className="text-center mb-12">
              <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-6">
                O aplikacji Hourlyx
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Hourlyx to nowoczesna platforma do zarządzania czasem pracy, stworzona 
                z myślą o małych i średnich firmach, które cenią prostotę i efektywność.
              </p>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mission Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/30 transition-colors duration-300">
              <CardContent className="p-8 sm:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Heart className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">Nasza misja</h2>
                    <p className="text-muted-foreground leading-relaxed">
                      Wierzymy, że zarządzanie czasem pracy nie musi być skomplikowane. 
                      Naszą misją jest dostarczenie narzędzia, które jest proste w użyciu, 
                      ale jednocześnie wystarczająco rozbudowane, aby sprostać potrzebom 
                      nowoczesnych zespołów. Hourlyx powstał, aby ułatwić życie zarówno 
                      pracodawcom, jak i pracownikom.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-5xl">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-foreground text-center mb-12">
              Główne funkcje
            </h2>
          </ScrollReveal>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <ScrollReveal key={index} delay={index * 100}>
                <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 h-full">
                  <CardContent className="p-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Info Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl">
          <ScrollReveal>
            <Card className="bg-gradient-to-br from-primary/5 to-accent/5 border-border hover:border-primary/30 transition-colors duration-300">
              <CardContent className="p-8 sm:p-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                      Formularz kontaktowy
                    </h2>
                    <p className="text-muted-foreground leading-relaxed mb-4">
                      Wszystkie wiadomości wysłane przez nasz formularz kontaktowy trafiają 
                      bezpośrednio do działu wsparcia Hourlyx. Nasz zespół stara się odpowiadać 
                      na wszystkie zapytania w ciągu 24-48 godzin roboczych.
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Pytania dotyczące funkcji aplikacji</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Wsparcie techniczne i rozwiązywanie problemów</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Sugestie i propozycje nowych funkcji</span>
                      </li>
                      <li className="flex items-center gap-2 text-muted-foreground">
                        <CheckCircle className="w-4 h-4 text-primary" />
                        <span>Pytania o subskrypcje i płatności</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Link to="/contact">
                    <Button size="lg" className="gap-2 w-full sm:w-auto">
                      <Mail className="w-4 h-4" />
                      Skontaktuj się z nami
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold text-foreground">Hourlyx</span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <Link to="/contact" className="hover:text-foreground transition-colors">
                Kontakt
              </Link>
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

export default About;
