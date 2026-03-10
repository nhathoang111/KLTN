package com.example;

import java.sql.Connection;
import java.sql.SQLException;

/**
 * Database Manager - Handles database connectivity and connection pooling
 * Fixed: Connection timeout issue on production server
 * Date: 10/3/2026
 */
public class DatabaseManager {
    
    private static final String DB_HOST = System.getenv("DB_HOST");
    private static final String DB_PORT = System.getenv("DB_PORT");
    private static final String DB_NAME = System.getenv("DB_NAME");
    
    // Singleton pattern - ensures only one database connection pool
    private static DatabaseManager instance;
    
    private DatabaseManager() {
        // Connection pool initialization
        // Using HikariCP for better performance
    }
    
    public static synchronized DatabaseManager getInstance() {
        if (instance == null) {
            instance = new DatabaseManager();
        }
        return instance;
    }
    
    // Get database connection from pool
    public Connection getConnection() throws SQLException {
        try {
            // Retry logic: 3 attempts with 5-second interval
            int maxRetries = 3;
            for (int i = 0; i < maxRetries; i++) {
                try {
                    return createConnection();
                } catch (SQLException e) {
                    if (i == maxRetries - 1) throw e;
                    Thread.sleep(5000); // Wait before retry
                }
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new SQLException("Connection interrupted");
        }
        return null;
    }
    
    private Connection createConnection() throws SQLException {
        // Implementation: MySQL/PostgreSQL connection setup
        return null; // Placeholder
    }
    
    // Close all connections on shutdown
    public void closeAll() {
        // Clean shutdown procedure
    }
}
