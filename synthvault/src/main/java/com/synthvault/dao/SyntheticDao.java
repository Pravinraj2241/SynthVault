package com.synthvault.dao;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.synthvault.db.DbConnection;
import com.synthvault.model.SyntheticDataset;

/** All SQL for the synthetic_datasets table - plain JDBC. */
@Repository
public class SyntheticDao {

    private final DbConnection db;

    public SyntheticDao(DbConnection db) {
        this.db = db;
    }

    public SyntheticDataset insert(SyntheticDataset synthetic) {
        String sql = "INSERT INTO synthetic_datasets (dataset_id, file_path, row_count, created_at) "
                   + "VALUES (?, ?, ?, ?)";
        try (PreparedStatement ps = db.get().prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, synthetic.getDatasetId());
            ps.setString(2, synthetic.getFilePath());
            ps.setInt(3, synthetic.getRowCount());
            ps.setTimestamp(4, Timestamp.valueOf(synthetic.getCreatedAt()));
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    synthetic.setId(keys.getLong(1));
                }
            }
            return synthetic;
        } catch (SQLException e) {
            throw new RuntimeException("Database error while saving synthetic dataset", e);
        }
    }

    public Optional<SyntheticDataset> findByDatasetId(Long datasetId) {
        String sql = "SELECT id, dataset_id, file_path, row_count, created_at "
                   + "FROM synthetic_datasets WHERE dataset_id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, datasetId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding synthetic dataset", e);
        }
    }

    private SyntheticDataset mapRow(ResultSet rs) throws SQLException {
        SyntheticDataset synthetic = new SyntheticDataset();
        synthetic.setId(rs.getLong("id"));
        synthetic.setDatasetId(rs.getLong("dataset_id"));
        synthetic.setFilePath(rs.getString("file_path"));
        synthetic.setRowCount(rs.getInt("row_count"));
        synthetic.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return synthetic;
    }
}
