import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollReveal } from "./ScrollReveal";
import { Send, CheckCircle, Loader2, Mail, User, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string()
    .trim()
    .min(1, "Imię jest wymagane")
    .max(100, "Imię może mieć maksymalnie 100 znaków"),
  email: z.string()
    .trim()
    .email("Nieprawidłowy adres email")
    .max(255, "Email może mieć maksymalnie 255 znaków"),
  message: z.string()
    .trim()
    .min(1, "Wiadomość jest wymagana")
    .max(2000, "Wiadomość może mieć maksymalnie 2000 znaków"),
});

export const ContactSection = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
    setSubmitError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSubmitError("");

    // Validate
    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/contact-form`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Wystąpił błąd");
      }

      setIsSuccess(true);
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Wystąpił błąd podczas wysyłania");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <section className="py-20 px-4" id="contact">
        <div className="container mx-auto max-w-2xl">
          <ScrollReveal>
            <Card className="bg-card/50 backdrop-blur-sm border-border">
              <CardContent className="p-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6 animate-scale-in">
                  <CheckCircle className="w-10 h-10 text-primary" />
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-4">
                  Dziękujemy za kontakt!
                </h3>
                <p className="text-muted-foreground mb-6">
                  Twoja wiadomość została wysłana. Odpowiemy najszybciej jak to możliwe.
                </p>
                <Button
                  variant="outline"
                  onClick={() => setIsSuccess(false)}
                  className="hover:bg-primary/10"
                >
                  Wyślij kolejną wiadomość
                </Button>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4" id="contact">
      <div className="container mx-auto max-w-2xl">
        <ScrollReveal>
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Skontaktuj się z nami
            </h2>
            <p className="text-lg text-muted-foreground">
              Masz pytania? Chętnie pomożemy!
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal delay={100}>
          <Card className="bg-card/50 backdrop-blur-sm border-border hover:border-primary/30 transition-colors duration-300">
            <CardContent className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name" className="flex items-center gap-2 text-foreground">
                    <User className="w-4 h-4 text-primary" />
                    Imię
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                    className={cn(
                      "transition-all duration-300 focus:ring-2 focus:ring-primary/20",
                      errors.name && "border-destructive focus:ring-destructive/20"
                    )}
                    disabled={isSubmitting}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.name}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="flex items-center gap-2 text-foreground">
                    <Mail className="w-4 h-4 text-primary" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange("email", e.target.value)}
                    className={cn(
                      "transition-all duration-300 focus:ring-2 focus:ring-primary/20",
                      errors.email && "border-destructive focus:ring-destructive/20"
                    )}
                    disabled={isSubmitting}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message" className="flex items-center gap-2 text-foreground">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    Wiadomość
                  </Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => handleChange("message", e.target.value)}
                    rows={5}
                    className={cn(
                      "transition-all duration-300 focus:ring-2 focus:ring-primary/20 resize-none",
                      errors.message && "border-destructive focus:ring-destructive/20"
                    )}
                    disabled={isSubmitting}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive animate-fade-in">{errors.message}</p>
                  )}
                </div>

                {submitError && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                    {submitError}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full gap-2 py-6 text-lg group"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Wysyłanie...
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                      Wyślij wiadomość
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>
    </section>
  );
};
