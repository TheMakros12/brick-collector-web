package com.example.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class BackendApplication {

    public static void main(String[] args) {
        // Configurar almacén de certificados de Windows e IPv4 antes de iniciar Spring
        if (System.getProperty("os.name", "").toLowerCase().contains("win")) {
            System.setProperty("javax.net.ssl.trustStoreType", "WINDOWS-ROOT");
        }
        System.setProperty("java.net.preferIPv4Stack", "true");

        SpringApplication.run(BackendApplication.class, args);
    }
}
