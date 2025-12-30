import { db, TABLES, checkDatabaseConnection } from '../api/database';

export const database = db;
export { TABLES };
export const isDatabaseConfigured = () => false;
export const checkConnection = checkDatabaseConnection;
