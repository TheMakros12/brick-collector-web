package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
@ActiveProfiles("local")
public class DbAuditTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void runAudit() throws Exception {
        StringBuilder sb = new StringBuilder();
        sb.append("=== AUDITORÍA DE BASE DE DATOS NEON ===\n\n");

        // 1 & 2 & 3. Tablas, Columnas y Tipos de Datos
        sb.append("1. Tablas, Columnas y Tipos de Datos:\n");
        List<Map<String, Object>> columns = jdbcTemplate.queryForList(
            "SELECT table_name, column_name, data_type, is_nullable " +
            "FROM information_schema.columns " +
            "WHERE table_schema = 'public' " +
            "ORDER BY table_name, ordinal_position;"
        );
        String currentTable = "";
        for (Map<String, Object> col : columns) {
            String tableName = (String) col.get("table_name");
            if (!tableName.equals(currentTable)) {
                sb.append("\nTabla: ").append(tableName).append("\n");
                currentTable = tableName;
            }
            sb.append("  - ").append(col.get("column_name"))
              .append(" (").append(col.get("data_type"))
              .append(", nullable: ").append(col.get("is_nullable")).append(")\n");
        }

        // 4 & 5 & 6. Constraints (PK, FK, UNIQUE)
        sb.append("\n\n2. Constraints (Primary Keys, Foreign Keys, Unique):\n");
        List<Map<String, Object>> constraints = jdbcTemplate.queryForList(
            "SELECT tc.table_name, tc.constraint_name, tc.constraint_type, " +
            "kcu.column_name, ccu.table_name AS foreign_table_name, ccu.column_name AS foreign_column_name " +
            "FROM information_schema.table_constraints AS tc " +
            "JOIN information_schema.key_column_usage AS kcu ON tc.constraint_name = kcu.constraint_name " +
            "LEFT JOIN information_schema.constraint_column_usage AS ccu ON ccu.constraint_name = tc.constraint_name " +
            "WHERE tc.table_schema = 'public';"
        );
        for (Map<String, Object> con : constraints) {
            sb.append(con.get("table_name")).append(" | ")
              .append(con.get("constraint_type")).append(" | ")
              .append(con.get("constraint_name")).append(" | ")
              .append("Col: ").append(con.get("column_name"));
            if (con.get("foreign_table_name") != null) {
                sb.append(" -> ").append(con.get("foreign_table_name")).append("(").append(con.get("foreign_column_name")).append(")");
            }
            sb.append("\n");
        }

        // 7. Índices
        sb.append("\n\n3. Índices:\n");
        try {
            List<Map<String, Object>> indexes = jdbcTemplate.queryForList(
                "SELECT tablename, indexname, indexdef FROM pg_indexes WHERE schemaname = 'public';"
            );
            for (Map<String, Object> idx : indexes) {
                sb.append(idx.get("tablename")).append(" | ").append(idx.get("indexname")).append(" | ").append(idx.get("indexdef")).append("\n");
            }
        } catch (Exception e) {
            sb.append("(Información de pg_indexes disponible solo en dialecto PostgreSQL)\n");
        }

        // 16-20. Conteo de registros y ejemplos
        sb.append("\n\n4. Datos Actuales:\n");
        String[] tables = {"theme", "lego_set", "collection", "wishlist", "lego_set_price_history", "price_history", "sets", "themes"};
        for (String t : tables) {
            try {
                Integer count = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM " + t, Integer.class);
                sb.append("\nTabla ").append(t).append(" - Total Registros: ").append(count).append("\n");
                
                // Extraer 5 registros de ejemplo
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + t + " LIMIT 5");
                for (Map<String, Object> row : rows) {
                    sb.append("  ").append(row.toString()).append("\n");
                }
            } catch (Exception e) {
                sb.append("\nTabla ").append(t).append(" NO existe.\n");
            }
        }

        try {
            Files.write(Paths.get("target/db_audit.txt"), sb.toString().getBytes());
        } catch (Exception ignored) {}
    }
}
