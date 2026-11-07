package com.synthvault.dao;

import java.sql.Connection;
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
import com.synthvault.model.Dataset;
import com.synthvault.model.DatasetColumn;
import com.synthvault.model.DatasetStatus;
import com.synthvault.model.PrivacyReport;

/**
 * All SQL for the datasets table, including ONE method that saves the dataset,
 * its column analysis and its privacy report inside a single manual JDBC
 * transaction (setAutoCommit(false) -> commit / rollback) - core Java JDBC.
 */
@Repository
public class DatasetDao {

    private final DbConnection db;
    private final ColumnDao columnDao;
    private final ReportDao reportDao;

    public DatasetDao(DbConnection db, ColumnDao columnDao, ReportDao reportDao) {
        this.db = db;
        this.columnDao = columnDao;
        this.reportDao = reportDao;
    }

    /** Atomic save: dataset + all columns + report, all-or-nothing. */
    public Dataset saveWithAnalysis(Dataset dataset, List<DatasetColumn> columns,
                                    PrivacyReport report) {
        String sql = "INSERT INTO datasets (project_id, original_name, file_name, file_path, "
                   + "row_count, column_count, status, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        Connection con = null;
        try {
            con = db.get();
            con.setAutoCommit(false);                       // begin transaction

            try (PreparedStatement ps = con.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS)) {
                ps.setLong(1, dataset.getProjectId());
                ps.setString(2, dataset.getOriginalName());
                ps.setString(3, dataset.getFileName());
                ps.setString(4, dataset.getFilePath());
                ps.setInt(5, dataset.getRowCount());
                ps.setInt(6, dataset.getColumnCount());
                ps.setString(7, dataset.getStatus().name());
                ps.setTimestamp(8, Timestamp.valueOf(dataset.getUploadedAt()));
                ps.executeUpdate();
                try (ResultSet keys = ps.getGeneratedKeys()) {
                    if (keys.next()) {
                        dataset.setId(keys.getLong(1));
                    }
                }
            }

            for (DatasetColumn col : columns) {
                col.setDatasetId(dataset.getId());
            }
            columnDao.insertAll(con, columns);

            report.setDatasetId(dataset.getId());
            reportDao.insert(con, report);

            con.commit();                                   // all good -> save
            return dataset;
        } catch (SQLException e) {
            rollbackQuietly(con);
            throw new RuntimeException("Database error while saving dataset analysis", e);
        } finally {
            closeQuietly(con);
        }
    }

    public Optional<Dataset> findById(Long id) {
        String sql = "SELECT id, project_id, original_name, file_name, file_path, "
                   + "row_count, column_count, status, uploaded_at FROM datasets WHERE id = ?";
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, id);
            try (ResultSet rs = ps.executeQuery()) {
                if (rs.next()) {
                    return Optional.of(mapRow(rs));
                }
                return Optional.empty();
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while finding dataset", e);
        }
    }

    public List<Dataset> findByProjectId(Long projectId) {
        String sql = "SELECT id, project_id, original_name, file_name, file_path, "
                   + "row_count, column_count, status, uploaded_at "
                   + "FROM datasets WHERE project_id = ? ORDER BY id";
        List<Dataset> datasets = new ArrayList<>();
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, projectId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    datasets.add(mapRow(rs));
                }
                return datasets;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while listing datasets", e);
        }
    }

    private Dataset mapRow(ResultSet rs) throws SQLException {
        Dataset dataset = new Dataset();
        dataset.setId(rs.getLong("id"));
        dataset.setProjectId(rs.getLong("project_id"));
        dataset.setOriginalName(rs.getString("original_name"));
        dataset.setFileName(rs.getString("file_name"));
        dataset.setFilePath(rs.getString("file_path"));
        dataset.setRowCount(rs.getInt("row_count"));
        dataset.setColumnCount(rs.getInt("column_count"));
        dataset.setStatus(DatasetStatus.valueOf(rs.getString("status")));
        dataset.setUploadedAt(rs.getTimestamp("uploaded_at").toLocalDateTime());
        return dataset;
    }

    private void rollbackQuietly(Connection con) {
        if (con != null) {
            try {
                con.rollback();
            } catch (SQLException ignored) {
                // nothing else we can do during rollback failure
            }
        }
    }

    private void closeQuietly(Connection con) {
        if (con != null) {
            try {
                con.setAutoCommit(true);
                con.close();
            } catch (SQLException ignored) {
                // closing is best-effort
            }
        }
    }
}
