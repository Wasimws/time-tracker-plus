import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const ownerEmail = Deno.env.get('OWNER_EMAIL');

    const { email, password, fullName, organizationCode, organizationName, action } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Action: check if organization exists
    if (action === 'check_org') {
      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, code')
        .eq('code', organizationCode.toLowerCase())
        .maybeSingle();

      return new Response(
        JSON.stringify({ exists: !!org, organization: org }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Action: register user with organization
    if (action === 'register') {
      // Check if organization exists
      let orgId: string;
      let isNewOrg = false;
      let assignedRole: 'employee' | 'management' = 'employee';

      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('id')
        .eq('code', organizationCode.toLowerCase())
        .maybeSingle();

      if (existingOrg) {
        orgId = existingOrg.id;
        assignedRole = 'employee';
      } else {
        // Create new organization
        const { data: newOrg, error: orgError } = await supabase
          .from('organizations')
          .insert({
            name: organizationName || organizationCode,
            code: organizationCode.toLowerCase(),
          })
          .select()
          .single();

        if (orgError) {
          console.error('Error creating organization:', orgError);
          throw new Error('Nie udało się utworzyć firmy');
        }

        orgId = newOrg.id;
        isNewOrg = true;
        assignedRole = 'management';

        // Create subscription for new organization
        await supabase
          .from('subscriptions')
          .insert({
            organization_id: orgId,
            status: 'trial',
          });
      }

      // Check if this is the owner email
      if (ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) {
        assignedRole = 'management';
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      });

      if (authError) {
        console.error('Error creating user:', authError);
        
        // If new org was created but user failed, clean up
        if (isNewOrg) {
          await supabase.from('organizations').delete().eq('id', orgId);
        }
        
        if (authError.message.includes('already')) {
          throw new Error('Ten email jest już zarejestrowany');
        }
        throw new Error(authError.message);
      }

      const userId = authData.user.id;

      // Create profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          email: email,
          full_name: fullName,
          organization_id: orgId,
        });

      if (profileError) {
        console.error('Error creating profile:', profileError);
      }

      // Assign role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: assignedRole,
          organization_id: orgId,
        });

      if (roleError) {
        console.error('Error assigning role:', roleError);
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          organization_id: orgId,
          user_id: userId,
          action_type: 'user_registered',
          description: `Użytkownik ${fullName} (${email}) zarejestrował się ${isNewOrg ? 'i utworzył firmę' : 'w firmie'}`,
          metadata: { isNewOrg, role: assignedRole },
        });

      return new Response(
        JSON.stringify({ 
          success: true, 
          userId,
          organizationId: orgId,
          isNewOrg,
          role: assignedRole,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in register-with-org function:', error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
