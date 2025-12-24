import { db, TABLES, checkDatabaseConnection } from '../api/database';

export const supabase = db;
export { TABLES };
export const isSupabaseConfigured = () => true;
export const checkSupabaseConnection = checkDatabaseConnection;
