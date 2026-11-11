package com.synthvault.dao;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Types;
import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Repository;

import com.synthvault.db.DbConnection;
import com.synthvault.model.ColumnType;
import com.synthvault.model.DatasetColumn;
import com.synthvault.model.PiiType;

/** All SQL for the dataset_columns table - plain JDBC with batch insert. */
@Repository
public class ColumnDao {

    private final DbConnection db;

    public ColumnDao(DbConnection db) {
        this.db = db;
    }

    /** Batch insert that reuses the caller's connection (runs inside a transaction). */
    public void insertAll(Connection con, List<DatasetColumn> columns) throws SQLException {
        String sql = "INSERT INTO dataset_columns (dataset_id, column_name, column_type, "
                   + "pii_type, distinct_count, min_value, max_value) VALUES (?, ?, ?, ?, ?, ?, ?)";
        try (PreparedStatement ps = con.prepareStatement(sql)) {
            for (DatasetColumn col : columns) {
                ps.setLong(1, col.getDatasetId());
                ps.setString(2, col.getColumnName());
                ps.setString(3, col.getColumnType().name());
                ps.setString(4, col.getPiiType().name());
                if (col.getDistinctCount() == null) {
                    ps.setNull(5, Types.INTEGER);
                } else {
                    ps.setInt(5, col.getDistinctCount());
                }
                ps.setString(6, col.getMinValue());
                ps.setString(7, col.getMaxValue());
                ps.addBatch();
            }
            ps.executeBatch();
        }
    }

    public List<DatasetColumn> findByDatasetId(Long datasetId) {
        String sql = "SELECT id, dataset_id, column_name, column_type, pii_type, "
                   + "distinct_count, min_value, max_value "
                   + "FROM dataset_columns WHERE dataset_id = ? ORDER BY id";
        List<DatasetColumn> columns = new ArrayList<>();
        try (PreparedStatement ps = db.get().prepareStatement(sql)) {
            ps.setLong(1, datasetId);
            try (ResultSet rs = ps.executeQuery()) {
                while (rs.next()) {
                    columns.add(mapRow(rs));
                }
                return columns;
            }
        } catch (SQLException e) {
            throw new RuntimeException("Database error while listing dataset columns", e);
        }
    }

    private DatasetColumn mapRow(ResultSet rs) throws SQLException {
        DatasetColumn col = new DatasetColumn();
        col.setId(rs.getLong("id"));
        col.setDatasetId(rs.getLong("dataset_id"));
        col.setColumnName(rs.getString("column_name"));
        col.setColumnType(ColumnType.valueOf(rs.getString("column_type")));
        col.setPiiType(PiiType.valueOf(rs.getString("pii_type")));
        int distinct = rs.getInt("distinct_count");
        col.setDistinctCount(rs.wasNull() ? null : distinct);
        col.setMinValue(rs.getString("min_value"));
        col.setMaxValue(rs.getString("max_value"));
        return col;
    }
}
