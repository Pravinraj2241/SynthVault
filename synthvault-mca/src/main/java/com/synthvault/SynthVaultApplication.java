package com.synthvault;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * SynthVault - Privacy-Preserving Synthetic Data Generator.
 *
 * MCA final-year project built with ONLY:
 * Java Core, OOP, Collections, basic REST APIs (Spring Web),
 * SQL + MySQL (plain JDBC), Maven and Git.
 */
@SpringBootApplication
public class SynthVaultApplication {

    public static void main(String[] args) {
        SpringApplication.run(SynthVaultApplication.class, args);
        System.out.println("[SynthVault] API running at http://localhost:8080");
    }
}
