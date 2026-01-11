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

      let query = supabase.from('tenders').select('*, organizations(name)').order('created_at', { ascending: false });
      if (options.status) query = query.eq('status', options.status);
      if (options.search) query = query.ilike('name', '%' + options.search + '%');
      if (options.limit) query = query.limit(options.limit);

      const { data, error } = await query;
      if (error) { console.error('[API] Error:', error.message); return { data: [], error: error.message }; }
      console.log('[API] Fetched ' + (data ? data.length : 0) + ' tenders');
      return { data: data || [], error: null };
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
        .select('id, name, deadline, ai_score, status')
        .gte('deadline', now.toISOString())
        .lte('deadline', future.toISOString())
        .order('deadline', { ascending: true }).limit(10);
      return error ? [] : (data || []);
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

      const { data: tenders, error } = await supabase.from('tenders').select('id, status, deadline, estimated_value');
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
        upcoming: tenders.filter(t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= week).length,
        urgentDeadlines: tenders.filter(t => t.deadline && new Date(t.deadline) >= now && new Date(t.deadline) <= urgent).length,
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
  }
};

window.API = API;
console.log('[API] Tenderix API loaded - connected to Supabase');
