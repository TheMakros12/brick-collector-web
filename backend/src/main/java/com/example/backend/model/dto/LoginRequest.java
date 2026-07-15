package com.example.backend.model.dto;

import lombok.Data;

/**
 * DTO (Data Transfer Object) para manejar las peticiones de Login del frontend.
 */
@Data
public class LoginRequest {
    private String email;
    private String password;
}
