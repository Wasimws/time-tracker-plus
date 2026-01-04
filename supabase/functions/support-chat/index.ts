import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Jesteś pomocnym asystentem AI aplikacji Hourlyx - systemu do zarządzania czasem pracy.

Informacje o Hourlyx:
- Hourlyx to kompletny system do śledzenia czasu pracy, zarządzania pracownikami i subskrypcjami
- Oferuje 3 dni darmowego trialu
- Cena: 99,99 zł miesięcznie
- Nieograniczona liczba pracowników

Główne funkcje:
1. Panel Zarządu - zarządzanie zespołem, przypisywanie ról, kontrola dostępu
2. Panel Pracownika - rejestracja godzin pracy, obliczanie zarobków, śledzenie aktywności
3. System Zaproszeń Email - zapraszanie pracowników przez email z automatycznym przypisaniem do organizacji
4. Dziennik Aktywności - pełny log wszystkich działań w firmie
5. Subskrypcje - integracja ze Stripe, elastyczne plany płatności
6. Trial 3 dni - pełny dostęp do wszystkich funkcji za darmo

Jak działa system zaproszeń:
- Zarząd może wysłać zaproszenie email do nowego pracownika
- Pracownik otrzymuje link z tokenem zaproszenia
- Po kliknięciu linku, pracownik może się zarejestrować i automatycznie dołączy do organizacji
- Zaproszenia mają datę ważności

Jak działają subskrypcje:
- Po zakończeniu 3-dniowego trialu, organizacja musi wykupić subskrypcję
- Płatności obsługiwane przez Stripe
- Dostęp do portalu klienta do zarządzania subskrypcją

Odpowiadaj krótko i pomocnie. Używaj języka polskiego.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Zbyt wiele zapytań, spróbuj ponownie za chwilę." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Usługa tymczasowo niedostępna." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(JSON.stringify({ error: "Błąd serwera AI" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("Support chat error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Nieznany błąd" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
