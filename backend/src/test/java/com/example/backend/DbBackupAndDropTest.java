package com.example.backend;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

@SpringBootTest
public class DbBackupAndDropTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Test
    public void runBackupAndDrop() throws Exception {
        System.out.println("=== INICIANDO BACKUP Y LIMPIEZA DE NEON ===");

        // 1. Backup
        String[] tablesToBackup = {"lego_set", "theme", "lego_set_price_history"};
        for (String t : tablesToBackup) {
            try {
                List<Map<String, Object>> rows = jdbcTemplate.queryForList("SELECT * FROM " + t);
                StringBuilder json = new StringBuilder("[\n");
                for (int i = 0; i < rows.size(); i++) {
                    json.append("  ").append(rows.get(i).toString().replace("=", "\":\"").replace("{", "{\"").replace(", ", "\", \"").replace("}", "\"}"));
                    if (i < rows.size() - 1) json.append(",");
                    json.append("\n");
                }
                json.append("]");
                Files.write(Paths.get("C:\\Users\\marco\\.gemini\\antigravity-ide\\brain\\d9d937de-0f45-4477-9583-fccea85abe5a\\scratch\\backup_" + t + ".json"), json.toString().getBytes());
                System.out.println("Backup de " + t + " completado (" + rows.size() + " registros).");
            } catch (Exception e) {
                System.out.println("No se pudo hacer backup de " + t + " (puede no existir).");
            }
        }

        // 2. Drop Cascade
        String[] tablesToDrop = {
            "collection", "price_history", "wishlist", "lego_set_price_history", 
            "lego_set", "theme", "sets", "themes"
        };
        
        for (String t : tablesToDrop) {
            try {
                jdbcTemplate.execute("DROP TABLE IF EXISTS " + t + " CASCADE");
                System.out.println("Tabla " + t + " eliminada (CASCADE).");
            } catch (Exception e) {
                System.out.println("Error al eliminar " + t + ": " + e.getMessage());
            }
        }
        
        System.out.println("=== LIMPIEZA DE NEON COMPLETADA ===");
    }
}
