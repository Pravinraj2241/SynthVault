package com.synthvault.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

/**
 * Password hashing with SHA-256 - pure core Java (java.security).
 *
 * Note for viva: production systems prefer BCrypt (salted + slow on purpose);
 * SHA-256 is used here because it is part of core Java with zero extra
 * dependencies. Adding BCrypt is listed as a future enhancement.
 */
public final class PasswordUtil {

    private PasswordUtil() {
        // utility class - no objects should be created
    }

    /** Returns the SHA-256 hash of the raw password as a 64-char hex string. */
    public static String hash(String rawPassword) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] bytes = digest.digest(rawPassword.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte b : bytes) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new RuntimeException("Password hashing failed", e);
        }
    }

    /** True when the raw password hashes to the stored hash. */
    public static boolean matches(String rawPassword, String storedHash) {
        return hash(rawPassword).equals(storedHash);
    }
}
