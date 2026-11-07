package com.synthvault.db;

import java.sql.Connection;
import java.sql.Statement;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/**
 * Runs once at startup and creates every table with "CREATE TABLE IF NOT EXISTS"
 * (plain SQL). This keeps setup zero-touch: set MySQL credentials and run -
 * no manual SQL steps are needed. The same DDL lives in database/schema.sql.
 */
@Component
public class SchemaInitializer implements CommandLineRunner {

    private final DbConnection db;

    public SchemaInitializer(DbConnection db) {
        this.db = db;
    }

    private static final String[] TABLE_SQL = {
        """
        CREATE TABLE IF NOT EXISTS users (
            id         BIGINT AUTO_INCREMENT PRIMARY KEY,
            full_name  VARCHAR(100) NOT NULL,
            email      VARCHAR(150) NOT NULL UNIQUE,
            password   VARCHAR(64)  NOT NULL,
            role       VARCHAR(10)  NOT NULL DEFAULT 'USER',
            created_at DATETIME     NOT NULL
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS sessions (
            token      VARCHAR(64) PRIMARY KEY,
            user_id    BIGINT NOT NULL,
            created_at DATETIME NOT NULL,
            CONSTRAINT fk_session_user FOREIGN KEY (user_id)
                REFERENCES users(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS projects (
            id          BIGINT AUTO_INCREMENT PRIMARY KEY,
            name        VARCHAR(100) NOT NULL,
            description VARCHAR(500),
            user_id     BIGINT NOT NULL,
            created_at  DATETIME NOT NULL,
            CONSTRAINT fk_project_user FOREIGN KEY (user_id)
                REFERENCES users(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS datasets (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            project_id    BIGINT NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            file_name     VARCHAR(255) NOT NULL,
            file_path     VARCHAR(500) NOT NULL,
            row_count     INT NOT NULL,
            column_count  INT NOT NULL,
            status        VARCHAR(15) NOT NULL,
            uploaded_at   DATETIME NOT NULL,
            CONSTRAINT fk_dataset_project FOREIGN KEY (project_id)
                REFERENCES projects(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS dataset_columns (
            id             BIGINT AUTO_INCREMENT PRIMARY KEY,
            dataset_id     BIGINT NOT NULL,
            column_name    VARCHAR(150) NOT NULL,
            column_type    VARCHAR(15) NOT NULL,
            pii_type       VARCHAR(15) NOT NULL,
            distinct_count INT,
            min_value      VARCHAR(100),
            max_value      VARCHAR(100),
            CONSTRAINT fk_column_dataset FOREIGN KEY (dataset_id)
                REFERENCES datasets(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS privacy_reports (
            id            BIGINT AUTO_INCREMENT PRIMARY KEY,
            dataset_id    BIGINT NOT NULL UNIQUE,
            risk_score    INT NOT NULL,
            risk_level    VARCHAR(10) NOT NULL,
            pii_col_count INT NOT NULL,
            details       TEXT,
            created_at    DATETIME NOT NULL,
            CONSTRAINT fk_report_dataset FOREIGN KEY (dataset_id)
                REFERENCES datasets(id) ON DELETE CASCADE
        )
        """,
        """
        CREATE TABLE IF NOT EXISTS synthetic_datasets (
            id         BIGINT AUTO_INCREMENT PRIMARY KEY,
            dataset_id BIGINT NOT NULL UNIQUE,
            file_path  VARCHAR(500) NOT NULL,
            row_count  INT NOT NULL,
            created_at DATETIME NOT NULL,
            CONSTRAINT fk_synth_dataset FOREIGN KEY (dataset_id)
                REFERENCES datasets(id) ON DELETE CASCADE
        )
        """
    };

    @Override
    public void run(String... args) throws Exception {
        try (Connection con = db.get(); Statement st = con.createStatement()) {
            for (String sql : TABLE_SQL) {
                st.execute(sql);
            }
        } catch (Exception e) {
            // Fail fast with a message a student can actually act on
            System.out.println("[SynthVault] ERROR: cannot reach MySQL - check "
                    + "spring.datasource.url / username / password in application.properties");
            throw e;
        }
        System.out.println("[SynthVault] Database ready - 7 tables verified/created.");
    }
}
