-- ============================================================================
-- SynthVault MCA - MySQL schema (reference copy).
-- NOTE: The app ALSO creates these tables automatically at startup
-- (SchemaInitializer runs CREATE TABLE IF NOT EXISTS), so running this file
-- manually is optional. It is kept for MySQL Workbench / report purposes.
-- ============================================================================

CREATE DATABASE IF NOT EXISTS synthvault_db;
USE synthvault_db;

CREATE TABLE IF NOT EXISTS users (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    full_name  VARCHAR(100) NOT NULL,
    email      VARCHAR(150) NOT NULL UNIQUE,
    password   VARCHAR(64)  NOT NULL,
    role       VARCHAR(10)  NOT NULL DEFAULT 'USER',
    created_at DATETIME     NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
    token      VARCHAR(64) PRIMARY KEY,
    user_id    BIGINT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_session_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS projects (
    id          BIGINT AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL,
    description VARCHAR(500),
    user_id     BIGINT NOT NULL,
    created_at  DATETIME NOT NULL,
    CONSTRAINT fk_project_user FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

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
);

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
);

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
);

CREATE TABLE IF NOT EXISTS synthetic_datasets (
    id         BIGINT AUTO_INCREMENT PRIMARY KEY,
    dataset_id BIGINT NOT NULL UNIQUE,
    file_path  VARCHAR(500) NOT NULL,
    row_count  INT NOT NULL,
    created_at DATETIME NOT NULL,
    CONSTRAINT fk_synth_dataset FOREIGN KEY (dataset_id)
        REFERENCES datasets(id) ON DELETE CASCADE
);
