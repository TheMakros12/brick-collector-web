package com.example.backend.model.dto;

import lombok.Data;
import java.util.List;

@Data
public class StatisticsDTO {
    // Main Financial KPIs
    private Double currentValueTotal;        // Sum of latest price_history.price
    private Double investedTotal;           // Sum of collection.purchase_price
    private Double retailPriceTotal;        // Sum of lego_set.retail_price
    private Double plusvaliaTotal;          // currentValueTotal - investedTotal (Ganancia/Pérdida económica real)
    private Double roiPercent;              // ((currentValueTotal - investedTotal) / investedTotal) * 100 (excluding purchase_price == 0)
    private Double revaluationPvpPercent;   // ((currentValueTotal - retailPriceTotal) / retailPriceTotal) * 100
    private Double savingsTotal;            // retailPriceTotal - investedTotal (Ahorro en ofertas y regalos)
    private Double averageDiscountPercent;  // ((retailPriceTotal - investedTotal) / retailPriceTotal) * 100
    private Double valuePerEuroInvested;    // currentValueTotal / investedTotal (ej: 1.35 € por cada 1 €)

    // Gamification
    private Integer collectorIndex;         // Score 0 - 100
    private String collectorRank;           // "Leyenda LEGO®", "Maestro Constructor", etc.

    // Concentration analysis
    private ConcentrationDTO concentration;

    // Per-piece efficiency KPIs
    private Double costPerPiece;            // investedTotal / totalPieces
    private Double valuePerPiece;           // currentValueTotal / totalPieces

    private Double wishlistTotalCost;       // Sum of wishlist retail_price
    private Integer setsCount;              // Total collection sets
    private Integer totalPieces;            // Total pieces across collection sets

    // Historic indicators
    private HistoricalSummaryDTO historicalSummary;

    // Badges
    private List<BadgeDTO> badges;

    // Breakdown analysis
    private List<ThemeStatDTO> themesAnalysis;
    private List<AcquisitionStatDTO> acquisitionsAnalysis;
    private List<YearlyStatDTO> yearlyAnalysis;

    // Rankings
    private RankingsDTO rankings;

    // Financial comparison (3 series: P.V.P., Pagado, Valor Actual)
    private List<FinancialComparisonDTO> financialComparison;

    @Data
    public static class HistoricalSummaryDTO {
        private Double allTimeHighValue;
        private Double allTimeLowValue;
        private Double currentValue;
        private Double diffFromAllTimeHigh;
        private Double diffPctFromAllTimeHigh;
        private Double growthFromFirstSnapshot;
    }

    @Data
    public static class BadgeDTO {
        private String icon;
        private String text;
    }

    @Data
    public static class ThemeStatDTO {
        private Integer themeId;
        private String themeName;
        private Integer setsCount;
        private Integer piecesCount;
        private Double currentValueTotal;
        private Double investedTotal;
        private Double plusvalia;            // currentValueTotal - investedTotal
        private Double roiPercent;           // ((currentValueTotal - investedTotal) / investedTotal) * 100
        private Double sharePercent;         // (setsCount / totalSets) * 100
    }

    @Data
    public static class AcquisitionStatDTO {
        private String type;                 // "PURCHASED", "GIFT", "PARTIAL"
        private String label;                // "Comprados por mí", "Regalos recibidos", "Pago compartido / 2ª mano"
        private Integer setsCount;
        private Double investedTotal;
        private Double retailPriceTotal;
        private Double currentValueTotal;
        private Double savingsTotal;          // retailPriceTotal - investedTotal
        private Double plusvaliaTotal;        // currentValueTotal - investedTotal
        private Double roiPercent;           // null if investedTotal == 0
    }

    @Data
    public static class YearlyStatDTO {
        private Integer year;
        private Integer setsCount;
        private Double investedTotal;
    }

    @Data
    public static class RankingsDTO {
        private LegoSetStatDTO mostValuable;
        private LegoSetStatDTO largest;
        private LegoSetStatDTO highestRoi;
        private LegoSetStatDTO bestCpp;
        private LegoSetStatDTO oldest;

        private List<LegoSetStatDTO> top5Profit;          // by (currentValue - purchasePrice)
        private List<LegoSetStatDTO> top5Roi;             // by ROI % (currentValue - purchasePrice)/purchasePrice (excluding purchasePrice == 0)
        private List<LegoSetStatDTO> top5RevaluationPvp;  // by ((currentValue - retailPrice) / retailPrice) * 100
        private List<LegoSetStatDTO> top5Discounts;       // by (retailPrice - purchasePrice)
        private List<LegoSetStatDTO> top5Pieces;          // by pieces
        private List<LegoSetStatDTO> top5MostExpensive;   // by retailPrice
    }

    @Data
    public static class LegoSetStatDTO {
        private String setId;
        private String name;
        private Integer year;
        private Integer pieces;
        private String setImgUrl;
        private Double retailPrice;
        private Double purchasePrice;
        private Double currentValue;
        private Boolean hasPriceHistory;
        private Double profit;               // currentValue - purchasePrice
        private Double roiPercent;            // ((currentValue - purchasePrice) / purchasePrice) * 100
        private Double revaluationPvpPercent;// ((currentValue - retailPrice) / retailPrice) * 100
        private Double discountAmount;      // retailPrice - purchasePrice
        private Double discountPercent;     // ((retailPrice - purchasePrice) / retailPrice) * 100
        private Double cpp;                 // purchasePrice / pieces
    }

    @Data
    public static class FinancialComparisonDTO {
        private String setId;
        private String name;
        private Double retailPrice;
        private Double purchasePrice;
        private Double currentValue;
        private Boolean hasPriceHistory;
    }

    @Data
    public static class ConcentrationDTO {
        private Double top1Percent;
        private Double top3Percent;
        private Double top5Percent;
        private String top1SetName;
    }
}
