package com.example.backend.service;

import com.example.backend.model.dto.CollectionHistoryDTO;
import com.example.backend.model.dto.SetHistoryDTO;
import com.example.backend.model.dto.StatisticsDTO;
import com.example.backend.model.entity.Collection;
import com.example.backend.model.entity.LegoSet;
import com.example.backend.model.entity.PriceHistory;
import com.example.backend.repository.CollectionRepository;
import com.example.backend.repository.PriceHistoryRepository;
import com.example.backend.repository.WishlistRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class StatisticsService {

    private final CollectionRepository collectionRepository;
    private final WishlistRepository wishlistRepository;
    private final PriceHistoryRepository priceHistoryRepository;

    public StatisticsService(CollectionRepository collectionRepository,
                             WishlistRepository wishlistRepository,
                             PriceHistoryRepository priceHistoryRepository) {
        this.collectionRepository = collectionRepository;
        this.wishlistRepository = wishlistRepository;
        this.priceHistoryRepository = priceHistoryRepository;
    }

    public StatisticsDTO getStatistics() {
        List<Collection> collectionItems = collectionRepository.findAll();
        double wishlistCost = wishlistRepository.findAll().stream()
                .mapToDouble(w -> (w.getLegoSet() != null && w.getLegoSet().getRetailPrice() != null) ? w.getLegoSet().getRetailPrice() : 0.0)
                .sum();

        StatisticsDTO dto = new StatisticsDTO();
        dto.setSetsCount(collectionItems.size());
        dto.setWishlistTotalCost(wishlistCost);

        double currentValueTotal = 0.0;
        double investedTotal = 0.0;
        double retailPriceTotal = 0.0;
        int totalPieces = 0;

        List<StatisticsDTO.LegoSetStatDTO> allSetStats = new ArrayList<>();
        List<StatisticsDTO.FinancialComparisonDTO> financialList = new ArrayList<>();
        Map<Integer, StatisticsDTO.ThemeStatDTO> themeMap = new HashMap<>();
        Map<String, StatisticsDTO.AcquisitionStatDTO> acqMap = new HashMap<>();
        Map<String, StatisticsDTO.StoreStatDTO> storeMap = new HashMap<>();
        Map<Integer, StatisticsDTO.YearlyStatDTO> yearlyMap = new TreeMap<>(Collections.reverseOrder());

        // Initialize acquisition categories
        acqMap.put("PURCHASED", createAcqDto("PURCHASED", "Comprados por mí"));
        acqMap.put("GIFT", createAcqDto("GIFT", "Regalos recibidos"));
        acqMap.put("PARTIAL", createAcqDto("PARTIAL", "Pago compartido / 2ª mano"));

        for (Collection item : collectionItems) {
            LegoSet set = item.getLegoSet();
            if (set == null) continue;

            double purchasePrice = item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0;
            double retailPrice = set.getRetailPrice() != null ? set.getRetailPrice() : 0.0;
            int pieces = set.getPieces() != null ? set.getPieces() : 0;
            int year = set.getReleaseDate() != null ? set.getReleaseDate().getYear() : 0;

            investedTotal += purchasePrice;
            retailPriceTotal += retailPrice;
            totalPieces += pieces;

            // Fetch latest price history (Strict READ-ONLY, no DB mutations!)
            Optional<PriceHistory> latestHistory = priceHistoryRepository.findTopByLegoSetIdOrderByCheckedAtDesc(set.getId());
            boolean hasHistory = latestHistory.isPresent();
            Double currentValue = hasHistory ? latestHistory.get().getPrice()
                    : (retailPrice > 0 ? retailPrice : purchasePrice);

            if (currentValue != null) {
                currentValueTotal += currentValue;
            }

            // Build LegoSetStatDTO
            StatisticsDTO.LegoSetStatDTO setStat = new StatisticsDTO.LegoSetStatDTO();
            setStat.setSetId(set.getId());
            setStat.setName(set.getName());
            setStat.setYear(year);
            setStat.setPieces(pieces);
            setStat.setSetImgUrl(set.getImageUrl());
            setStat.setRetailPrice(retailPrice);
            setStat.setPurchasePrice(purchasePrice);
            setStat.setCurrentValue(currentValue);
            setStat.setHasPriceHistory(hasHistory);

            if (currentValue != null) {
                // Plusvalía económica real del set
                double profit = currentValue - purchasePrice;
                setStat.setProfit(profit);

                // ROI Inversión (excluyendo regalos con purchasePrice == 0)
                if (purchasePrice > 0) {
                    double roi = ((currentValue - purchasePrice) / purchasePrice) * 100.0;
                    setStat.setRoiPercent(roi);
                } else {
                    setStat.setRoiPercent(null); // Regalo (sin división por cero)
                }

                // Revalorización desde P.V.P. oficial
                if (retailPrice > 0) {
                    double revalPvp = ((currentValue - retailPrice) / retailPrice) * 100.0;
                    setStat.setRevaluationPvpPercent(revalPvp);
                } else {
                    setStat.setRevaluationPvpPercent(null);
                }
            }

            if (retailPrice > 0 && purchasePrice >= 0) {
                double discountAmt = retailPrice - purchasePrice;
                double discountPct = (discountAmt / retailPrice) * 100.0;
                setStat.setDiscountAmount(discountAmt);
                setStat.setDiscountPercent(discountPct);
            }

            if (pieces > 0 && purchasePrice > 0) {
                setStat.setCpp(purchasePrice / pieces);
            }

            allSetStats.add(setStat);

            // Build FinancialComparisonDTO (3 series: P.V.P., Pagado, Valor Actual)
            StatisticsDTO.FinancialComparisonDTO finDto = new StatisticsDTO.FinancialComparisonDTO();
            finDto.setSetId(set.getId());
            finDto.setName(set.getName());
            finDto.setRetailPrice(retailPrice);
            finDto.setPurchasePrice(purchasePrice);
            finDto.setCurrentValue(currentValue);
            finDto.setHasPriceHistory(hasHistory);
            financialList.add(finDto);

            // Theme aggregation
            if (set.getTheme() != null) {
                int themeId = set.getTheme().getId();
                String themeName = set.getTheme().getName();
                StatisticsDTO.ThemeStatDTO tDto = themeMap.computeIfAbsent(themeId, k -> {
                    StatisticsDTO.ThemeStatDTO t = new StatisticsDTO.ThemeStatDTO();
                    t.setThemeId(themeId);
                    t.setThemeName(themeName);
                    t.setSetsCount(0);
                    t.setPiecesCount(0);
                    t.setCurrentValueTotal(0.0);
                    t.setInvestedTotal(0.0);
                    return t;
                });
                tDto.setSetsCount(tDto.getSetsCount() + 1);
                tDto.setPiecesCount(tDto.getPiecesCount() + pieces);
                tDto.setInvestedTotal(tDto.getInvestedTotal() + purchasePrice);
                if (hasHistory && currentValue != null) {
                    tDto.setCurrentValueTotal(tDto.getCurrentValueTotal() + currentValue);
                }
            }

            // Acquisition aggregation
            String acqTypeStr = item.getAcquisitionType() != null ? item.getAcquisitionType().name() : "PURCHASED";
            StatisticsDTO.AcquisitionStatDTO acqDto = acqMap.get(acqTypeStr);
            if (acqDto != null) {
                acqDto.setSetsCount(acqDto.getSetsCount() + 1);
                acqDto.setInvestedTotal(acqDto.getInvestedTotal() + purchasePrice);
                acqDto.setRetailPriceTotal(acqDto.getRetailPriceTotal() + retailPrice);
                if (hasHistory && currentValue != null) {
                    acqDto.setCurrentValueTotal(acqDto.getCurrentValueTotal() + currentValue);
                }
            }

            // Yearly purchase aggregation (using acquisitionDate)
            if (item.getAcquisitionDate() != null) {
                int acqYear = item.getAcquisitionDate().getYear();
                StatisticsDTO.YearlyStatDTO yDto = yearlyMap.computeIfAbsent(acqYear, k -> {
                    StatisticsDTO.YearlyStatDTO y = new StatisticsDTO.YearlyStatDTO();
                    y.setYear(acqYear);
                    y.setSetsCount(0);
                    y.setInvestedTotal(0.0);
                    return y;
                });
                yDto.setSetsCount(yDto.getSetsCount() + 1);
                yDto.setInvestedTotal(yDto.getInvestedTotal() + purchasePrice);
            }

            // Store / Location aggregation
            String storeName = (item.getPurchaseLocation() != null && !item.getPurchaseLocation().isBlank())
                    ? item.getPurchaseLocation().trim()
                    : "No especificada";

            StatisticsDTO.StoreStatDTO storeDto = storeMap.computeIfAbsent(storeName, k -> {
                StatisticsDTO.StoreStatDTO s = new StatisticsDTO.StoreStatDTO();
                s.setStoreName(k);
                s.setSetsCount(0);
                s.setInvestedTotal(0.0);
                s.setRetailPriceTotal(0.0);
                s.setCurrentValueTotal(0.0);
                s.setSavingsTotal(0.0);
                s.setAverageDiscountPercent(0.0);
                return s;
            });
            storeDto.setSetsCount(storeDto.getSetsCount() + 1);
            storeDto.setInvestedTotal(storeDto.getInvestedTotal() + purchasePrice);
            storeDto.setRetailPriceTotal(storeDto.getRetailPriceTotal() + retailPrice);
            if (hasHistory && currentValue != null) {
                storeDto.setCurrentValueTotal(storeDto.getCurrentValueTotal() + currentValue);
            }
        }

        dto.setCurrentValueTotal(currentValueTotal);
        dto.setInvestedTotal(investedTotal);
        dto.setRetailPriceTotal(retailPriceTotal);
        dto.setTotalPieces(totalPieces);

        // Micro-métricas globales
        int grandTotalSets = collectionItems.size();
        if (grandTotalSets > 0) {
            dto.setAveragePurchasePricePerSet(investedTotal / grandTotalSets);
            dto.setAverageCurrentValuePerSet(currentValueTotal / grandTotalSets);
            dto.setAverageSavingsPerSet((retailPriceTotal - investedTotal) / grandTotalSets);
        } else {
            dto.setAveragePurchasePricePerSet(0.0);
            dto.setAverageCurrentValuePerSet(0.0);
            dto.setAverageSavingsPerSet(0.0);
        }

        // Plusvalía económica real = Valor Actual - Dinero Invertido
        double plusvaliaTotal = currentValueTotal - investedTotal;
        dto.setPlusvaliaTotal(plusvaliaTotal);

        // Ahorro conseguido = PVP Oficial - Dinero Invertido
        double savingsTotal = retailPriceTotal - investedTotal;
        dto.setSavingsTotal(savingsTotal);

        // ROI Real Global = ((Valor Actual - Dinero Invertido) / Dinero Invertido) * 100
        if (investedTotal > 0) {
            dto.setRoiPercent(((currentValueTotal - investedTotal) / investedTotal) * 100.0);
            dto.setValuePerEuroInvested(currentValueTotal / investedTotal);
        } else {
            dto.setRoiPercent(0.0);
            dto.setValuePerEuroInvested(0.0);
        }

        // Revalorización frente a PVP = ((Valor Actual - PVP) / PVP) * 100
        if (retailPriceTotal > 0) {
            dto.setRevaluationPvpPercent(((currentValueTotal - retailPriceTotal) / retailPriceTotal) * 100.0);
            dto.setAverageDiscountPercent(Math.max(0.0, ((retailPriceTotal - investedTotal) / retailPriceTotal) * 100.0));
        } else {
            dto.setRevaluationPvpPercent(0.0);
            dto.setAverageDiscountPercent(0.0);
        }

        // Concentración de patrimonio (Top 1, Top 3, Top 5) e Interpretación Automática
        StatisticsDTO.ConcentrationDTO concentration = new StatisticsDTO.ConcentrationDTO();
        if (currentValueTotal > 0 && !allSetStats.isEmpty()) {
            List<StatisticsDTO.LegoSetStatDTO> sortedByValue = new ArrayList<>(allSetStats);
            sortedByValue.sort((a, b) -> Double.compare(
                    b.getCurrentValue() != null ? b.getCurrentValue() : 0.0,
                    a.getCurrentValue() != null ? a.getCurrentValue() : 0.0
            ));

            double top1Val = !sortedByValue.isEmpty() && sortedByValue.get(0).getCurrentValue() != null ? sortedByValue.get(0).getCurrentValue() : 0.0;
            double top3Val = 0.0;
            for (int i = 0; i < Math.min(3, sortedByValue.size()); i++) {
                if (sortedByValue.get(i).getCurrentValue() != null) top3Val += sortedByValue.get(i).getCurrentValue();
            }
            double top5Val = 0.0;
            for (int i = 0; i < Math.min(5, sortedByValue.size()); i++) {
                if (sortedByValue.get(i).getCurrentValue() != null) top5Val += sortedByValue.get(i).getCurrentValue();
            }

            double top1Pct = (top1Val / currentValueTotal) * 100.0;
            double top3Pct = (top3Val / currentValueTotal) * 100.0;
            double top5Pct = (top5Val / currentValueTotal) * 100.0;

            concentration.setTop1Percent(top1Pct);
            concentration.setTop1Value(top1Val);
            concentration.setTop3Percent(top3Pct);
            concentration.setTop3Value(top3Val);
            concentration.setTop5Percent(top5Pct);
            concentration.setTop5Value(top5Val);
            concentration.setTop1SetName(!sortedByValue.isEmpty() ? sortedByValue.get(0).getName() : "N/A");

            // Evaluación de umbrales
            if (top1Pct < 15.0 && top3Pct < 35.0 && top5Pct < 50.0) {
                concentration.setStatus("DIVERSIFIED");
                concentration.setStatusLabel("Colección Diversificada");
                concentration.setStatusDescription("Bajo riesgo. Tu patrimonio está repartido de forma muy equilibrada sin depender de un set principal.");
            } else if (top1Pct >= 30.0 || top5Pct >= 70.0) {
                concentration.setStatus("HIGH");
                concentration.setStatusLabel("Alta Concentración");
                concentration.setStatusDescription("Riesgo elevado. Un pequeño grupo de sets acapara la mayor parte del patrimonio acumulado.");
            } else {
                concentration.setStatus("MODERATE");
                concentration.setStatusLabel("Concentración Moderada");
                concentration.setStatusDescription("Riesgo equilibrado. Pocos sets acumulan un peso patrimonial destacado dentro de tu vitrina.");
            }
        } else {
            concentration.setTop1Percent(0.0);
            concentration.setTop1Value(0.0);
            concentration.setTop3Percent(0.0);
            concentration.setTop3Value(0.0);
            concentration.setTop5Percent(0.0);
            concentration.setTop5Value(0.0);
            concentration.setTop1SetName("N/A");
            concentration.setStatus("DIVERSIFIED");
            concentration.setStatusLabel("Colección Diversificada");
            concentration.setStatusDescription("Colección sin concentración asignada.");
        }
        dto.setConcentration(concentration);

        // Indicadores por pieza
        if (totalPieces > 0) {
            dto.setCostPerPiece(investedTotal / totalPieces);
            dto.setValuePerPiece(currentValueTotal / totalPieces);
        } else {
            dto.setCostPerPiece(0.0);
            dto.setValuePerPiece(0.0);
        }

        // Post-process theme stats (Plusvalía, ROI %, % del valor total)
        for (StatisticsDTO.ThemeStatDTO t : themeMap.values()) {
            t.setPlusvalia(t.getCurrentValueTotal() - t.getInvestedTotal());
            if (t.getInvestedTotal() > 0) {
                t.setRoiPercent(((t.getCurrentValueTotal() - t.getInvestedTotal()) / t.getInvestedTotal()) * 100.0);
            } else {
                t.setRoiPercent(null);
            }
            if (currentValueTotal > 0) {
                t.setSharePercent((t.getCurrentValueTotal() / currentValueTotal) * 100.0);
            } else if (grandTotalSets > 0) {
                t.setSharePercent(((double) t.getSetsCount() / grandTotalSets) * 100.0);
            } else {
                t.setSharePercent(0.0);
            }
        }

        // Post-process store stats & highlights
        for (StatisticsDTO.StoreStatDTO s : storeMap.values()) {
            s.setSavingsTotal(s.getRetailPriceTotal() - s.getInvestedTotal());
            if (s.getRetailPriceTotal() > 0) {
                s.setAverageDiscountPercent(Math.max(0.0, ((s.getRetailPriceTotal() - s.getInvestedTotal()) / s.getRetailPriceTotal()) * 100.0));
            } else {
                s.setAverageDiscountPercent(0.0);
            }
        }

        StatisticsDTO.StoreStatDTO topSavingsStore = storeMap.values().stream()
                .filter(s -> s.getSavingsTotal() != null && s.getSavingsTotal() > 0)
                .max(Comparator.comparingDouble(StatisticsDTO.StoreStatDTO::getSavingsTotal))
                .orElse(null);
        if (topSavingsStore != null) {
            dto.setTopSavingsStoreName(topSavingsStore.getStoreName());
            dto.setTopSavingsStoreAmount(topSavingsStore.getSavingsTotal());
        }

        StatisticsDTO.StoreStatDTO topDiscountStore = storeMap.values().stream()
                .filter(s -> s.getAverageDiscountPercent() != null && s.getAverageDiscountPercent() > 0 && s.getRetailPriceTotal() > 0)
                .max(Comparator.comparingDouble(StatisticsDTO.StoreStatDTO::getAverageDiscountPercent))
                .orElse(null);
        if (topDiscountStore != null) {
            dto.setTopDiscountStoreName(topDiscountStore.getStoreName());
            dto.setTopDiscountStorePct(topDiscountStore.getAverageDiscountPercent());
        }

        dto.setStoresAnalysis(new ArrayList<>(storeMap.values()));

        // Post-process acquisition stats (Ahorro, Plusvalía, ROI %)
        for (StatisticsDTO.AcquisitionStatDTO a : acqMap.values()) {
            a.setSavingsTotal(a.getRetailPriceTotal() - a.getInvestedTotal());
            a.setPlusvaliaTotal(a.getCurrentValueTotal() - a.getInvestedTotal());
            if (a.getInvestedTotal() > 0) {
                a.setRoiPercent(((a.getCurrentValueTotal() - a.getInvestedTotal()) / a.getInvestedTotal()) * 100.0);
            } else {
                a.setRoiPercent(null); // Regalos (0€ invertidos) sin división por cero
            }
        }

        // Build Historical Indicators
        dto.setHistoricalSummary(buildHistoricalSummary());

        // Build Badges
        dto.setBadges(buildBadges(collectionItems.size(), totalPieces, currentValueTotal, themeMap));

        // Build Rankings
        dto.setRankings(buildRankings(allSetStats));

        // Sort Financial Comparison by Current Value (or purchase price if no history)
        financialList.sort((a, b) -> Double.compare(
                b.getCurrentValue() != null ? b.getCurrentValue() : b.getPurchasePrice(),
                a.getCurrentValue() != null ? a.getCurrentValue() : a.getPurchasePrice()
        ));
        dto.setFinancialComparison(financialList.stream().limit(15).collect(Collectors.toList()));

        dto.setThemesAnalysis(new ArrayList<>(themeMap.values()));
        dto.setAcquisitionsAnalysis(new ArrayList<>(acqMap.values()));
        dto.setYearlyAnalysis(new ArrayList<>(yearlyMap.values()));

        return dto;
    }

    public CollectionHistoryDTO getCollectionHistory() {
        List<Collection> collectionItems = collectionRepository.findAll();
        if (collectionItems.isEmpty()) {
            CollectionHistoryDTO dto = new CollectionHistoryDTO();
            dto.setSnapshots(Collections.emptyList());
            return dto;
        }

        // Gather all set timelines and all unique timeline dates
        Map<String, TreeMap<LocalDate, Double>> setHistories = new HashMap<>();
        Set<LocalDate> allDatesSet = new TreeSet<>();

        for (Collection item : collectionItems) {
            LegoSet set = item.getLegoSet();
            if (set == null) continue;

            List<PriceHistory> historyList = priceHistoryRepository.findByLegoSetIdOrderByCheckedAtAsc(set.getId());
            if (historyList.isEmpty()) continue;

            TreeMap<LocalDate, Double> setTimeline = new TreeMap<>();
            for (PriceHistory ph : historyList) {
                if (ph.getCheckedAt() != null && ph.getPrice() != null) {
                    LocalDate date = ph.getCheckedAt().toLocalDate();
                    setTimeline.put(date, ph.getPrice());
                    allDatesSet.add(date);
                }
            }
            if (!setTimeline.isEmpty()) {
                setHistories.put(set.getId(), setTimeline);
            }
        }

        if (allDatesSet.isEmpty()) {
            CollectionHistoryDTO dto = new CollectionHistoryDTO();
            dto.setSnapshots(Collections.emptyList());
            return dto;
        }

        // Forward-Fill (Carry Forward) last known price for each set across all dates
        Map<String, Double> lastKnownPrices = new HashMap<>();
        List<CollectionHistoryDTO.SnapshotDTO> snapshots = new ArrayList<>();

        for (LocalDate date : allDatesSet) {
            double totalValueOnDate = 0.0;

            for (Collection item : collectionItems) {
                LegoSet set = item.getLegoSet();
                if (set == null) continue;

                // Temporal Filter: Only include sets acquired on or before this snapshot date!
                if (item.getAcquisitionDate() != null && item.getAcquisitionDate().isAfter(date)) {
                    continue;
                }

                String setId = set.getId();
                TreeMap<LocalDate, Double> timeline = setHistories.get(setId);

                if (timeline != null) {
                    Map.Entry<LocalDate, Double> floorEntry = timeline.floorEntry(date);
                    if (floorEntry != null) {
                        lastKnownPrices.put(setId, floorEntry.getValue());
                    }
                    Double currentPrice = lastKnownPrices.get(setId);
                    if (currentPrice != null) {
                        totalValueOnDate += currentPrice;
                    }
                } else {
                    double fallbackVal = set.getRetailPrice() != null ? set.getRetailPrice() : (item.getPurchasePrice() != null ? item.getPurchasePrice() : 0.0);
                    totalValueOnDate += fallbackVal;
                }
            }

            double investedValueOnDate = collectionItems.stream()
                    .filter(c -> c.getAcquisitionDate() == null || !c.getAcquisitionDate().isAfter(date))
                    .mapToDouble(c -> c.getPurchasePrice() != null ? c.getPurchasePrice() : 0.0)
                    .sum();

            CollectionHistoryDTO.SnapshotDTO snap = new CollectionHistoryDTO.SnapshotDTO();
            snap.setDate(date.toString());
            snap.setTotalValue(totalValueOnDate);
            snap.setInvestedValue(investedValueOnDate);
            snap.setPlusvalia(totalValueOnDate - investedValueOnDate);
            snapshots.add(snap);
        }

        CollectionHistoryDTO dto = new CollectionHistoryDTO();
        dto.setSnapshots(snapshots);
        return dto;
    }

    public SetHistoryDTO getSetHistory(String setId) {
        Collection item = collectionRepository.findAll().stream()
                .filter(c -> c.getLegoSet() != null && c.getLegoSet().getId().equals(setId))
                .findFirst()
                .orElse(null);

        LegoSet set = (item != null) ? item.getLegoSet() : null;
        if (set == null) return null;

        double retailPrice = set.getRetailPrice() != null ? set.getRetailPrice() : 0.0;
        double purchasePrice = (item != null && item.getPurchasePrice() != null) ? item.getPurchasePrice() : 0.0;

        List<PriceHistory> historyList = priceHistoryRepository.findByLegoSetIdOrderByCheckedAtAsc(setId);
        SetHistoryDTO dto = new SetHistoryDTO();
        dto.setSetId(set.getId());
        dto.setName(set.getName());
        dto.setSetImgUrl(set.getImageUrl());
        dto.setRetailPrice(retailPrice);
        dto.setPurchasePrice(purchasePrice);

        if (historyList.isEmpty()) {
            dto.setHasPriceHistory(false);
            double fallbackVal = retailPrice > 0 ? retailPrice : purchasePrice;
            dto.setCurrentValue(fallbackVal);
            dto.setAllTimeHigh(fallbackVal);
            dto.setAllTimeLow(fallbackVal);
            dto.setGrowthAmount(0.0);
            dto.setGrowthPct(0.0);
            dto.setHistory(Collections.emptyList());
            return dto;
        }

        dto.setHasPriceHistory(true);
        double maxPrice = Double.MIN_VALUE;
        String maxDate = "";
        double minPrice = Double.MAX_VALUE;
        String minDate = "";

        List<SetHistoryDTO.PricePointDTO> points = new ArrayList<>();
        for (PriceHistory ph : historyList) {
            double price = ph.getPrice();
            String dateStr = ph.getCheckedAt() != null ? ph.getCheckedAt().toLocalDate().toString() : "";

            if (price >= maxPrice) {
                maxPrice = price;
                maxDate = dateStr;
            }
            if (price <= minPrice) {
                minPrice = price;
                minDate = dateStr;
            }

            SetHistoryDTO.PricePointDTO pt = new SetHistoryDTO.PricePointDTO();
            pt.setCheckedAt(dateStr);
            pt.setPrice(price);
            points.add(pt);
        }

        double latestPrice = historyList.get(historyList.size() - 1).getPrice();
        // Baseline for growth: MSRP (Retail Price) if available, otherwise first snapshot or purchase price
        double basePrice = retailPrice > 0 ? retailPrice : (historyList.get(0).getPrice() > 0 ? historyList.get(0).getPrice() : purchasePrice);

        dto.setCurrentValue(latestPrice);
        dto.setAllTimeHigh(maxPrice);
        dto.setAllTimeHighDate(maxDate);
        dto.setAllTimeLow(minPrice);
        dto.setAllTimeLowDate(minDate);

        double growthAmt = latestPrice - basePrice;
        dto.setGrowthAmount(growthAmt);
        if (basePrice > 0) {
            dto.setGrowthPct((growthAmt / basePrice) * 100.0);
        } else {
            dto.setGrowthPct(0.0);
        }

        dto.setHistory(points);
        return dto;
    }

    private StatisticsDTO.AcquisitionStatDTO createAcqDto(String type, String label) {
        StatisticsDTO.AcquisitionStatDTO dto = new StatisticsDTO.AcquisitionStatDTO();
        dto.setType(type);
        dto.setLabel(label);
        dto.setSetsCount(0);
        dto.setInvestedTotal(0.0);
        dto.setRetailPriceTotal(0.0);
        dto.setCurrentValueTotal(0.0);
        dto.setSavingsTotal(0.0);
        dto.setPlusvaliaTotal(0.0);
        return dto;
    }

    private StatisticsDTO.HistoricalSummaryDTO buildHistoricalSummary() {
        CollectionHistoryDTO colHist = getCollectionHistory();
        List<CollectionHistoryDTO.SnapshotDTO> snaps = colHist.getSnapshots();

        StatisticsDTO.HistoricalSummaryDTO dto = new StatisticsDTO.HistoricalSummaryDTO();
        if (snaps == null || snaps.isEmpty()) {
            dto.setAllTimeHighValue(0.0);
            dto.setAllTimeLowValue(0.0);
            dto.setCurrentValue(0.0);
            dto.setDiffFromAllTimeHigh(0.0);
            dto.setDiffPctFromAllTimeHigh(0.0);
            dto.setGrowthFromFirstSnapshot(0.0);
            return dto;
        }

        double max = snaps.stream().mapToDouble(CollectionHistoryDTO.SnapshotDTO::getTotalValue).max().orElse(0.0);
        double min = snaps.stream().mapToDouble(CollectionHistoryDTO.SnapshotDTO::getTotalValue).min().orElse(0.0);
        double current = snaps.get(snaps.size() - 1).getTotalValue();
        double first = snaps.get(0).getTotalValue();

        dto.setAllTimeHighValue(max);
        dto.setAllTimeLowValue(min);
        dto.setCurrentValue(current);
        dto.setDiffFromAllTimeHigh(current - max);
        dto.setDiffPctFromAllTimeHigh(max > 0 ? ((current - max) / max) * 100.0 : 0.0);
        dto.setGrowthFromFirstSnapshot(first > 0 ? ((current - first) / first) * 100.0 : 0.0);

        return dto;
    }

    private StatisticsDTO.RankingsDTO buildRankings(List<StatisticsDTO.LegoSetStatDTO> allStats) {
        StatisticsDTO.RankingsDTO r = new StatisticsDTO.RankingsDTO();
        if (allStats.isEmpty()) return r;

        // Most Valuable
        allStats.stream()
                .filter(s -> s.getHasPriceHistory() && s.getCurrentValue() != null)
                .max(Comparator.comparingDouble(StatisticsDTO.LegoSetStatDTO::getCurrentValue))
                .ifPresent(r::setMostValuable);

        // Largest
        allStats.stream()
                .filter(s -> s.getPieces() != null)
                .max(Comparator.comparingInt(StatisticsDTO.LegoSetStatDTO::getPieces))
                .ifPresent(r::setLargest);

        // Highest ROI (Inversión real, excluyendo regalos con purchasePrice == 0)
        allStats.stream()
                .filter(s -> s.getHasPriceHistory() && s.getRoiPercent() != null && s.getPurchasePrice() > 0)
                .max(Comparator.comparingDouble(StatisticsDTO.LegoSetStatDTO::getRoiPercent))
                .ifPresent(r::setHighestRoi);

        // Best CPP
        allStats.stream()
                .filter(s -> s.getCpp() != null)
                .min(Comparator.comparingDouble(StatisticsDTO.LegoSetStatDTO::getCpp))
                .ifPresent(r::setBestCpp);

        // Oldest
        allStats.stream()
                .filter(s -> s.getYear() != null && s.getYear() > 0)
                .min(Comparator.comparingInt(StatisticsDTO.LegoSetStatDTO::getYear))
                .ifPresent(r::setOldest);

        // Top 5 Profit / Plusvalía Real (€ = Valor Actual - Precio Pagado)
        r.setTop5Profit(allStats.stream()
                .filter(s -> s.getHasPriceHistory() && s.getProfit() != null)
                .sorted((a, b) -> Double.compare(b.getProfit(), a.getProfit()))
                .limit(5)
                .collect(Collectors.toList()));

        // Top 5 ROI Inversión (% = (Valor Actual - Precio Pagado)/Precio Pagado, excluyendo purchasePrice == 0)
        r.setTop5Roi(allStats.stream()
                .filter(s -> s.getHasPriceHistory() && s.getRoiPercent() != null && s.getPurchasePrice() > 0)
                .sorted((a, b) -> Double.compare(b.getRoiPercent(), a.getRoiPercent()))
                .limit(5)
                .collect(Collectors.toList()));

        // Top 5 Revalorización desde PVP (% = (Valor Actual - PVP) / PVP)
        r.setTop5RevaluationPvp(allStats.stream()
                .filter(s -> s.getHasPriceHistory() && s.getRevaluationPvpPercent() != null)
                .sorted((a, b) -> Double.compare(b.getRevaluationPvpPercent(), a.getRevaluationPvpPercent()))
                .limit(5)
                .collect(Collectors.toList()));

        // Top 5 Discounts (Ahorro = PVP - Precio Pagado)
        r.setTop5Discounts(allStats.stream()
                .filter(s -> s.getDiscountAmount() != null && s.getDiscountAmount() > 0)
                .sorted((a, b) -> Double.compare(b.getDiscountAmount(), a.getDiscountAmount()))
                .limit(5)
                .collect(Collectors.toList()));

        // Top 5 Pieces
        r.setTop5Pieces(allStats.stream()
                .filter(s -> s.getPieces() != null && s.getPieces() > 0)
                .sorted((a, b) -> Integer.compare(b.getPieces(), a.getPieces()))
                .limit(5)
                .collect(Collectors.toList()));

        // Top 5 Most Expensive (por P.V.P. oficial / retailPrice)
        r.setTop5MostExpensive(allStats.stream()
                .filter(s -> s.getRetailPrice() != null && s.getRetailPrice() > 0)
                .sorted((a, b) -> Double.compare(b.getRetailPrice(), a.getRetailPrice()))
                .limit(5)
                .collect(Collectors.toList()));

        return r;
    }

    private List<StatisticsDTO.BadgeDTO> buildBadges(int setsCount, int totalPieces, double currentValueTotal,
                                                      Map<Integer, StatisticsDTO.ThemeStatDTO> themeMap) {
        List<StatisticsDTO.BadgeDTO> badges = new ArrayList<>();
        if (setsCount >= 1) badges.add(createBadge("star", "Coleccionista Novato"));
        if (setsCount >= 10) badges.add(createBadge("award", "Maestro Constructor"));
        if (totalPieces >= 5000) badges.add(createBadge("zap", "Imperio de Piezas (+5k)"));
        if (currentValueTotal >= 1000.0) badges.add(createBadge("trending-up", "Vitrina Alta Revalorización"));

        themeMap.values().stream()
                .filter(t -> t.getSetsCount() >= 5)
                .findFirst()
                .ifPresent(t -> badges.add(createBadge("heart", "Especialista en " + t.getThemeName())));

        return badges;
    }

    private StatisticsDTO.BadgeDTO createBadge(String icon, String text) {
        StatisticsDTO.BadgeDTO b = new StatisticsDTO.BadgeDTO();
        b.setIcon(icon);
        b.setText(text);
        return b;
    }
}
