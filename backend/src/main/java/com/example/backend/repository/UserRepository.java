package com.example.backend.repository;

import com.example.backend.model.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

/**
 * Repositorio para gestionar las operaciones de base de datos de los Usuarios.
 */
public interface UserRepository extends JpaRepository<User, Long> {
    
    // Método para buscar usuario por email (usado en el Login)
    Optional<User> findByEmail(String email);
}
