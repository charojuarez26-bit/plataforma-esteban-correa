export {
  supabase,
  isSupabaseConfigured,
  isAuthError,
  handleSessionExpired,
  refreshSessionSafely,
  withAuthRetry,
  default
} from './lib/supabaseClient';

