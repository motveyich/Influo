import { db, TABLES, checkDatabaseConnection } from '../api/database';

export const database = db;
export { TABLES };
export const isDatabaseConfigured = () => true;
export const checkConnection = checkDatabaseConnection;
