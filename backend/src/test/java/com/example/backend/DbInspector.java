package com.example.backend;

import java.sql.Connection;
import java.sql.DatabaseMetaData;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbInspector {
    public static void main(String[] args) {
        String url = "jdbc:postgresql://ep-billowing-mouse-as4cdcpq.c-4.eu-central-1.aws.neon.tech:5432/brickcollector?sslmode=require";
        String user = "neondb_owner";
        String pass = "npg_v9YhCtHT6lsZ";

        try (Connection conn = DriverManager.getConnection(url, user, pass)) {
            DatabaseMetaData metaData = conn.getMetaData();
            System.out.println("=== TABLAS EN LA BASE DE DATOS ===");
            ResultSet tables = metaData.getTables(null, "public", "%", new String[]{"TABLE"});
            while (tables.next()) {
                String tableName = tables.getString("TABLE_NAME");
                System.out.println("\nTABLA: " + tableName);
                
                System.out.println("  Columnas:");
                ResultSet columns = metaData.getColumns(null, "public", tableName, "%");
                while (columns.next()) {
                    System.out.println("   - " + columns.getString("COLUMN_NAME") + " (" + columns.getString("TYPE_NAME") + ")");
                }
                
                System.out.println("  Foreign Keys que apuntan hacia otras tablas:");
                ResultSet fks = metaData.getImportedKeys(null, "public", tableName);
                while (fks.next()) {
                    System.out.println("   - " + fks.getString("FKCOLUMN_NAME") + " -> " + 
                            fks.getString("PKTABLE_NAME") + "(" + fks.getString("PKCOLUMN_NAME") + ")");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
