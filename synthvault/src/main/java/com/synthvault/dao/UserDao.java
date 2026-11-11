package com.synthvault.dao;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.synthvault.db.DbConnection;
import com.synthvault.model.Role;
import com.synthvault.model.User;

/** All SQL for the users table - plain JDBC (core Java + SQL skill). */
@Repository
public class UserDao {

    private final DbConnection db;

    public UserDao(DbConnection db) {
        this.db = db;
    }

    public User insert(User user) {
        String sql = "INSERT INTO users (full_name, email, password, role, created_at) "
                   + "VALUES (?, ?, ?, ?, ?)";
        try (PreparedStatement ps = db.get().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, user.getFullName());
            ps.setString(2, user.getEmail());
            ps.setString(3, user.getPassword());
            ps.setString(4, user.getRole().name());
            ps.setTimestamp(5, Timestamp.valueOf(user.getCreatedAt()));
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    user.setId(keys.getLong(1));
                }
            }
            return user;
        } catch (SQLException e) {
            throw new RuntimeException("Database error while saving user", e);
        }
    }

    public Optional<User> findByEmail(String email) {
        String sql = "SELECT id, full_name, email, password, role, created_at "
                   + "FROM users WHERE email = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setString(1, email);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding user by email", e);
        }
    }

    public Optional<User> findById(Long id) {
        String sql = "SELECT id, full_name, email, password, role, created_at "
                   + "FROM users WHERE id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding user by id", e);
        }
    }

    public List<User> findAll() {
        String sql = "SELECT id, full_name, email, password, role, created_at "
                   + "FROM users ORDER BY id";
        List<User> users = new ArrayList<>();
        try (PreparedStatement ps = db.get().prepareStatement(sql);
             ResultSet rs = ps.executeQuery()) {
            while (rs.next()) {
                users.add(mapRow(rs));
            }
            return users;
        } catch (SQLException e) {
            throw new RuntimeException("Database error while listing users", e);
        }
    }

    private User mapRow(ResultSet rs) throws SQLException {
        User user = new User();
        user.setId(rs.getLong("id"));
        user.setFullName(rs.getString("full_name"));
        user.setEmail(rs.getString("email"));
        user.setPassword(rs.getString("password"));
        user.setRole(Role.valueOf(rs.getString("role")));
        user.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return user;
    }
}
