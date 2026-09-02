package com.example.backend.config;

import com.example.backend.model.entity.*;
import com.example.backend.repository.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Inicializador de datos de prueba EXCLUSIVO para el perfil 'local' (H2 en memoria).
 * Esta clase NUNCA se ejecuta cuando el perfil activo es 'neon' o producción,
 * garantizando que la base de datos remota Neon PostgreSQL permanezca 100% intacta.
 */
@Component
@Profile("local")
public class LocalDataInitializer implements CommandLineRunner {

    private final LegoSetRepository legoSetRepository;
    private final ThemeRepository themeRepository;
    private final CollectionRepository collectionRepository;
    private final WishlistRepository wishlistRepository;
    private final PriceHistoryRepository priceHistoryRepository;

    public LocalDataInitializer(LegoSetRepository legoSetRepository,
                                ThemeRepository themeRepository,
                                CollectionRepository collectionRepository,
                                WishlistRepository wishlistRepository,
                                PriceHistoryRepository priceHistoryRepository) {
        this.legoSetRepository = legoSetRepository;
        this.themeRepository = themeRepository;
        this.collectionRepository = collectionRepository;
        this.wishlistRepository = wishlistRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        if (legoSetRepository.count() > 0) {
            return;
        }

        System.out.println("=== [LOCAL PROFILE] Inicializando datos de prueba en H2 memoria... ===");

        // 1. Crear Temas
        Theme icons = new Theme();
        icons.setId(1);
        icons.setName("Icons");
        themeRepository.save(icons);

        Theme starWars = new Theme();
        starWars.setId(2);
        starWars.setName("Star Wars");
        themeRepository.save(starWars);

        Theme technic = new Theme();
        technic.setId(3);
        technic.setName("Technic");
        themeRepository.save(technic);

        // 2. Crear Sets LEGO
        LegoSet set1 = new LegoSet();
        set1.setId("10330-1");
        set1.setName("McLaren MP4/4 & Ayrton Senna");
        set1.setTheme(icons);
        set1.setPieces(693);
        set1.setReleaseDate(LocalDate.of(2024, 3, 1));
        set1.setRetired(false);
        set1.setImageUrl("https://cdn.rebrickable.com/media/sets/10330-1.jpg");
        set1.setRetailPrice(79.99);
        legoSetRepository.save(set1);

        LegoSet set2 = new LegoSet();
        set2.setId("10304-1");
        set2.setName("Chevrolet Camaro Z28");
        set2.setTheme(icons);
        set2.setPieces(1456);
        set2.setReleaseDate(LocalDate.of(2022, 8, 1));
        set2.setRetired(false);
        set2.setImageUrl("https://cdn.rebrickable.com/media/sets/10304-1.jpg");
        set2.setRetailPrice(169.99);
        legoSetRepository.save(set2);

        LegoSet set3 = new LegoSet();
        set3.setId("75375-1");
        set3.setName("Millennium Falcon");
        set3.setTheme(starWars);
        set3.setPieces(921);
        set3.setReleaseDate(LocalDate.of(2024, 3, 1));
        set3.setRetired(false);
        set3.setImageUrl("https://cdn.rebrickable.com/media/sets/75375-1.jpg");
        set3.setRetailPrice(84.99);
        legoSetRepository.save(set3);

        LegoSet set4 = new LegoSet();
        set4.setId("42151-1");
        set4.setName("Bugatti Bolide");
        set4.setTheme(technic);
        set4.setPieces(905);
        set4.setReleaseDate(LocalDate.of(2023, 1, 1));
        set4.setRetired(false);
        set4.setImageUrl("https://cdn.rebrickable.com/media/sets/42151-1.jpg");
        set4.setRetailPrice(49.99);
        legoSetRepository.save(set4);

        // 3. Añadir a Colección (Mi Colección)
        Collection col1 = new Collection();
        col1.setLegoSet(set1);
        col1.setAcquisitionType(Collection.AcquisitionType.PURCHASED);
        col1.setPurchasePrice(69.99);
        col1.setAcquisitionDate(LocalDate.of(2024, 4, 15));
        collectionRepository.save(col1);

        Collection col2 = new Collection();
        col2.setLegoSet(set2);
        col2.setAcquisitionType(Collection.AcquisitionType.PURCHASED);
        col2.setPurchasePrice(149.99);
        col2.setAcquisitionDate(LocalDate.of(2023, 11, 25));
        collectionRepository.save(col2);

        // 4. Añadir a Wishlist
        Wishlist wish1 = new Wishlist();
        wish1.setLegoSet(set3);
        wish1.setAddedAt(LocalDateTime.now().minusDays(10));
        wishlistRepository.save(wish1);

        // 5. Histórico de precios de prueba
        PriceHistory ph1 = new PriceHistory();
        ph1.setLegoSet(set1);
        ph1.setPrice(79.99);
        ph1.setCheckedAt(LocalDateTime.now().minusMonths(2));
        priceHistoryRepository.save(ph1);

        PriceHistory ph2 = new PriceHistory();
        ph2.setLegoSet(set1);
        ph2.setPrice(69.99);
        ph2.setCheckedAt(LocalDateTime.now().minusDays(5));
        priceHistoryRepository.save(ph2);

        PriceHistory ph3 = new PriceHistory();
        ph3.setLegoSet(set2);
        ph3.setPrice(179.99);
        ph3.setCheckedAt(LocalDateTime.now().minusDays(2));
        priceHistoryRepository.save(ph3);

        System.out.println("=== [LOCAL PROFILE] Datos de prueba cargados correctamente en memoria. ===");
    }
}
