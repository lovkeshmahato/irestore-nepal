// Supabase Edge Function: create-staff
//
// Creates a new staff auth.users account + matching profiles row in one
// call. Uses the service-role key (never exposed to the browser) so it
// must run server-side here rather than from the app directly.
//
// Only callable by an already-authenticated Super Admin — verified by
// checking the caller's own profile role before doing anything.
//
// Called from the app as:
//   supabase.functions.invoke('create-staff', { body: { email, password, fullName, role, phone } })

import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401 })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // Verify the caller is a logged-in Super Admin.
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await callerClient.auth.getUser()
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), { status: 401 })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: callerProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', userData.user.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return new Response(JSON.stringify({ error: 'Only Super Admin can create staff accounts' }), { status: 403 })
    }

    const { email, password, fullName, role, phone } = await req.json()
    if (!email || !password || !fullName || !role) {
      return new Response(JSON.stringify({ error: 'email, password, fullName, and role are required' }), { status: 400 })
    }

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Failed to create user' }), { status: 400 })
    }

    const { error: profileError } = await adminClient.from('profiles').insert({
      id: created.user.id,
      full_name: fullName,
      role,
      phone: phone || null,
    })
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id)
      return new Response(JSON.stringify({ error: profileError.message }), { status: 400 })
    }

    return new Response(JSON.stringify({ ok: true, userId: created.user.id }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : 'Unknown error' }), { status: 500 })
  }
})
