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

    // Action: check if organization exists (public endpoint)
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

      console.log(`Processing assign_org for user ${email} (${userId})`);

      // Check if user already has an organization
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('organization_id')
        .eq('id', userId)
        .maybeSingle();

      if (existingProfile?.organization_id) {
        // User already assigned to an organization - return their current data
        console.log(`User ${email} already has organization ${existingProfile.organization_id}`);
        
        const { data: userRole } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('organization_id', existingProfile.organization_id)
          .maybeSingle();

        const { data: org } = await supabase
          .from('organizations')
          .select('id, name, code')
          .eq('id', existingProfile.organization_id)
          .maybeSingle();

        return new Response(
          JSON.stringify({ 
            success: true, 
            userId,
            organizationId: existingProfile.organization_id,
            organization: org,
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
        .select('id, name, code')
        .eq('code', organizationCode.toLowerCase())
        .maybeSingle();

      if (existingOrg) {
        orgId = existingOrg.id;
        assignedRole = 'employee';
        console.log(`User ${email} joining existing organization: ${existingOrg.name}`);
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
        console.log(`User ${email} created new organization: ${newOrg.name}`);
      }

      // Check if this is the owner email - always gets management role
      if (ownerEmail && email.toLowerCase() === ownerEmail.toLowerCase()) {
        assignedRole = 'management';
        console.log(`User ${email} is owner email - assigning management role`);
      }

      // Update profile with organization
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          organization_id: orgId,
          full_name: fullName || undefined,
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        return new Response(
          JSON.stringify({ success: false, error: 'Nie udało się zaktualizować profilu' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Update user role with organization
      const { data: existingRole } = await supabase
        .from('user_roles')
        .select('id, role')
        .eq('user_id', userId)
        .maybeSingle();

      if (existingRole) {
        // Update existing role with organization
        const newRole = isNewOrg ? 'management' : existingRole.role;
        await supabase
          .from('user_roles')
          .update({ 
            organization_id: orgId,
            role: assignedRole === 'management' ? 'management' : newRole 
          })
          .eq('id', existingRole.id);
        
        assignedRole = assignedRole === 'management' ? 'management' : (newRole as 'employee' | 'management');
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

      // Create subscription for new organization (org-level)
      if (isNewOrg) {
        const { data: existingSub } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('organization_id', orgId)
          .maybeSingle();

        if (!existingSub) {
          const { error: subError } = await supabase
            .from('subscriptions')
            .insert({
              user_id: userId, // Creator of org, for reference only
              organization_id: orgId,
              status: 'trial',
            });

          if (subError) {
            console.error('Error creating subscription:', subError);
          } else {
            console.log(`Created trial subscription for organization ${orgId}`);
          }
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

      console.log(`Successfully assigned user ${email} to org ${orgId} with role ${assignedRole}`);

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
