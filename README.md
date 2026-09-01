<div align="center">

# 🧱 BrickCollector Web

**El gestor y catálogo interactivo definitivo para coleccionistas de LEGO® | Full-Stack de Alto Rendimiento**

![Java](https://img.shields.io/badge/Java-21-orange?style=for-the-badge&logo=java)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.4+-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Cloud-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Frontend](https://img.shields.io/badge/Frontend-HTML5_CSS3_JS-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![Status](https://img.shields.io/badge/Estado-En_Desarrollo_Activo-brightgreen?style=for-the-badge)
![License](https://img.shields.io/badge/Licencia-MIT-lightgrey?style=for-the-badge)

[🚀 Inicio Rápido](#-instrucciones-de-montaje) • [📖 API Docs](#-api-endpoints-resumen) • [🐛 Reportar Issue](#) • [⭐ Dale una Estrella](#)

</div>

<p align="center">
  <img src="https://upload.wikimedia.org/wikipedia/commons/2/25/Lego_dimensions_pattern.png" alt="LEGO bricks pattern" width="100%" height="6"/>
</p>

## 📋 Tabla de Contenidos

- [Acerca del Proyecto](#-acerca-del-proyecto)
- [Características Principales](#-características-principales)
- [Casos de Uso](#-casos-de-uso)
- [Arquitectura del Proyecto](#️-arquitectura-del-proyecto)
- [Stack Tecnológico](#️-stack-tecnológico)
- [Instrucciones de Montaje](#-instrucciones-de-montaje)
- [API Endpoints](#-api-endpoints-resumen)
- [Rendimiento y Seguridad](#-rendimiento-y-escalabilidad)
- [Roadmap](#-próximas-características-roadmap)
- [Licencia](#-licencia)

---

## 📌 Acerca del Proyecto

**BrickCollector Web** es una plataforma full-stack revolucionaria diseñada para llevar tu pasión por LEGO® al siguiente nivel. Desde coleccionistas casuales hasta entusiastas hardcore, esta aplicación te proporciona todas las herramientas necesarias para explorar, gestionar y analizar tu colección LEGO® con precisión y estilo.

Con conexión en tiempo real a la base de datos más completa de sets LEGO® (Rebrickable), análisis inteligente de precios y una interfaz moderna e intuitiva, **BrickCollector Web** transforma completamente la forma en que experimentas tu colección.

> *"Cada set tiene una historia. Este proyecto se asegura de que nunca olvides la tuya."*

---

## ✨ Características Principales

### 🔍 **Catálogo Global de Sets en Tiempo Real**
Explora más de **1.000 temas y decenas de miles de sets** con acceso directo a la **API v3 de Rebrickable**. Búsqueda avanzada, filtros inteligentes y datos oficiales de LEGO® con imágenes de alta calidad.

### 💶 **Análisis Inteligente de Precios**
- **Precio MSRP Oficial**: Valor recomendado de salida de LEGO®
- **Tendencias de Mercado**: Análisis en tiempo real de valores secundarios
- **Historial de Precios**: Visualiza cómo ha evolucionado el valor de tus sets
- **Estimaciones de Valor**: Calcula el valor total de tu colección al instante

### 📦 **Gestión Avanzada de Colección**
Controla cada aspecto de tu colección con precisión:
- ✅ Registro detallado de cada set adquirido
- 💰 Almacenamiento del precio exacto pagado (€)
- 📅 Fecha precisa de compra (Día / Mes / Año)
- 🏷️ Clasificación por tipo: *Comprado por mí*, *Regalo*, *Segunda mano* o *Pago compartido*
- 📊 Estadísticas y reportes personalizados

### ❤️ **Lista de Deseos Inteligente (Wishlist)**
- Crea tu lista de sets deseados con un solo clic
- Seguimiento automático de precios para tus sets favoritos
- Mueve sets de wishlist a colección de manera instantánea
- Priorización y categorización de deseos

### 🧱 **Catálogo de Piezas Integrado**
Visualiza interactivamente el inventario completo de piezas individuales por cada set:
- Detalles de cada componente
- Códigos de color y referencias
- Búsqueda de piezas compartidas entre sets

### ☁️ **Sincronización en la Nube**
Almacenamiento seguro y confiable en **Neon PostgreSQL**:
- Accede a tu colección desde cualquier dispositivo
- Sincronización automática en tiempo real
- Respaldos garantizados con encriptación de datos
- Cero preocupaciones sobre la pérdida de información

### 🎨 **Interfaz Moderna y Responsive**
- Diseño glassmorphism con animaciones fluidas
- Totalmente responsive en móvil, tablet y escritorio
- Tema oscuro/claro adaptativo
- Experiencia PWA para instalación en dispositivos

---

## 💎 Casos de Uso

### **Para Coleccionistas Serios**
- Inventario completo y detallado de tu colección
- Análisis de valor total e inversión (ROI)
- Seguimiento de rarezas y sets descontinuados
- Reportes exportables para seguros o auditorías

### **Para Cazadores de Deals**
- Alertas inteligentes de cambios de precio
- Identificación de sets infravaluados
- Historial de valores para negociación
- Comparativa de precios en tiempo real

### **Para Iniciadores**
- Descubrimiento fácil de sets por tema
- Información clara de dificultad y edad recomendada
- Wishlist para planificar futuras compras
- Inspiración visual desde el catálogo global

---

## 🏗️ Arquitectura del Proyecto

Como toda buena construcción, el repositorio sigue una estructura modular por capas:

```text
brick-collector-web/
├── backend/                            # Servidor Backend (Spring Boot 3.4 + Java 21)
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/example/backend/
│   │   │   │   ├── config/             # Configuración Web, CORS y REST
│   │   │   │   ├── controller/         # Endpoints REST API
│   │   │   │   ├── model/
│   │   │   │   │   ├── dto/            # Objetos de Transferencia de Datos
│   │   │   │   │   └── entity/         # Entidades JPA
│   │   │   │   ├── repository/         # Repositorios Spring Data JPA
│   │   │   │   ├── service/            # Lógica de Negocio
│   │   │   │   └── exception/          # Manejo centralizado de errores
│   │   │   └── resources/
│   │   │       ├── application.properties
│   │   │       └── static/
│   │   └── test/                       # Suite de pruebas
│   ├── mvnw & mvnw.cmd                 # Maven Wrapper
│   └── pom.xml                         # Gestión de dependencias
│
├── frontend/                           # Cliente Frontend (SPA Vanilla Web)
│   ├── css/                            # Estilos CSS3
│   ├── js/                             # Módulos modularizados
│   ├── index.html                      # SPA optimizada
│   ├── manifest.json                   # Configuración PWA
│   └── sw.js                           # Service Worker
│
└── .gitignore
```

---

## 🛠️ Stack Tecnológico

### **Backend** 🔧
| Tecnología | Función |
| :--- | :--- |
| **Java 21** | Lenguaje de producción con características modernas |
| **Spring Boot 3.4** | Framework robusto para servicios REST escalables |
| **Spring Data JPA / Hibernate** | ORM de clase mundial para persistencia segura |
| **Neon PostgreSQL** | Base de datos relacional serverless |
| **HikariCP** | Pool de conexiones de alto rendimiento |
| **Jackson** | Serialización/deserialización JSON optimizada |

### **Frontend** 🎨
| Tecnología | Función |
| :--- | :--- |
| **HTML5 Semantic** | Estructura semántica moderna y accesible |
| **Vanilla CSS3** | Diseño responsive, animaciones suaves, glassmorphism |
| **Vanilla JavaScript (ES6+)** | Lógica de cliente sin dependencias innecesarias |
| **Lucide Icons** | Conjunto de iconos vectoriales de alto rendimiento |

---

## 🚀 Instrucciones de Montaje

### 🧾 Requisitos Previos
- **JDK 17 o superior** (recomendado **JDK 21**)
- **Maven 3.8+** (incluido mediante `mvnw` en el proyecto)
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

### 🔩 Pasos para Ejecutar

#### 1️⃣ Clonar el Repositorio
```bash
git clone https://github.com/TheMakros12/brick-collector-web.git
cd brick-collector-web
```

#### 2️⃣ Configurar Base de Datos
Edita `backend/src/main/resources/application.properties`:

```properties
# Neon PostgreSQL
spring.datasource.url=jdbc:postgresql://<TU-HOST-NEON>:5432/brickcollector?sslmode=require
spring.datasource.username=<TU-USUARIO>
spring.datasource.password=<TU-PASSWORD>

# APIs Externas
rebrickable.api.key=<TU-CLAVE-REBRICKABLE>
```

#### 3️⃣ Ejecutar el Backend
```bash
cd backend

# Windows (PowerShell / CMD)
.\mvnw.cmd spring-boot:run

# macOS / Linux
./mvnw spring-boot:run
```

#### 4️⃣ Acceder a la Aplicación
```
http://localhost:8080
```

---

## 📡 API Endpoints (Resumen)

### **Catálogo (Catalog)**
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/catalog/search?query={q}&themeId={id}` | Buscar sets en el catálogo |
| `GET` | `/api/catalog/themes` | Obtener listado completo de temas |
| `GET` | `/api/catalog/set/{setId}` | Obtener detalles y precio de un set |
| `GET` | `/api/catalog/set/{setId}/pieces` | Inventario de piezas de un set |

### **Colección Personal**
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/collection/` | Obtener todos los sets de la Colección |
| `POST` | `/api/collection/add` | Añadir un set a la Colección |
| `PUT` | `/api/collection/update/{itemId}` | Actualizar datos de compra |
| `DELETE` | `/api/collection/remove/{itemId}` | Eliminar set de la Colección |
| `GET` | `/api/collection/stats` | Estadísticas de tu colección |

### **Lista de Deseos**
| Método | Endpoint | Descripción |
| :--- | :--- | :--- |
| `GET` | `/api/collection/?type=WISHLIST` | Obtener la Lista de Deseos |
| `POST` | `/api/wishlist/add/{setId}` | Añadir set a wishlist |
| `DELETE` | `/api/wishlist/remove/{setId}` | Eliminar de wishlist |
| `PUT` | `/api/collection/move/{itemId}` | Mover de wishlist a colección |

---

## 📈 Rendimiento y Escalabilidad

- ⚡ **Respuesta API < 200ms** en operaciones comunes
- 🔄 **Sincronización en tiempo real** con arquitectura preparada para WebSocket
- 💾 **Caché inteligente** en cliente y servidor
- 🌐 **CDN-ready** para distribución global
- 📱 **Optimizado para conexiones 4G** con modo offline-ready

---

## 🔒 Seguridad

- ✅ Validación de entrada en cliente y servidor
- ✅ Encriptación SSL/TLS en tránsito
- ✅ Protección contra inyección SQL con JPA parametrizado
- ✅ CORS configurado para seguridad multi-origen
- ✅ Almacenamiento seguro de credenciales en variables de entorno

---

## 🧱 Próximas Características (Roadmap)

- [ ] App móvil complementaria (Android / Kotlin) sincronizada
- [ ] Dashboard con estadísticas visuales avanzadas
- [ ] Modo "vitrina pública" para compartir colecciones
- [ ] Notificaciones inteligentes de cambios de precio
- [ ] Exportación de reportes (PDF, Excel)
- [ ] Integración con redes sociales de coleccionistas

---

## 📄 Licencia

Este proyecto está licenciado bajo la **Licencia MIT**. Eres libre de usar, modificar y distribuir este software en tus propios proyectos.

Consulta el archivo [`LICENSE`](./LICENSE) para más detalles legales.

---

## 🤝 Soporte y Contacto

¿Problemas o preguntas?

- 📬 **Abre un Issue** en GitHub para reportar bugs o solicitudes
- 📧 **Contacta directamente** para consultas específicas
- 💬 **Revisa la Documentación** en la wiki del proyecto

---

<div align="center">

### Hecho con ❤️ para la Comunidad de Coleccionistas de LEGO®

**Mantén tu colección organizada. Sigue tus inversiones. Disfruta del hobby.**

LEGO® es una marca registrada de The LEGO Group, que no patrocina ni avala este proyecto.

[⬆ Volver al inicio](#-brickcollector-web)

</div>