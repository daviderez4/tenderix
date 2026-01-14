// Tenderix - API Module
// ======================
// Connects to Supabase - NO MOCK DATA

const API = {
  // TENDER (singular - used by dashboard.js)
  Tender: {
    async getAll(options = {}) {
      console.log('[API] Fetching tenders from Supabase...', options);
      const supabase = getSupabase();
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      let query = supabase.from('tenders').select('*').order('created_at', { ascending: false });
      if (options.status) query = query.eq('status', options.status);
      if (options.search) query = query.ilike('tender_name', '%' + options.search + '%');
      if (options.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) { console.error('[API] Error:', error.message); return { data: [], error: error.message }; }

      // Map to expected format
      const mapped = (data || []).map(t => ({
        ...t,
        name: t.tender_name,
        deadline: t.submission_deadline,
        organization: t.issuing_body
      }));

      console.log('[API] Fetched ' + mapped.length + ' tenders');
      return { data: mapped, error: null };
    },

    async getById(id) {
      const supabase = getSupabase();
      if (!supabase) return null;
      const { data, error } = await supabase.from('tenders').select('*, organizations(name)').eq('id', id).single();
      return error ? null : data;
    },

    async getUpcomingDeadlines(days = 14) {
      console.log('[API] Fetching upcoming deadlines');
      const supabase = getSupabase();
      if (!supabase) return [];
      const now = new Date();
      const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      const { data, error } = await supabase.from('tenders')
        .select('id, tender_name, submission_deadline, status')
        .gte('submission_deadline', now.toISOString())
        .lte('submission_deadline', future.toISOString())
        .order('submission_deadline', { ascending: true }).limit(10);
      const mapped = (data || []).map(t => ({ ...t, name: t.tender_name, deadline: t.submission_deadline }));
      return error ? [] : mapped;
    },

    async getGateConditions(id) {
      const supabase = getSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase.from('gate_conditions').select('*').eq('tender_id', id).order('condition_number', { ascending: true });
      return error ? [] : (data || []);
    },

    subscribeToChanges(callback) {
      const supabase = getSupabase();
      if (!supabase) return null;
      return supabase.channel('tenders-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'tenders' }, callback).subscribe();
    },

    unsubscribe(sub) { if (sub) sub.unsubscribe(); }
  },

  // TENDERS (plural - backward compat)
  Tenders: {
    async getAll(opts) { const r = await API.Tender.getAll(opts); return r.data || []; },
    async getById(id) { return API.Tender.getById(id); },
    async getGateConditions(id) { return API.Tender.getGateConditions(id); }
  },

  Competitors: {
    async getAll() {
      const supabase = getSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase.from('competitors').select('*').order('name', { ascending: true });
      return error ? [] : (data || []);
    }
  },

  Analytics: {
    async getDashboardStats() {
      console.log('[API] Fetching dashboard stats from Supabase...');
      const supabase = getSupabase();
      const empty = { total: 0, activeTenders: 0, analyzing: 0, go: 0, upcoming: 0, pendingDecisions: 0, totalValue: 0, winRate: 0, urgentDeadlines: 0 };
      if (!supabase) return empty;

      const { data: tenders, error } = await supabase.from('tenders').select('id, status, submission_deadline, estimated_value');
      if (error || !tenders || tenders.length === 0) {
        console.log('[API] No tenders found or error');
        return empty;
      }

      const now = new Date();
      const week = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const urgent = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

      const stats = {
        total: tenders.length,
        activeTenders: tenders.filter(t => ['ACTIVE','active','analyzing','GATES_EXTRACTED'].includes(t.status)).length,
        analyzing: tenders.filter(t => ['GATES_EXTRACTED','analyzing'].includes(t.status)).length,
        go: tenders.filter(t => ['GO','go'].includes(t.status)).length,
        pendingDecisions: tenders.filter(t => ['pending_decision','PENDING','ready_for_decision'].includes(t.status)).length,
        upcoming: tenders.filter(t => t.submission_deadline && new Date(t.submission_deadline) >= now && new Date(t.submission_deadline) <= week).length,
        urgentDeadlines: tenders.filter(t => t.submission_deadline && new Date(t.submission_deadline) >= now && new Date(t.submission_deadline) <= urgent).length,
        totalValue: tenders.reduce((s, t) => s + (t.estimated_value || 0), 0),
        winRate: 0
      };

      const won = tenders.filter(t => ['won','WON'].includes(t.status)).length;
      const lost = tenders.filter(t => ['lost','LOST'].includes(t.status)).length;
      if (won + lost > 0) stats.winRate = Math.round((won / (won + lost)) * 100);

      console.log('[API] Dashboard stats:', stats);
      return stats;
    }
  },

  Activity: {
    async getRecent(limit = 10) {
      const supabase = getSupabase();
      if (!supabase) return [];
      const { data, error } = await supabase.from('activity_log').select('*').order('created_at', { ascending: false }).limit(limit);
      return error ? [] : (data || []);
    }
  },

  Workflows: {
    async trigger(path, payload) {
      try {
        const base = (typeof CONFIG !== 'undefined' && CONFIG.N8N_BASE_URL) || 'https://daviderez.app.n8n.cloud/webhook';
        const res = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!res.ok) throw new Error('Failed');
        return await res.json();
      } catch (e) { console.error('[API] Workflow error:', e); return null; }
    }
  },

  // NOTIFICATIONS
  Notifications: {
    async getAll(options = {}) {
      console.log('[API] Fetching notifications...');
      const supabase = getSupabase();
      if (!supabase) return { data: [], error: 'Supabase not initialized' };

      const user = await supabase.auth.getUser();
      if (!user?.data?.user) return { data: [], error: 'Not authenticated' };

      let query = supabase.from('notifications')
        .select('*')
        .eq('user_id', user.data.user.id)
        .order('created_at', { ascending: false });

      if (options.unread_only) query = query.eq('is_read', false);
      if (options.limit) query = query.limit(options.limit);
      if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 20) - 1);

      const { data, error } = await query;
      if (error) { console.error('[API] Notifications error:', error.message); return { data: [], error: error.message }; }
      console.log('[API] Fetched ' + (data?.length || 0) + ' notifications');
      return { data: data || [], error: null };
    },

    async markAsRead(id) {
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase not initialized' };

      const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
      return { error: error?.message || null };
    },

    async markAllAsRead() {
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase not initialized' };

      const user = await supabase.auth.getUser();
      if (!user?.data?.user) return { error: 'Not authenticated' };

      const { error } = await supabase.from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.data.user.id)
        .eq('is_read', false);
      return { error: error?.message || null };
    },

    async getUnreadCount() {
      const supabase = getSupabase();
      if (!supabase) return 0;

      const user = await supabase.auth.getUser();
      if (!user?.data?.user) return 0;

      const { count, error } = await supabase.from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.data.user.id)
        .eq('is_read', false);

      return error ? 0 : (count || 0);
    },

    subscribeToChanges(callback) {
      const supabase = getSupabase();
      if (!supabase) return null;
      return supabase.channel('notifications-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, callback)
        .subscribe();
    }
  },

  // USER SETTINGS
  UserSettings: {
    async get() {
      console.log('[API] Fetching user settings...');
      const supabase = getSupabase();
      if (!supabase) return null;

      const user = await supabase.auth.getUser();
      if (!user?.data?.user) return null;

      const { data, error } = await supabase.from('user_settings')
        .select('*')
        .eq('user_id', user.data.user.id)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = not found
        console.error('[API] Settings error:', error.message);
        return null;
      }

      return data || this.getDefaults();
    },

    async update(settings) {
      console.log('[API] Updating user settings...');
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase not initialized' };

      const user = await supabase.auth.getUser();
      if (!user?.data?.user) return { error: 'Not authenticated' };

      const { data, error } = await supabase.from('user_settings')
        .upsert({
          user_id: user.data.user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        .select()
        .single();

      if (error) { console.error('[API] Settings update error:', error.message); return { error: error.message }; }
      return { data, error: null };
    },

    getDefaults() {
      return {
        email_notifications: true,
        push_notifications: true,
        deadline_reminders: true,
        new_tender_alerts: true,
        competitor_alerts: true,
        weekly_summary: true,
        language: 'he',
        theme: 'dark',
        currency: 'ILS'
      };
    }
  },

  // USER PROFILE (extended)
  Profile: {
    async get() {
      const supabase = getSupabase();
      if (!supabase) return null;

      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) return null;

      // Also try to get extended profile from profiles table
      const { data: profile } = await supabase.from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        ...user,
        profile: profile || {}
      };
    },

    async update(profileData) {
      const supabase = getSupabase();
      if (!supabase) return { error: 'Supabase not initialized' };

      // Update auth metadata
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        data: profileData
      });

      if (authError) return { error: authError.message };

      // Also update profiles table if it exists
      const { error: profileError } = await supabase.from('profiles')
        .upsert({
          id: authData.user.id,
          full_name: profileData.full_name,
          company_name: profileData.company_name,
          phone: profileData.phone,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (profileError) console.warn('[API] Profile table update warning:', profileError.message);

      return { data: authData.user, error: null };
    }
  }
};

window.API = API;
console.log('[API] Tenderix API loaded - connected to Supabase');
