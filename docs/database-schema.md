# SynthVault Database Schema (7 Tables)

## Table: users
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `full_name` VARCHAR(100) NOT NULL
- `email` VARCHAR(150) NOT NULL UNIQUE
- `password` VARCHAR(64) NOT NULL (SHA-256 hex)
- `role` VARCHAR(10) NOT NULL DEFAULT 'USER'
- `created_at` DATETIME NOT NULL

## Table: sessions
- `token` VARCHAR(64) PRIMARY KEY
- `user_id` BIGINT NOT NULL
- `created_at` DATETIME NOT NULL
- `FK`: `user_id` → `users(id)` ON DELETE CASCADE

## Table: projects
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `name` VARCHAR(100) NOT NULL
- `description` VARCHAR(500)
- `user_id` BIGINT NOT NULL
- `created_at` DATETIME NOT NULL
- `FK`: `user_id` → `users(id)` ON DELETE CASCADE

## Table: datasets
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `project_id` BIGINT NOT NULL
- `original_name` VARCHAR(255) NOT NULL
- `file_name` VARCHAR(255) NOT NULL
- `file_path` VARCHAR(500) NOT NULL
- `row_count` INT NOT NULL
- `column_count` INT NOT NULL
- `status` VARCHAR(15) NOT NULL (UPLOADED/PROCESSED/FAILED)
- `uploaded_at` DATETIME NOT NULL
- `FK`: `project_id` → `projects(id)` ON DELETE CASCADE

## Table: dataset_columns
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `dataset_id` BIGINT NOT NULL
- `column_name` VARCHAR(150) NOT NULL
- `column_type` VARCHAR(15) NOT NULL (INTEGER/DECIMAL/BOOLEAN/DATE/STRING)
- `pii_type` VARCHAR(15) NOT NULL (NONE/EMAIL/PHONE/AADHAAR/PAN/CRIDIT_CARD)
- `distinct_count` INT
- `min_value` VARCHAR(100)
- `max_value` VARCHAR(100)
- `FK`: `dataset_id` → `datasets(id)` ON DELETE CASCADE

## Table: privacy_reports
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `dataset_id` BIGINT NOT NULL UNIQUE
- `risk_score` INT NOT NULL (0-100)
- `risk_level` VARCHAR(10) NOT NULL (LOW/MEDIUM/HIGH/CRITICAL)
- `pii_col_count` INT NOT NULL
- `details` TEXT
- `created_at` DATETIME NOT NULL
- `FK`: `dataset_id` → `datasets(id)` ON DELETE CASCADE

## Table: synthetic_datasets
- `id` BIGINT AUTO_INCREMENT PRIMARY KEY
- `dataset_id` BIGINT NOT NULL UNIQUE
- `file_path` VARCHAR(500) NOT NULL
- `row_count` INT NOT NULL
- `created_at` DATETIME NOT NULL
- `FK`: `dataset_id` → `datasets(id)` ON DELETE CASCADE