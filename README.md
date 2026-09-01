<div align="center">

# 🧱 BrickCollector Web

**Un gestor y catálogo interactivo de colecciones de LEGO® de alto rendimiento.**

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4+-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-HTML5_/_CSS3_/_JS-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![Status](https://img.shields.io/badge/Estado-En_Desarrollo_Activo-brightgreen?style=for-the-badge)

</div>

---

## 📌 Descripción del Proyecto

**BrickCollector Web** es una aplicación web full-stack diseñada especialmente para coleccionistas y entusiastas del universo LEGO®. La plataforma permite explorar el catálogo global de sets, realizar búsquedas filtradas por categorías y temas, consultar el valor de mercado oficial e histórico de cada set, y llevar un control exhaustivo del inventario personal y la lista de deseos (*Wishlist*).

---

## ✨ Características Principales

- 🔍 **Buscador de Catálogo Global**: Conexión en tiempo real con la API v3 de **Rebrickable** para explorar más de 1.000 temas y decenas de miles de sets con sus datos e imágenes oficiales.
- 💶 **Monitorización de Precios (MSRP y Mercado)**: Extracción precisa de los precios recomendados de salida (MSRP) y valores de mercado actuales utilizando algoritmos de análisis sobre la API de **BrickEconomy**.
- 📦 **Gestión de Colección Personal**:
  - Registro de sets en colección.
  - Almacenamiento del **precio real pagado (€)**.
  - Selección de **fecha exacta de compra (Día / Mes / Año)**.
  - Clasificación por tipo de adquisición: *Comprado por mí*, *Regalo* o *Pago compartido / Segunda mano*.
- ❤️ **Lista de Deseos (Wishlist)**: Añade los sets que deseas adquirir y muévelos a tu colección en 1 solo clic al comprarlos.
- 🧱 **Catálogo de Piezas Integrado**: Visualización interactiva del inventario de piezas individuales por cada set.
- ☁️ **Persistencia en la Nube con Neon PostgreSQL**: Almacenamiento seguro de todos los registros en **Neon Cloud PostgreSQL**, garantizando la sincronización de datos desde cualquier dispositivo.

---

## 🏗️ Arquitectura del Proyecto

El repositorio sigue la estructura estándar recomendada para proyectos Full-Stack Java con Spring Boot:

```text
brick-collector-web/
├── backend/                            # Servidor Backend (Spring Boot 3.4 + Java 21)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/backend/
│   │   │   │   ├── config/             # Configuración Web, CORS y REST
│   │   │   │   ├── controller/         # Endpoints REST API (Catalog, Collection, Wishlist)
│   │   │   │   ├── model/
│   │   │   │   │   ├── dto/            # Objetos de Transferencia de Datos (DTO)
│   │   │   │   │   └── entity/         # Entidades JPA (Theme, LegoSet, Collection, Wishlist)
│   │   │   │   ├── repository/         # Repositorios Spring Data JPA
│   │   │   │   └── service/            # Lógica de Negocio y Conectores de APIs Externas
│   │   │   └── resources/
│   │   │       ├── application.properties  # Configuración de BD (Neon Cloud) y Claves API
│   │   │       └── static/             # Recursos estáticos de producción
│   │   └── test/                       # Batería de Pruebas Unitarias e Integración
│   ├── mvnw & mvnw.cmd                 # Wrappers nativos de Maven
│   └── pom.xml                         # Gestión de dependencias y plugins Maven
│
├── frontend/                           # Cliente Frontend (SPA Vanilla Web)
│   ├── css/                            # Estilos CSS3 modernos con variables de diseño
│   ├── js/                             # Módulos JS (API, UI, Storage, App principal)
│   ├── index.html                      # Vista principal de la Single Page Application
│   ├── manifest.json                   # Configuración PWA Web App
│   └── sw.js                           # Service Worker para almacenamiento en caché
│
└── .gitignore                          # Exclusión de archivos binarios, temporales y credenciales
```

---

## 🛠️ Tecnologías Utilizadas

### **Backend**
| Tecnología | Función |
| :--- | :--- |
| **Java 21** | Lenguaje principal de desarrollo |
| **Spring Boot 3.4** | Framework base para servicios REST y MVC |
| **Spring Data JPA / Hibernate** | Mapeo objeto-relacional y persistencia SQL |
| **Neon PostgreSQL** | Base de datos relacional serverless en la nube |
| **HikariCP** | Pool de conexiones a base de datos de alto rendimiento |
| **Jackson** | Procesamiento y desmapeo de datos JSON |

### **Frontend**
| Tecnología | Función |
| :--- | :--- |
| **HTML5 Semantic** | Estructura de la SPA |
| **Vanilla CSS3** | Diseño responsive moderno, animaciones y glassmorphism |
| **Vanilla JavaScript (ES6+)** | Lógica de cliente, controladores de UI y consumo de REST APIs |
| **Lucide Icons** | Conjunto de iconos vectoriales para interfaz gráfica |

---

## 🚀 Guía de Instalación y Despliegue Local

### **Requisitos Previos**
- JDK 17 o superior (Recomendado **JDK 21**).
- Maven 3.8+ (incluido mediante el ejecutable `mvnw` en el proyecto).

### **Pasos para ejecutar**

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/tu-usuario/brick-collector-web.git
   cd brick-collector-web
   ```

2. **Configurar las variables de entorno / propiedades (opcional):**
   Edita el archivo `backend/src/main/resources/application.properties` para configurar tu URL de conexión de **Neon PostgreSQL** y las claves de API:
   ```properties
   spring.datasource.url=jdbc:postgresql://<TU-HOST-NEON>:5432/brickcollector?sslmode=require
   spring.datasource.username=<TU-USUARIO>
   spring.datasource.password=<TU-PASSWORD>
   ```

3. **Compilar e Iniciar el Backend:**
   En Windows (PowerShell / CMD):
   ```cmd
   cd backend
   .\mvnw.cmd spring-boot:run
   ```

4. **Abrir la Aplicación:**
   Abre tu navegador web e ingresa a:
   ```text
   http://localhost:8080
   ```

---

## 📡 API Endpoints (Resumen)

| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/catalog/search?query={q}&themeId={id}` | Buscar sets en el catálogo |
| `GET` | `/api/catalog/themes` | Obtener listado completo de temas |
| `GET` | `/api/catalog/set/{setId}` | Obtener detalles y precio de un set |
| `GET` | `/api/collection/` | Obtener todos los sets de la Colección |
| `POST` | `/api/collection/add` | Añadir un set a la Colección |
| `PUT` | `/api/collection/update/{itemId}` | Actualizar datos de compra (Precio, Fecha, Tipo) |
| `DELETE` | `/api/collection/remove/{itemId}` | Eliminar set de la Colección |
| `GET` | `/api/collection/?type=WISHLIST` | Obtener la Lista de Deseos |
| `PUT` | `/api/collection/move/{itemId}` | Mover un set de Wishlist a Colección |

---

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia **MIT**. Consulta el archivo `LICENSE` para más detalles.

<div align="center">
  <sub>Desarrollado con ❤️ para la comunidad de coleccionistas de LEGO®.</sub>
</div>
