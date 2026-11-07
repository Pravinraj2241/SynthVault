package com.synthvault.db;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Opens plain JDBC connections using the MySQL driver.
 *
 * There is NO ORM and NO JPA in this project - every query is real SQL written
 * inside the DAO layer with PreparedStatement, which also protects against
 * SQL injection. Callers must close every connection (try-with-resources).
 */
@Component
public class DbConnection {

    @Value("${spring.datasource.url}")
    private String url;

    @Value("${spring.datasource.username}")
    private String username;

    @Value("${spring.datasource.password}")
    private String password;

    /** Returns a fresh JDBC connection from DriverManager. */
    public Connection get() throws SQLException {
        return DriverManager.getConnection(url, username, password);
    }
}
