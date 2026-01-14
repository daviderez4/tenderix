// Tenderix - Authentication Module
// =================================
// Connects to Supabase Auth - NO MOCK DATA

const Auth = {
  currentUser: null,

  // ===================
  // EMAIL/PASSWORD AUTH
  // ===================

  async signIn(email, password) {
    console.log('[Auth] Signing in:', email);
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      console.error('[Auth] Sign in error:', error.message);
      Utils?.showToast?.('error', 'שגיאת התחברות', error.message);
      throw error;
    }

    console.log('[Auth] Sign in successful:', data.user.email);
    this.currentUser = data.user;
    return data;
  },

  async signUp(email, password, metadata = {}) {
    console.log('[Auth] Signing up:', email);
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: metadata.fullName || metadata.full_name || '',
          ...metadata
        }
      }
    });

    if (error) {
      console.error('[Auth] Sign up error:', error.message);
      Utils?.showToast?.('error', 'שגיאת הרשמה', error.message);
      throw error;
    }

    console.log('[Auth] Sign up successful:', data.user?.email);
    Utils?.showToast?.('success', 'נרשמת בהצלחה!', 'בדוק את האימייל לאימות');
    return data;
  },

  async signOut() {
    console.log('[Auth] Signing out');
    const supabase = getSupabase();
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('[Auth] Sign out error:', error.message);
    }

    this.currentUser = null;
    window.location.href = 'tenderix-login.html';
  },

  // ===================
  // OAUTH PROVIDERS
  // ===================

  async signInWithGoogle() {
    console.log('[Auth] Signing in with Google');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    // Use current origin for redirect (works for localhost and production)
    const redirectUrl = window.location.origin + '/tenderix-login.html';
    console.log('[Auth] Google redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        }
      }
    });

    if (error) {
      console.error('[Auth] Google sign in error:', error.message);
      Utils?.showToast?.('error', 'שגיאת התחברות', error.message);
      throw error;
    }

    return data;
  },

  async signInWithGitHub() {
    console.log('[Auth] Signing in with GitHub');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: window.location.origin + '/tenderix-dashboard.html'
      }
    });

    if (error) {
      console.error('[Auth] GitHub sign in error:', error.message);
      Utils?.showToast?.('error', 'שגיאת התחברות', error.message);
      throw error;
    }

    return data;
  },

  async signInWithMicrosoft() {
    console.log('[Auth] Signing in with Microsoft');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin + '/tenderix-dashboard.html',
        scopes: 'email profile'
      }
    });

    if (error) {
      console.error('[Auth] Microsoft sign in error:', error.message);
      Utils?.showToast?.('error', 'שגיאת התחברות', error.message);
      throw error;
    }

    return data;
  },

  // ===================
  // PASSWORD RESET
  // ===================

  async resetPassword(email) {
    console.log('[Auth] Requesting password reset for:', email);
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    // Use current origin for redirect (works for localhost and production)
    const redirectUrl = window.location.origin + '/tenderix-reset-password.html';
    console.log('[Auth] Reset password redirect URL:', redirectUrl);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });

    if (error) {
      console.error('[Auth] Password reset error:', error.message);
      Utils?.showToast?.('error', 'שגיאה', error.message);
      throw error;
    }

    Utils?.showToast?.('success', 'נשלח!', 'בדוק את האימייל לקישור איפוס');
    return data;
  },

  // ===================
  // SESSION MANAGEMENT
  // ===================

  async getCurrentUser() {
    const supabase = getSupabase();
    if (!supabase) return null;

    // First check cached user
    if (this.currentUser) return this.currentUser;

    // Get from Supabase
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.log('[Auth] No active session');
      return null;
    }

    this.currentUser = user;
    console.log('[Auth] Current user:', user?.email);
    return user;
  },

  async getSession() {
    const supabase = getSupabase();
    if (!supabase) return null;

    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async requireAuth(redirectUrl = 'tenderix-login.html') {
    console.log('[Auth] Checking authentication...');
    const user = await this.getCurrentUser();
    
    if (!user) {
      console.log('[Auth] Not authenticated, redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
      return false;
    }

    console.log('[Auth] Authenticated as:', user.email);
    return true;
  },

  async redirectIfLoggedIn(redirectUrl = 'tenderix-dashboard.html') {
    console.log('[Auth] Checking if already logged in...');
    const user = await this.getCurrentUser();
    
    if (user) {
      console.log('[Auth] Already logged in, redirecting to:', redirectUrl);
      window.location.href = redirectUrl;
      return true;
    }

    return false;
  },

  // ===================
  // AUTH STATE LISTENER
  // ===================

  onAuthStateChange(callback) {
    const supabase = getSupabase();
    if (!supabase) return;

    return supabase.auth.onAuthStateChange((event, session) => {
      console.log('[Auth] State change:', event);
      this.currentUser = session?.user || null;
      callback(event, session);
    });
  },

  // ===================
  // PROFILE MANAGEMENT
  // ===================

  async updateProfile(metadata) {
    console.log('[Auth] Updating profile:', metadata);
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.updateUser({
      data: metadata
    });

    if (error) {
      console.error('[Auth] Update profile error:', error.message);
      Utils?.showToast?.('error', 'שגיאה', error.message);
      throw error;
    }

    console.log('[Auth] Profile updated successfully');
    this.currentUser = data.user;
    Utils?.showToast?.('success', 'הצלחה', 'הפרופיל עודכן בהצלחה');
    return data;
  },

  async updatePassword(newPassword) {
    console.log('[Auth] Updating password');
    const supabase = getSupabase();
    if (!supabase) throw new Error('Supabase not initialized');

    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('[Auth] Update password error:', error.message);
      Utils?.showToast?.('error', 'שגיאה', error.message);
      throw error;
    }

    console.log('[Auth] Password updated successfully');
    Utils?.showToast?.('success', 'הצלחה', 'הסיסמה עודכנה בהצלחה');
    return data;
  },

  // ===================
  // HELPER METHODS
  // ===================

  getDisplayName() {
    const user = this.currentUser;
    if (!user) return 'משתמש';
    const meta = user.user_metadata || {};
    return meta.full_name || meta.name || user.email?.split('@')[0] || 'משתמש';
  },

  getAvatarUrl() {
    const user = this.currentUser;
    if (!user) return null;
    return user.user_metadata?.avatar_url || null;
  }
};

// Make globally available
window.Auth = Auth;

console.log('[Auth] Tenderix Auth loaded - connected to Supabase');
