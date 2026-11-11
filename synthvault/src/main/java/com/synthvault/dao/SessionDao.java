package com.synthvault.dao;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.synthvault.db.DbConnection;
import java.time.LocalDateTime;

/**
 * Login sessions: a random UUID token is stored in MySQL at login and deleted
 * at logout. Every protected API sends this token in the "X-Auth-Token" header.
 * This replaces JWT/Spring Security with plain core Java + SQL.
 */
@Repository
public class SessionDao {

    private final DbConnection db;

    public SessionDao(DbConnection db) {
        this.db = db;
    }

    public void insert(String token, Long userId) {
        String sql = "INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setString(1, token);
            ps.setLong(2, userId);
            ps.setTimestamp(3, Timestamp.valueOf(LocalDateTime.now()));
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Database error while saving session", e);
        }
    }

    /** Returns the user id that owns this token (empty if unknown/expired). */
    public Optional<Long> findUserIdByToken(String token) {
        String sql = "SELECT user_id FROM sessions WHERE token = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setString(1, token);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(rs.getLong("user_id"));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while checking session", e);
        }
    }

    /** Deletes the session row - returns true when a row was actually deleted. */
    public boolean deleteByToken(String token) {
        String sql = "DELETE FROM sessions WHERE token = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setString(1, token);
            return ps.executeUpdate() > 0;
        } catch (SQLException e) {
            throw new RuntimeException("Database error while deleting session", e);
        }
    }
}
