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

    const { organizationCode, organizationName, action } = await req.json();

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the user from the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader && action === 'assign_org') {
      return new Response(
        JSON.stringify({ success: false, error: 'Brak autoryzacji' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    // Action: assign existing user to organization
    if (action === 'assign_org') {
      // Get user from JWT token
      const token = authHeader!.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);

      if (userError || !user) {
        console.error('Error getting user:', userError);
        return new Response(
          JSON.stringify({ success: false, error: 'Nie można zweryfikować użytkownika' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const userId = user.id;
      const email = user.email!;
      const fullName = user.user_metadata?.full_name || '';

      // Check if user already has an organization
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile?.organization_id) {
        // User already assigned to an organization, return success
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', existingProfile.organization_id)
          .maybeSingle();

        return new Response(
          JSON.stringify({ 
            success: true, 
            userId,
            organizationId: existingProfile.organization_id,
            isNewOrg: false,
            role: userRole?.role || 'employee',
            message: 'Użytkownik już przypisany do firmy'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

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
          return new Response(
            JSON.stringify({ success: false, error: 'Nie udało się utworzyć firmy' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        orgId = newOrg.id;
        isNewOrg = true;
        assignedRole = 'management';
      }

      // Check if this is the owner email
      if (ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) {
        assignedRole = 'management';
      }

      // Update or create profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          email: email,
          full_name: fullName,
          organization_id: orgId,
        }, { onConflict: 'id' });

      if (profileError) {
        console.error('Error updating profile:', profileError);
      }

      // Check if role already exists
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role with organization
        await supabase
          .from('user_roles')
          .update({ 
            organization_id: orgId,
            role: isNewOrg ? 'management' : existingRole.role 
          })
          .eq('id', existingRole.id);
      } else {
        // Create new role
        await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: assignedRole,
            organization_id: orgId,
          });
      }

      // Create subscription for new organization
      if (isNewOrg) {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!existingSub) {
          await supabase
            .from('subscriptions')
            .insert({
              user_id: userId,
              organization_id: orgId,
              status: 'trial',
            });
        }
      }

      // Log activity
      await supabase
        .from('activity_log')
        .insert({
          organization_id: orgId,
          user_id: userId,
          action_type: 'user_registered',
          description: `Użytkownik ${fullName || email} ${isNewOrg ? 'utworzył firmę' : 'dołączył do firmy'}`,
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
