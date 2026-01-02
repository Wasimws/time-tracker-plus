import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ownerEmail = Deno.env.get('OWNER_EMAIL');

    if (!ownerEmail) {
      console.log('OWNER_EMAIL not configured');
      return new Response(
        JSON.stringify({ success: false, message: 'OWNER_EMAIL not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update owner_email in system_config
    const { error: configError } = await supabase
      .from('system_config')
      .update({ value: ownerEmail.toLowerCase() })
      .eq('key', 'owner_email');

    if (configError) {
      console.error('Error updating config:', configError);
      throw configError;
    }

    console.log(`Owner email configured: ${ownerEmail}`);

    // Check if owner already exists and update their role if needed
    const { data: ownerProfile } = await supabase
      .from('profiles')
      .select('id, email')
      .ilike('email', ownerEmail)
      .maybeSingle();

    if (ownerProfile) {
      // Check current role
      const { data: currentRole } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', ownerProfile.id)
        .maybeSingle();

      if (currentRole && currentRole.role !== 'management') {
        // Upgrade to management
        const { error: roleError } = await supabase
          .from('user_roles')
          .update({ role: 'management' })
          .eq('user_id', ownerProfile.id);

        if (roleError) {
          console.error('Error upgrading owner role:', roleError);
        } else {
          console.log(`Owner ${ownerEmail} upgraded to management role`);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Owner email configured successfully',
        ownerExists: !!ownerProfile
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in init-owner function:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
