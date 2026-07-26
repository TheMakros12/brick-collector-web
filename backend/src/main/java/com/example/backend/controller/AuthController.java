package com.example.backend.controller;

import com.example.backend.model.dto.LoginRequest;
import com.example.backend.model.entity.User;
import com.example.backend.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;
import java.util.Map;
import java.util.HashMap;
import com.example.backend.security.JwtUtil;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody User user) {
        try {
            User saved = authService.registerUser(user);
            return ResponseEntity.ok(saved);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Error registrando usuario: " + e.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        Optional<User> userOpt = authService.login(request.getEmail(), request.getPassword());
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            String token = jwtUtil.generateToken(user.getEmail(), user.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("user", user);
            
            return ResponseEntity.ok(response); 
        } else {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Credenciales incorrectas");
        }
    }
}
