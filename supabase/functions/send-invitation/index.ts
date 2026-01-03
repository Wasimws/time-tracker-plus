import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-INVITATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const resend = new Resend(resendApiKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      throw new Error("User not authenticated");
    }
    logStep("User authenticated", { userId: user.id });

    // Get user's organization and role
    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id, full_name")
      .eq("id", user.id)
      .single();

    if (!profile?.organization_id) {
      throw new Error("User has no organization");
    }

    const { data: userRole } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", profile.organization_id)
      .single();

    if (userRole?.role !== "management") {
      throw new Error("Only management can send invitations");
    }
    logStep("User is management");

    // Get organization details INCLUDING trial and subscription status
    const { data: org } = await supabase
      .from("organizations")
      .select("id, name, code, trial_end_at")
      .eq("id", profile.organization_id)
      .single();

    if (!org) {
      throw new Error("Organization not found");
    }
    logStep("Organization found", { name: org.name });

    // CHECK SUBSCRIPTION STATUS - block if trial expired and no active subscription
    const now = new Date();
    const trialEndAt = org.trial_end_at ? new Date(org.trial_end_at) : null;
    const isTrialActive = trialEndAt && trialEndAt > now;

    // Check for active Stripe subscription
    const { data: subData } = await supabase
      .from("subscriptions")
      .select("status")
      .eq("organization_id", profile.organization_id)
      .eq("status", "active")
      .maybeSingle();

    const hasActiveStripeSubscription = !!subData;

    if (!isTrialActive && !hasActiveStripeSubscription) {
      throw new Error("Trial zakończony lub brak aktywnej subskrypcji. Nie można wysyłać zaproszeń.");
    }
    logStep("Subscription check passed", { isTrialActive, hasActiveStripeSubscription });

    const { email, role = "employee" } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }
    logStep("Invitation request", { email, role });

    // Check if invitation already exists and is pending
    const { data: existingInvitation } = await supabase
      .from("invitations")
      .select("id, status")
      .eq("email", email.toLowerCase())
      .eq("organization_id", profile.organization_id)
      .eq("status", "pending")
      .maybeSingle();

    if (existingInvitation) {
      throw new Error("Zaproszenie dla tego adresu email już istnieje");
    }

    // Check if user already exists in organization
    const { data: existingUser } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .eq("organization_id", profile.organization_id)
      .maybeSingle();

    if (existingUser) {
      throw new Error("Użytkownik z tym adresem email już należy do organizacji");
    }

    // Create invitation
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data: invitation, error: invitationError } = await supabase
      .from("invitations")
      .insert({
        organization_id: profile.organization_id,
        email: email.toLowerCase(),
        role: role,
        invited_by: user.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (invitationError) {
      logStep("Invitation creation error", invitationError);
      throw new Error("Failed to create invitation");
    }
    logStep("Invitation created", { invitationId: invitation.id });

    // Generate invitation link
    const origin = req.headers.get("origin") || "https://hourlyx.app";
    const inviteLink = `${origin}/auth?invite=${invitation.token}`;

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "Hourlyx <onboarding@resend.dev>",
      to: [email],
      subject: `Zaproszenie do ${org.name} - Hourlyx`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #059669; margin: 0;">Hourlyx</h1>
            <p style="color: #666; margin-top: 5px;">System śledzenia czasu pracy</p>
          </div>
          
          <div style="background: #f9fafb; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
            <h2 style="margin-top: 0;">Zostałeś zaproszony!</h2>
            <p>
              <strong>${profile.full_name || user.email}</strong> zaprasza Cię do dołączenia do firmy 
              <strong>${org.name}</strong> w systemie Hourlyx.
            </p>
            <p>Twoja rola: <strong>${role === 'management' ? 'Zarząd' : 'Pracownik'}</strong></p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${inviteLink}" style="display: inline-block; background: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600;">
              Dołącz do ${org.name}
            </a>
          </div>
          
          <p style="color: #666; font-size: 14px;">
            Link jest ważny przez 7 dni. Jeśli nie spodziewałeś się tego zaproszenia, możesz je zignorować.
          </p>
          
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          
          <p style="color: #999; font-size: 12px; text-align: center;">
            Hourlyx - profesjonalny system śledzenia czasu pracy
          </p>
        </body>
        </html>
      `,
    });

    if (emailError) {
      logStep("Email sending error", emailError);
      // Don't throw - invitation was created, just email failed
      console.error("Failed to send email:", emailError);
    } else {
      logStep("Email sent successfully");
    }

    // Log activity
    await supabase
      .from("activity_log")
      .insert({
        organization_id: profile.organization_id,
        user_id: user.id,
        action_type: "invitation_sent",
        description: `Wysłano zaproszenie do ${email}`,
        metadata: { email, role },
      });

    return new Response(
      JSON.stringify({ 
        success: true, 
        invitation: { id: invitation.id, email, role, expires_at: invitation.expires_at } 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
