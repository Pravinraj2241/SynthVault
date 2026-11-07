package com.synthvault.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.util.Optional;

import org.springframework.stereotype.Repository;

import com.synthvault.db.DbConnection;
import com.synthvault.model.PrivacyReport;
import com.synthvault.model.RiskLevel;

/** All SQL for the privacy_reports table - plain JDBC. */
@Repository
public class ReportDao {

    private final DbConnection db;

    public ReportDao(DbConnection db) {
        this.db = db;
    }

    /** Insert that reuses the caller's connection (runs inside a transaction). */
    public void insert(Connection con, PrivacyReport report) throws SQLException {
        String sql = "INSERT INTO privacy_reports (dataset_id, risk_score, risk_level, "
                   + "pii_col_count, details, created_at) VALUES (?, ?, ?, ?, ?, ?)";
        try (PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
            ps.setLong(1, report.getDatasetId());
            ps.setInt(2, report.getRiskScore());
            ps.setString(3, report.getRiskLevel().name());
            ps.setInt(4, report.getPiiColumnCount());
            ps.setString(5, report.getDetails());
            ps.setTimestamp(6, Timestamp.valueOf(report.getCreatedAt()));
            ps.executeUpdate();
            try (ResultSet keys = ps.getGeneratedKeys()) {
                if (keys.next()) {
                    report.setId(keys.getLong(1));
                }
            }
        }
    }

    public Optional<PrivacyReport> findByDatasetId(Long datasetId) {
        String sql = "SELECT id, dataset_id, risk_score, risk_level, pii_col_count, details, created_at "
                   + "FROM privacy_reports WHERE dataset_id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, datasetId);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding privacy report", e);
        }
    }

    private PrivacyReport mapRow(ResultSet rs) throws SQLException {
        PrivacyReport report = new PrivacyReport();
        report.setId(rs.getLong("id"));
        report.setDatasetId(rs.getLong("dataset_id"));
        report.setRiskScore(rs.getInt("risk_score"));
        report.setRiskLevel(RiskLevel.valueOf(rs.getString("risk_level")));
        report.setPiiColumnCount(rs.getInt("pii_col_count"));
        report.setDetails(rs.getString("details"));
        report.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return report;
    }
}
