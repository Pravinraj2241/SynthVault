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
import com.synthvault.model.Project;

/** All SQL for the projects table - plain JDBC. */
@Repository
public class ProjectDao {

    private final DbConnection db;

    public ProjectDao(DbConnection db) {
        this.db = db;
    }

    public Project insert(Project project) {
        String sql = "INSERT INTO projects (name, description, user_id, created_at) "
                   + "VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = db.get().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setString(1, project.getName());
            ps.setString(2, project.getDescription());
            ps.setLong(3, project.getUserId());
            ps.setTimestamp(4, Timestamp.valueOf(project.getCreatedAt()));
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    project.setId(keys.getLong(1));
                }
            }
            return project;
        } catch (SQLException e) {
            throw new RuntimeException("Database error while saving project", e);
        }
    }

    public Optional<Project> findById(Long id) {
        String sql = "SELECT id, name, description, user_id, created_at "
                   + "FROM projects WHERE id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding project", e);
        }
    }

    public List<Project> findByUserId(Long userId) {
        String sql = "SELECT id, name, description, user_id, created_at "
                   + "FROM projects WHERE user_id = ? ORDER BY id";
        List<Project> projects = new ArrayList<>();
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, userId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    projects.add(mapRow(rs));
                }
                return projects;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while listing projects", e);
        }
    }

    public void update(Project project) {
        String sql = "UPDATE projects SET name = ?, description = ? WHERE id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setString(1, project.getName());
            ps.setString(2, project.getDescription());
            ps.setLong(3, project.getId());
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Database error while updating project", e);
        }
    }

    public void deleteById(Long id) {
        String sql = "DELETE FROM projects WHERE id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, id);
            ps.executeUpdate();
        } catch (SQLException e) {
            throw new RuntimeException("Database error while deleting project", e);
        }
    }

    private Project mapRow(ResultSet rs) throws SQLException {
        Project project = new Project();
        project.setId(rs.getLong("id"));
        project.setName(rs.getString("name"));
        project.setDescription(rs.getString("description"));
        project.setUserId(rs.getLong("user_id"));
        project.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return project;
    }
}
