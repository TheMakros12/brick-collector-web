package com.example.backend.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.client.RestTemplate;

/**
 * Configuración para crear el cliente HTTP (RestTemplate)
 * que usaremos para llamar a Rebrickable y Brickset internamente.
 */
@Configuration
public class RestClientConfig {

    @Bean
    public RestTemplate restTemplate() {
        return new RestTemplate();
    }
}
