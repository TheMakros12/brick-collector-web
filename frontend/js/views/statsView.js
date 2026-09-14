const StatsView = {
    currentStats: null,
    currentHistoryData: null,

    async render(container) {
        container.innerHTML = '<div class="text-center p-5"><i data-lucide="loader" class="spin" style="width:36px;height:36px;color:var(--accent);"></i><div class="mt-2 text-muted">Cargando Dashboard Analítico...</div></div>';
        lucide.createIcons();

        let stats = null;
        let historyData = null;
        try {
            stats = await API.getStatistics();
            historyData = await API.getCollectionHistory();
        } catch (e) {
            console.error("Error fetching statistics from backend:", e);
        }

        const col = Storage.getCollection() || [];

        if (!stats) {
            stats = {
                currentValueTotal: col.reduce((sum, s) => sum + (s.market_value || s.retail_price || 0), 0),
                investedTotal: col.reduce((sum, s) => sum + (s.purchaseDetails?.pricePaid ? parseFloat(s.purchaseDetails.pricePaid) : (s.retail_price || 0)), 0),
                retailPriceTotal: col.reduce((sum, s) => sum + (s.retail_price || 0), 0),
                plusvaliaTotal: 0,
                roiPercent: 0,
                setsCount: col.length,
                totalPieces: col.reduce((sum, s) => sum + (s.num_parts || 0), 0),
                badges: [],
                historicalSummary: { allTimeHighValue: 0, currentValue: 0, diffFromAllTimeHigh: 0, growthFromFirstSnapshot: 0 },
                themesAnalysis: [],
                acquisitionsAnalysis: [],
                storesAnalysis: [],
                yearlyAnalysis: [],
                rankings: { top5Profit: [], top5Roi: [], top5Discounts: [], top5Pieces: [], top5MostExpensive: [] },
                financialComparison: []
            };
            stats.plusvaliaTotal = stats.currentValueTotal - stats.investedTotal;
            stats.roiPercent = stats.investedTotal > 0 ? (stats.plusvaliaTotal / stats.investedTotal) * 100 : 0;
        }

        this.currentStats = stats;
        this.currentHistoryData = historyData;

        if (!App.profileState.selectedSetId && col.length > 0) {
            App.profileState.selectedSetId = col[0].set_num;
        }

        const mode = App.profileState.mode;

        container.innerHTML = `
            <div class="view-container">
                <!-- Header Title Bar -->
                <div class="page-header" style="margin-bottom: 20px;">
                    <div class="page-header-title-wrap">
                        <div class="page-header-icon" style="background: linear-gradient(135deg, #F5C518, #E3000B); color: #fff; box-shadow: 0 6px 16px rgba(227, 0, 11, 0.3);">
                            <i data-lucide="bar-chart-3" style="width: 26px; height: 26px;"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Estadísticas & Análisis</h2>
                                <span class="page-header-badge" style="color:#E3000B; background:rgba(227,0,11,0.08); border-color:rgba(227,0,11,0.2);">✨ Vitrina & Dashboard Analítico</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Análisis financiero en tiempo real, ROI ponderado y evolución de tu colección LEGO®
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        ${col.length > 0 ? `
                        <button class="btn btn-secondary" onclick="CollectionView.exportPDF()" style="display: flex; align-items: center; gap: 8px; border-radius: 12px;">
                            <i data-lucide="send"></i> Enviar PDF
                        </button>` : ''}
                    </div>
                </div>

                <!-- Mode Switcher Segmented Control -->
                <div style="margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <div class="segmented-control" style="max-width: 340px;">
                        <button class="segmented-tab ${mode === 'collection' ? 'active' : ''}" onclick="StatsView.setStatsMode('collection')">
                            <i data-lucide="layers" style="width:16px;height:16px;"></i> Modo Colección
                        </button>
                        <button class="segmented-tab ${mode === 'set' ? 'active' : ''}" onclick="StatsView.setStatsMode('set')">
                            <i data-lucide="box" style="width:16px;height:16px;"></i> Modo Set
                        </button>
                    </div>

                    ${stats.badges && stats.badges.length > 0 ? `
                    <div class="badge-container" style="margin-top:0;">
                        ${stats.badges.map(b => `<div class="profile-badge"><i data-lucide="${b.icon}"></i> ${b.text}</div>`).join('')}
                    </div>` : ''}
                </div>

                ${col.length === 0 ? `
                <div style="background: var(--bg-surface); padding: 36px; border-radius: 20px; border: 2px dashed var(--accent); text-align: center; margin-bottom: 25px;">
                    <i data-lucide="blocks" style="width: 48px; height: 48px; color: var(--accent); margin-bottom: 12px;"></i>
                    <h3 style="margin-bottom: 8px; font-family: 'Space Grotesk', sans-serif; font-size: 1.3rem;">¡Empieza tu colección!</h3>
                    <p style="color: var(--text-secondary); max-width: 540px; margin: 0 auto 18px auto; font-size: 0.95rem;">
                        Añade tus primeros sets de LEGO® a tu colección para ver el análisis de revalorización, ROI y gráficos históricos.
                    </p>
                    <button class="btn btn-primary" onclick="App.navigate('search')" style="border-radius: 12px; padding: 10px 24px;">
                        <i data-lucide="search"></i> Buscar Sets
                    </button>
                </div>
                ` : ''}

                <!-- MAIN DASHBOARD CONTENT -->
                ${mode === 'collection' ? this.renderCollectionDashboardHTML(stats) : this.renderSetDashboardHTML(col)}
            </div>
        `;

        lucide.createIcons();

        if (mode === 'collection') {
            this.initCollectionCharts(stats, historyData);
        } else {
            this.initSetCharts();
        }
    },

    setStatsMode(mode) {
        App.profileState.mode = mode;
        this.render(document.getElementById('main-content'));
    },

    setRankingTab(tab) {
        App.profileState.activeRankingTab = tab;
        document.querySelectorAll('.ranking-tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        document.querySelectorAll('.ranking-panel').forEach(panel => {
            panel.style.display = panel.id === `ranking-panel-${tab}` ? 'block' : 'none';
        });
    },

    setThemeSort(sortKey) {
        App.profileState.themeSort = sortKey;
        document.querySelectorAll('.theme-sort-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.sort === sortKey);
        });
        const container = document.getElementById('themes-list-container');
        if (container && this.currentStats) {
            container.innerHTML = this.renderThemesListHTML(this.currentStats.themesAnalysis || [], sortKey);
            lucide.createIcons();
        }
    },

    setTimeRange(range) {
        App.profileState.timeRange = range;
        document.querySelectorAll('.time-range-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        if (this.currentStats && this.currentHistoryData) {
            this.renderTimelineChart(this.currentStats, this.currentHistoryData, range);
        }
    },

    async onSelectSetForAnalysis(setId) {
        App.profileState.selectedSetId = setId;
        this.render(document.getElementById('main-content'));
    },

    renderTooltipHTML(text) {
        return `
            <span class="info-tooltip-wrap">
                <i data-lucide="info" class="info-tooltip-icon"></i>
                <span class="info-tooltip-box">${text}</span>
            </span>
        `;
    },

    renderCollectionDashboardHTML(stats) {
        const isRoiPos = (stats.roiPercent || 0) >= 0;
        const isRevalPos = (stats.revaluationPvpPercent || 0) >= 0;
        const isPlusvaliaPos = (stats.plusvaliaTotal || 0) >= 0;
        const activeTab = App.profileState.activeRankingTab || 'profit';
        const activeThemeSort = App.profileState.themeSort || 'value';
        const activeTimeRange = App.profileState.timeRange || 'all';

        return `
            <!-- 💵 BLOQUE 1: DINERO — SALUD FINANCIERA & PATRIMONIO -->
            <div style="margin-bottom:12px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                💵 1. DINERO — Salud Financiera & Patrimonio
            </div>

            <div class="kpi-5-grid" style="margin-bottom: 24px;">
                <div class="kpi-card" style="border-top: 4px solid var(--accent);">
                    <div class="kpi-title">
                        <span>PATRIMONIO (VALOR ACTUAL)</span>
                        ${this.renderTooltipHTML('Valor total estimado de mercado en mercado secundario.')}
                    </div>
                    <div class="kpi-value" style="color:var(--text-primary);">${(stats.currentValueTotal || 0).toFixed(2)}€</div>
                    <div class="kpi-subtext">Valor en mercado secundario</div>
                </div>

                <div class="kpi-card" style="border-top: 4px solid #0075FF;">
                    <div class="kpi-title">
                        <span>INVERSIÓN TOTAL</span>
                        ${this.renderTooltipHTML('Capital neto que realmente salió de tu bolsillo.')}
                    </div>
                    <div class="kpi-value">${(stats.investedTotal || 0).toFixed(2)}€</div>
                    <div class="kpi-subtext">Capital real desembolsado (${stats.setsCount || 0} sets)</div>
                </div>

                <div class="kpi-card" style="border-top: 4px solid #A855F7;">
                    <div class="kpi-title">
                        <span>P.V.P. OFICIAL</span>
                        ${this.renderTooltipHTML('Sumatorio del P.V.P. de catálogo oficial LEGO® (MSRP).')}
                    </div>
                    <div class="kpi-value" style="color:var(--text-primary);">${(stats.retailPriceTotal || 0).toFixed(2)}€</div>
                    <div class="kpi-subtext">Sumatorio P.V.P. LEGO®</div>
                </div>

                <div class="kpi-card" style="border-top: 4px solid ${isRoiPos ? '#00D26A' : '#FF2A2A'};">
                    <div class="kpi-title">
                        <span>ROI INVERSIÓN (%)</span>
                        ${this.renderTooltipHTML('ROI Real: Porcentaje de rentabilidad obtenido sobre el dinero que realmente salió de tu bolsillo (excluyendo regalos).')}
                    </div>
                    <div class="kpi-value" style="color:${isRoiPos ? '#00D26A' : '#FF2A2A'};">
                        ${stats.investedTotal === 0 ? '+100.0% (Regalos)' : ((isRoiPos ? '+' : '') + (stats.roiPercent || 0).toFixed(1) + '%')}
                    </div>
                    <div class="kpi-subtext">Rendimiento sobre capital real</div>
                </div>

                <div class="kpi-card" style="border-top: 4px solid #A855F7;">
                    <div class="kpi-title">
                        <span>REVALORIZACIÓN PVP (%)</span>
                        ${this.renderTooltipHTML('Revalorización PVP: Crecimiento % del valor de mercado respecto al precio oficial de tienda LEGO® (MSRP).')}
                    </div>
                    <div class="kpi-value" style="color:${isRevalPos ? '#00D26A' : '#FF2A2A'};">
                        ${isRevalPos ? '+' : ''}${(stats.revaluationPvpPercent || 0).toFixed(1)}%
                    </div>
                    <div class="kpi-subtext">Frente a catálogo oficial LEGO®</div>
                </div>
            </div>



            <!-- Micro-métricas Unitarias Banner -->
            <div style="background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:12px 18px; margin-bottom:24px; display:grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap:12px; align-items:center;">
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:rgba(227,0,11,0.1); color:var(--accent); display:flex; align-items:center; justify-content:center; font-size:1.1rem;">📦</div>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Sets</div>
                        <div style="font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:0.95rem; color:var(--text-primary);">${stats.setsCount || 0}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:rgba(168,85,247,0.1); color:#A855F7; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">🧩</div>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Total Piezas</div>
                        <div style="font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:0.95rem; color:#A855F7;">${(stats.totalPieces || 0).toLocaleString('es')}</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:rgba(0,117,255,0.1); color:#0075FF; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">🏷️</div>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Precio Medio / Set</div>
                        <div style="font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:0.95rem; color:var(--text-primary);">${(stats.averagePurchasePricePerSet || 0).toFixed(2)}€</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:rgba(0,210,106,0.1); color:#00D26A; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">💎</div>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Valor Medio / Set</div>
                        <div style="font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:0.95rem; color:#00D26A;">${(stats.averageCurrentValuePerSet || 0).toFixed(2)}€</div>
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:10px;">
                    <div style="width:32px; height:32px; border-radius:8px; background:rgba(255,199,0,0.1); color:#FFC700; display:flex; align-items:center; justify-content:center; font-size:1.1rem;">🐷</div>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Ahorro Medio / Set</div>
                        <div style="font-family:'IBM Plex Mono',monospace; font-weight:700; font-size:0.95rem; color:#FFC700;">+${(stats.averageSavingsPerSet || 0).toFixed(2)}€</div>
                    </div>
                </div>
            </div>

            <!-- 📈 BLOQUE 2: EVOLUCIÓN HISTÓRICA DEL PATRIMONIO -->
            <div style="margin-bottom:12px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                📈 2. EVOLUCIÓN — Histórico de Patrimonio & Tendencia
            </div>

            <div class="bento-grid mb-4">
                <div class="bento-card bento-col-12">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                        <h3 style="font-size: 1.15rem; font-family:'Space Grotesk',sans-serif; font-weight:700; display:flex; align-items:center; gap:8px;">
                            <i data-lucide="activity" style="width: 20px; height: 20px; color: var(--accent);"></i> Patrimonio Total vs Inversión Acumulada
                        </h3>

                        <!-- RANGOS TEMPORALES -->
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            <button class="time-range-btn ${activeTimeRange === '1M' ? 'active' : ''}" data-range="1M" onclick="StatsView.setTimeRange('1M')">1M</button>
                            <button class="time-range-btn ${activeTimeRange === '3M' ? 'active' : ''}" data-range="3M" onclick="StatsView.setTimeRange('3M')">3M</button>
                            <button class="time-range-btn ${activeTimeRange === '6M' ? 'active' : ''}" data-range="6M" onclick="StatsView.setTimeRange('6M')">6M</button>
                            <button class="time-range-btn ${activeTimeRange === '1A' ? 'active' : ''}" data-range="1A" onclick="StatsView.setTimeRange('1A')">1A</button>
                            <button class="time-range-btn ${activeTimeRange === 'all' ? 'active' : ''}" data-range="all" onclick="StatsView.setTimeRange('all')">TODO</button>
                        </div>
                    </div>

                    <div id="timelineChart" style="width: 100%; min-height: 280px;"></div>

                    <!-- Indicadores Históricos Debajo del Gráfico -->
                    ${this.renderHistoricalSummaryCardsHTML(stats.historicalSummary || {})}
                </div>
            </div>

            <!-- 🧩 BLOQUE 3: COMPOSICIÓN, TIENDAS & ORIGEN -->
            <div style="margin-bottom:12px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                🧩 3. COMPOSICIÓN — Temas, Tiendas & Orígenes
            </div>

            <div class="bento-grid mb-4">
                <!-- ANÁLISIS POR TEMAS -->
                <div class="bento-card bento-col-6" style="display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:14px;">
                        <h3 style="font-size: 1.1rem; font-family:'Space Grotesk',sans-serif; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="blocks" style="width: 18px; height: 18px; color: #FFC700;"></i> Mis Temas LEGO®
                        </h3>
                        <span style="font-size:0.78rem; color:var(--text-muted); font-family:'IBM Plex Mono',monospace;">${(stats.themesAnalysis || []).length} temáticas</span>
                    </div>

                    <!-- Botones de Ordenación de Temas -->
                    <div style="display:flex; gap:6px; overflow-x:auto; padding-bottom:8px; margin-bottom:12px;" class="custom-scrollbar">
                        <button class="time-range-btn theme-sort-btn ${activeThemeSort === 'value' ? 'active' : ''}" data-sort="value" onclick="StatsView.setThemeSort('value')">
                            + Valor
                        </button>
                        <button class="time-range-btn theme-sort-btn ${activeThemeSort === 'invested' ? 'active' : ''}" data-sort="invested" onclick="StatsView.setThemeSort('invested')">
                            + Inversión
                        </button>
                        <button class="time-range-btn theme-sort-btn ${activeThemeSort === 'profit' ? 'active' : ''}" data-sort="profit" onclick="StatsView.setThemeSort('profit')">
                            + Profit
                        </button>
                        <button class="time-range-btn theme-sort-btn ${activeThemeSort === 'roi' ? 'active' : ''}" data-sort="roi" onclick="StatsView.setThemeSort('roi')">
                            + ROI %
                        </button>
                        <button class="time-range-btn theme-sort-btn ${activeThemeSort === 'sets' ? 'active' : ''}" data-sort="sets" onclick="StatsView.setThemeSort('sets')">
                            + Sets
                        </button>
                    </div>

                    <div id="themes-list-container" style="display:flex; flex-direction:column; gap:10px; flex:1; overflow-y:auto; max-height:340px;" class="custom-scrollbar">
                        ${this.renderThemesListHTML(stats.themesAnalysis || [], activeThemeSort)}
                    </div>
                </div>

                <!-- ADQUISICIONES & ORIGEN -->
                <div class="bento-card bento-col-6" style="display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                        <h3 style="font-size: 1.1rem; font-family:'Space Grotesk',sans-serif; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="gift" style="width: 18px; height: 18px; color: #00D26A;"></i> Análisis de Adquisiciones
                        </h3>
                        <span style="font-size:0.78rem; color:var(--text-muted); font-family:'IBM Plex Mono',monospace;">Origen de Compra</span>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px; flex:1; justify-content:center;">
                        ${this.renderAcquisitionsListHTML(stats.acquisitionsAnalysis || [])}
                    </div>
                </div>

                <!-- TIENDAS & LUGARES DE COMPRA CON HIGHLIGHTS -->
                ${this.renderStoreBreakdownHTML(stats)}

                <!-- GASTO Y SETS POR AÑO -->
                <div class="bento-card bento-col-12">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="calendar" style="width: 18px; height: 18px; color: #0075FF;"></i> Adquisiciones & Gasto por Año
                    </h3>
                    <div id="yearChart" style="width: 100%; min-height: 280px;"></div>
                </div>
            </div>

            <!-- 🏆 BLOQUE 4: RANKINGS & PROTAGONISTAS -->
            <div style="margin-bottom:12px; font-size:0.85rem; font-weight:700; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); display:flex; align-items:center; gap:6px;">
                🏆 4. RANKINGS — Sets Destacados & Mejores Compras
            </div>

            <div class="bento-grid mb-4">
                <div class="bento-card bento-col-12">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                        <h3 style="font-size: 1.15rem; font-family:'Space Grotesk',sans-serif; font-weight:700; display:flex; align-items:center; gap:8px;">
                            <i data-lucide="award" style="width: 20px; height: 20px; color: #FFC700;"></i> Rankings de la Colección
                        </h3>
                    </div>

                    <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom:16px;" class="custom-scrollbar">
                        <button class="ranking-tab-btn ${activeTab === 'profit' ? 'active' : ''}" data-tab="profit" onclick="StatsView.setRankingTab('profit')">
                            💰 Top Profit (€)
                        </button>
                        <button class="ranking-tab-btn ${activeTab === 'roi' ? 'active' : ''}" data-tab="roi" onclick="StatsView.setRankingTab('roi')">
                            📈 Top ROI Inversión (%)
                        </button>
                        <button class="ranking-tab-btn ${activeTab === 'revalPvp' ? 'active' : ''}" data-tab="revalPvp" onclick="StatsView.setRankingTab('revalPvp')">
                            🚀 Revalorización vs PVP (%)
                        </button>
                        <button class="ranking-tab-btn ${activeTab === 'discounts' ? 'active' : ''}" data-tab="discounts" onclick="StatsView.setRankingTab('discounts')">
                            🏷️ Mejores Compras (Ahorro €)
                        </button>
                        <button class="ranking-tab-btn ${activeTab === 'pieces' ? 'active' : ''}" data-tab="pieces" onclick="StatsView.setRankingTab('pieces')">
                            🧱 Más Piezas
                        </button>
                        <button class="ranking-tab-btn ${activeTab === 'expensive' ? 'active' : ''}" data-tab="expensive" onclick="StatsView.setRankingTab('expensive')">
                            💰 Más Caros (P.V.P.)
                        </button>
                    </div>

                    <div id="ranking-panel-profit" class="ranking-panel" style="display:${activeTab === 'profit' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5Profit || [], 'profit')}
                    </div>
                    <div id="ranking-panel-roi" class="ranking-panel" style="display:${activeTab === 'roi' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5Roi || [], 'roi')}
                    </div>
                    <div id="ranking-panel-revalPvp" class="ranking-panel" style="display:${activeTab === 'revalPvp' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5RevaluationPvp || [], 'revalPvp')}
                    </div>
                    <div id="ranking-panel-discounts" class="ranking-panel" style="display:${activeTab === 'discounts' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5Discounts || [], 'discounts')}
                    </div>
                    <div id="ranking-panel-pieces" class="ranking-panel" style="display:${activeTab === 'pieces' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5Pieces || [], 'pieces')}
                    </div>
                    <div id="ranking-panel-expensive" class="ranking-panel" style="display:${activeTab === 'expensive' ? 'block' : 'none'};">
                        ${this.renderRankingTableHTML(stats.rankings?.top5MostExpensive || [], 'expensive')}
                    </div>
                </div>

                <!-- COMPARATIVA P.V.P. vs PAGADO vs VALOR ACTUAL -->
                <div class="bento-card bento-col-12">
                    <h3 style="font-size: 1.1rem; margin-bottom: 16px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="bar-chart-2" style="width: 18px; height: 18px; color: #E3000B;"></i> Comparativa P.V.P. vs Precio Pagado vs Valor Actual (Top 15)
                    </h3>
                    <div id="financialChart" style="width: 100%;"></div>
                </div>

                <!-- PROTAGONISTAS DE LA COLECCIÓN -->
                ${this.renderProtagonistasHTML(stats.rankings || {})}
            </div>
        `;
    },

    renderHistoricalSummaryCardsHTML(hist) {
        return `
            <div class="historic-summary-box mt-3">
                <div class="historic-summary-item">
                    <span class="historic-summary-label">Máximo Histórico</span>
                    <span class="historic-summary-value" style="color:#FFC700;">${(hist.allTimeHighValue || 0).toFixed(2)}€</span>
                </div>
                <div class="historic-summary-item">
                    <span class="historic-summary-label">Valor Actual</span>
                    <span class="historic-summary-value" style="color:var(--text-primary);">${(hist.currentValue || 0).toFixed(2)}€</span>
                </div>
                <div class="historic-summary-item">
                    <span class="historic-summary-label">Dif. vs Máximo</span>
                    <span class="historic-summary-value" style="color:${(hist.diffFromAllTimeHigh || 0) >= 0 ? '#00D26A' : '#FF2A2A'};">
                        ${(hist.diffFromAllTimeHigh || 0) >= 0 ? '+' : ''}${(hist.diffFromAllTimeHigh || 0).toFixed(2)}€ (${(hist.diffPctFromAllTimeHigh || 0).toFixed(1)}%)
                    </span>
                </div>
                <div class="historic-summary-item">
                    <span class="historic-summary-label">Crecimiento desde Origen</span>
                    <span class="historic-summary-value" style="color:${(hist.growthFromFirstSnapshot || 0) >= 0 ? '#00D26A' : '#FF2A2A'};">
                        ${(hist.growthFromFirstSnapshot || 0) >= 0 ? '+' : ''}${(hist.growthFromFirstSnapshot || 0).toFixed(1)}%
                    </span>
                </div>
            </div>
        `;
    },

    renderThemesListHTML(themes, sortKey = 'value') {
        if (!themes || themes.length === 0) {
            return '<div class="text-muted text-center p-3">No hay datos por temática disponibles.</div>';
        }

        let sorted = [...themes];
        if (sortKey === 'value') {
            sorted.sort((a, b) => (b.currentValueTotal || 0) - (a.currentValueTotal || 0));
        } else if (sortKey === 'invested') {
            sorted.sort((a, b) => (b.investedTotal || 0) - (a.investedTotal || 0));
        } else if (sortKey === 'profit') {
            sorted.sort((a, b) => (b.plusvalia || 0) - (a.plusvalia || 0));
        } else if (sortKey === 'roi') {
            sorted.sort((a, b) => (b.roiPercent || 0) - (a.roiPercent || 0));
        } else if (sortKey === 'sets') {
            sorted.sort((a, b) => (b.setsCount || 0) - (a.setsCount || 0));
        }

        const legoColors = ['#FFC700', '#E3000B', '#0075FF', '#00D26A', '#FF6B00', '#A855F7', '#00F0FF'];

        return sorted.map((t, idx) => {
            const color = legoColors[idx % legoColors.length];
            const plusvalia = t.plusvalia || 0;
            const isPos = plusvalia >= 0;
            const roiText = t.roiPercent != null ? `${t.roiPercent >= 0 ? '+' : ''}${t.roiPercent.toFixed(1)}%` : 'N/A';

            return `
                <div style="background:var(--bg-surface-muted); padding:12px 14px; border-radius:12px; border:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="width:10px; height:10px; border-radius:50%; background:${color}; flex-shrink:0;"></span>
                            <span style="font-weight:600; font-size:0.92rem; color:var(--text-primary);">${t.themeName}</span>
                            <span style="font-size:0.72rem; padding:1px 6px; border-radius:4px; background:rgba(255,255,255,0.06); color:var(--text-muted);">${(t.sharePercent || 0).toFixed(1)}% patrimonio</span>
                        </div>
                        <span style="font-family:'IBM Plex Mono',monospace; font-size:0.85rem; color:var(--text-secondary);">${t.setsCount} set${t.setsCount !== 1 ? 's' : ''} (${(t.piecesCount || 0).toLocaleString('es')} pz)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.78rem; color:var(--text-muted); font-family:'IBM Plex Mono',monospace;">
                        <span>Invertido: ${(t.investedTotal || 0).toFixed(2)}€ | Valor: ${(t.currentValueTotal || 0).toFixed(2)}€</span>
                        <span style="color:${isPos ? '#00D26A' : '#FF2A2A'}; font-weight:700;">Profit: ${isPos ? '+' : ''}${plusvalia.toFixed(2)}€ (${roiText})</span>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderAcquisitionsListHTML(acquisitions) {
        const iconMap = { 'PURCHASED': '🛍️', 'GIFT': '🎁', 'PARTIAL': '🤝' };
        const colorMap = { 'PURCHASED': '#00D26A', 'GIFT': '#A855F7', 'PARTIAL': '#FF6B00' };

        return acquisitions.map(a => {
            const icon = iconMap[a.type] || '📦';
            const color = colorMap[a.type] || '#0075FF';
            const plusvalia = a.plusvaliaTotal || 0;
            const isPos = plusvalia >= 0;
            const roiText = a.roiPercent != null ? `${a.roiPercent >= 0 ? '+' : ''}${a.roiPercent.toFixed(1)}%` : 'Regalo (0€)';

            return `
                <div style="background:var(--bg-surface-muted); padding:12px 16px; border-radius:14px; border:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; gap:12px;">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div style="width:38px; height:38px; border-radius:10px; background:${color}1f; color:${color}; display:flex; align-items:center; justify-content:center; font-size:1.15rem; flex-shrink:0;">${icon}</div>
                        <div>
                            <div style="font-weight:600; font-size:0.92rem; color:var(--text-primary);">${a.label}</div>
                            <div style="font-size:0.75rem; color:var(--text-muted);">${a.setsCount} set${a.setsCount !== 1 ? 's' : ''} • PVP: ${(a.retailPriceTotal || 0).toFixed(2)}€</div>
                        </div>
                    </div>
                    <div style="text-align:right; font-family:'IBM Plex Mono',monospace;">
                        <div style="font-size:1.05rem; font-weight:700; color:${color};">${(a.investedTotal || 0).toFixed(2)}€ pagados</div>
                        <div style="font-size:0.75rem; color:${isPos ? '#00D26A' : '#FF2A2A'}; font-weight:600;">Profit: ${isPos ? '+' : ''}${plusvalia.toFixed(2)}€ (${roiText})</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderStoreBreakdownHTML(stats) {
        const stores = stats.storesAnalysis || [];
        if (!stores || stores.length === 0) return '';

        const storeIcons = {
            'LEGO Store': './assets/stores/lego.webp',
            'Amazon': './assets/stores/amazon.webp',
            'Juguettos': './assets/stores/juguettos.webp',
            'Don Dino': './assets/stores/dondino.webp',
            'Carrefour': './assets/stores/carrefour.webp'
        };

        const sortedStores = [...stores].sort((a, b) => (b.investedTotal || 0) - (a.investedTotal || 0));

        const rowsHtml = sortedStores.map(s => {
            const iconUrl = storeIcons[s.storeName];
            const iconHtml = iconUrl 
                ? `<img src="${iconUrl}" alt="${s.storeName}" style="width:22px; height:22px; object-fit:contain; border-radius:4px; flex-shrink:0;">`
                : `<span style="font-size:1.1rem;">🏬</span>`;
            return `
            <div style="background:var(--bg-surface-muted); padding:10px 14px; border-radius:12px; border:1px solid var(--border); display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
                <div style="display:flex; align-items:center; gap:10px;">
                    ${iconHtml}
                    <div>
                        <div style="font-weight:700; font-size:0.9rem; color:var(--text-primary);">${s.storeName}</div>
                        <div style="font-size:0.75rem; color:var(--text-muted);">${s.setsCount} set${s.setsCount !== 1 ? 's' : ''} • PVP: ${(s.retailPriceTotal || 0).toFixed(2)}€</div>
                    </div>
                </div>
                <div style="text-align:right; font-family:'IBM Plex Mono',monospace;">
                    <div style="font-weight:800; font-size:0.95rem; color:var(--accent);">${(s.investedTotal || 0).toFixed(2)}€ invertidos</div>
                    <div style="font-size:0.75rem; color:#00D26A; font-weight:600;">Ahorro: +${(s.savingsTotal || 0).toFixed(2)}€ (-${(s.averageDiscountPercent || 0).toFixed(1)}%)</div>
                </div>
            </div>
            `;
        }).join('');

        let highlightsHtml = '';
        if (stats.topSavingsStoreName || stats.topDiscountStoreName) {
            highlightsHtml = `
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px; margin-bottom:14px;">
                ${stats.topSavingsStoreName ? `
                <div style="background:rgba(0,210,106,0.08); border:1px solid rgba(0,210,106,0.25); padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.3rem;">🏆</span>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Mayor Ahorro Acumulado</div>
                        <div style="font-weight:700; font-size:0.92rem; color:#00D26A;">${stats.topSavingsStoreName} (+${(stats.topSavingsStoreAmount || 0).toFixed(2)}€)</div>
                    </div>
                </div>` : ''}

                ${stats.topDiscountStoreName ? `
                <div style="background:rgba(0,117,255,0.08); border:1px solid rgba(0,117,255,0.25); padding:10px 14px; border-radius:12px; display:flex; align-items:center; gap:10px;">
                    <span style="font-size:1.3rem;">🏷️</span>
                    <div>
                        <div style="font-size:0.72rem; color:var(--text-muted); text-transform:uppercase; font-weight:700;">Mejor Descuento Medio</div>
                        <div style="font-weight:700; font-size:0.92rem; color:#0075FF;">${stats.topDiscountStoreName} (-${(stats.topDiscountStorePct || 0).toFixed(1)}%)</div>
                    </div>
                </div>` : ''}
            </div>`;
        }

        return `
            <div class="bento-card bento-col-12" style="padding:20px;">
                <h3 style="font-size:1.1rem; margin-bottom:14px; display:flex; align-items:center; gap:8px;">
                    <i data-lucide="shopping-bag" style="width:18px;height:18px;color:var(--accent);"></i> Análisis por Tiendas & Lugares de Compra
                </h3>
                ${highlightsHtml}
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap:10px;">
                    ${rowsHtml}
                </div>
            </div>
        `;
    },

    renderRankingTableHTML(items, type) {
        if (!items || items.length === 0) {
            return '<div class="text-muted text-center p-3">No hay suficientes datos registrados para este ranking.</div>';
        }

        const rows = items.map((item, idx) => {
            const setIdShort = item.setId ? item.setId.split('-')[0] : '';
            let metricText = '';

            if (type === 'profit') {
                const p = item.profit || 0;
                metricText = `<span style="color:${p >= 0 ? '#00D26A' : '#FF2A2A'}; font-weight:700;">${p >= 0 ? '+' : ''}${p.toFixed(2)}€</span>`;
            } else if (type === 'roi') {
                const r = item.roiPercent || 0;
                metricText = `<span style="color:${r >= 0 ? '#00D26A' : '#FF2A2A'}; font-weight:700;">${r >= 0 ? '+' : ''}${r.toFixed(1)}%</span>`;
            } else if (type === 'revalPvp') {
                const rp = item.revaluationPvpPercent || 0;
                metricText = `<span style="color:${rp >= 0 ? '#00D26A' : '#FF2A2A'}; font-weight:700;">${rp >= 0 ? '+' : ''}${rp.toFixed(1)}%</span>`;
            } else if (type === 'discounts') {
                const pvp = item.retailPrice || 0;
                const paid = item.purchasePrice || 0;
                const dAmt = item.discountAmount || 0;
                const dPct = item.discountPercent || 0;
                metricText = `
                    <div style="font-size:0.75rem; color:var(--text-muted);">PVP: ${pvp.toFixed(2)}€ → Pagado: ${paid.toFixed(2)}€</div>
                    <div style="color:#0075FF; font-weight:700; font-size:0.88rem;">-${dAmt.toFixed(2)}€ (-${dPct.toFixed(0)}%)</div>
                `;
            } else if (type === 'pieces') {
                metricText = `<span style="color:#00D26A; font-weight:700;">${(item.pieces || 0).toLocaleString('es')} pz</span>`;
            } else if (type === 'expensive') {
                metricText = `<span style="color:#FFC700; font-weight:700;">${(item.retailPrice || 0).toFixed(2)}€</span>`;
            }

            return `
                <tr>
                    <td style="padding:10px 8px; border-bottom:1px solid var(--border); text-align:center; font-weight:700; color:var(--text-secondary); width:32px;">${idx + 1}</td>
                    <td style="padding:10px 8px; border-bottom:1px solid var(--border);">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <img src="${item.setImgUrl}" onload="window.UI?.removeWhiteBackground ? window.UI.removeWhiteBackground(this) : null" style="width:34px; height:34px; object-fit:contain; border-radius:4px; flex-shrink:0;">
                            <div>
                                <span style="font-family:'IBM Plex Mono',monospace; font-size:0.75rem; color:var(--text-muted);">#${setIdShort}</span>
                                <div style="font-weight:600; color:var(--text-primary); font-size:0.88rem; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:240px;" title="${item.name}">${item.name}</div>
                            </div>
                        </div>
                    </td>
                    <td style="padding:10px 8px; border-bottom:1px solid var(--border); font-family:'IBM Plex Mono',monospace; text-align:right;">
                        ${metricText}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.88rem;">
                    <thead>
                        <tr style="color:var(--text-secondary); font-size:0.75rem; text-transform:uppercase; letter-spacing:0.5px;">
                            <th style="padding:8px; border-bottom:1px solid var(--border); text-align:center;">#</th>
                            <th style="padding:8px; border-bottom:1px solid var(--border);">Set LEGO®</th>
                            <th style="padding:8px; border-bottom:1px solid var(--border); text-align:right;">Métrica</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows}
                    </tbody>
                </table>
            </div>
        `;
    },

    renderProtagonistasHTML(rankings) {
        const renderCard = (title, setStat, metricVal, color) => {
            if (!setStat) return '';
            const setIdShort = setStat.setId ? setStat.setId.split('-')[0] : '';
            return `
                <div class="featured-set-card" onclick="App.openSetDetails('${setStat.setId}')">
                    <div class="featured-set-img-wrap">
                        <img src="${setStat.setImgUrl}" alt="${setStat.name}" onload="window.UI?.removeWhiteBackground ? window.UI.removeWhiteBackground(this) : null">
                    </div>
                    <div style="padding: 14px;">
                        <div style="display:inline-block; padding: 3px 8px; border-radius: 6px; background: rgba(255,255,255,0.06); color: ${color}; font-size: 0.72rem; font-weight: 700; letter-spacing:0.5px; margin-bottom: 8px; border:1px solid rgba(255,255,255,0.1);">
                            ${title}
                        </div>
                        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; color: var(--text-muted);">#${setIdShort}</div>
                        <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 6px;" title="${setStat.name}">${setStat.name}</div>
                        <div style="font-family: 'IBM Plex Mono', monospace; font-weight: 700; font-size: 1.05rem; color: ${color};">${metricVal}</div>
                    </div>
                </div>
            `;
        };

        return `
            <div class="bento-card bento-col-12">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <div>
                        <h3 style="font-size: 1.25rem; font-family: 'Space Grotesk', sans-serif; font-weight:700;">Los Protagonistas de Mi Colección</h3>
                        <p style="color:var(--text-muted); font-size:0.85rem; margin-top:2px;">Sets destacados por su relevancia en tu vitrina digital</p>
                    </div>
                    <span class="bento-badge-pill"><i data-lucide="star" style="width:13px;height:13px;"></i> Destacados</span>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    ${renderCard("💎 MÁS VALIOSO", rankings.mostValuable, rankings.mostValuable?.currentValue ? `${rankings.mostValuable.currentValue.toFixed(2)}€` : '-', "#FFC700")}
                    ${renderCard("🧱 MÁS GRANDE", rankings.largest, rankings.largest?.pieces ? `${rankings.largest.pieces.toLocaleString('es')} pz` : '-', "#00D26A")}
                    ${renderCard("🚀 MAYOR ROI", rankings.highestRoi, rankings.highestRoi?.roiPercent ? `+${rankings.highestRoi.roiPercent.toFixed(1)}%` : '-', "#A855F7")}
                    ${renderCard("🏷️ MEJOR CPP", rankings.bestCpp, rankings.bestCpp?.cpp ? `${rankings.bestCpp.cpp.toFixed(2)}€/pz` : '-', "#0075FF")}
                    ${renderCard("⏳ MÁS ANTIGUO", rankings.oldest, rankings.oldest?.year ? `Año ${rankings.oldest.year}` : '-', "#FF6B00")}
                </div>
            </div>
        `;
    },

    renderSetDashboardHTML(col) {
        if (!col || col.length === 0) {
            return '<div class="bento-card text-center p-4 text-muted">Añade sets a tu colección para analizarlos individualmente.</div>';
        }

        let selectedSetObj = col.find(s => s.set_num === App.profileState.selectedSetId);
        if (!selectedSetObj) {
            selectedSetObj = col[0];
            App.profileState.selectedSetId = selectedSetObj.set_num;
        }

        const selectedNumShort = selectedSetObj.set_num.split('-')[0];
        const displayLabel = `#${selectedNumShort} - ${selectedSetObj.name}`;

        return `
            <div class="bento-card mb-4" style="padding: 20px; overflow: visible;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <div style="font-size:1.05rem; font-weight:700; font-family:'Space Grotesk',sans-serif; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="search" style="width:18px;height:18px;color:var(--accent);"></i> Selecciona un Set para Análisis Histórico:
                    </div>

                    <!-- Searchable Set Combobox -->
                    <div style="position:relative; flex:1; min-width:280px; max-width:440px;" id="stats-set-picker-wrap">
                        <div style="position:relative; display:flex; align-items:center;">
                            <i data-lucide="search" style="position:absolute; left:12px; width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
                            <input type="text" 
                                id="stats-set-search-input" 
                                class="input-field" 
                                style="padding-left:36px; padding-right:32px; width:100%; font-weight:600;" 
                                placeholder="🔍 Buscar por #ID o nombre..." 
                                value="${displayLabel.replace(/"/g, '&quot;')}"
                                onfocus="StatsView.openSetPickerDropdown()" 
                                oninput="StatsView.filterSetPickerDropdown(this.value)"
                                autocomplete="off" />
                            <i data-lucide="chevron-down" style="position:absolute; right:12px; width:16px; height:16px; color:var(--text-muted); pointer-events:none;"></i>
                        </div>

                        <!-- Floating Results Dropdown -->
                        <div id="stats-set-dropdown-menu" class="custom-scrollbar" style="display:none; position:absolute; top:calc(100% + 6px); left:0; right:0; max-height:290px; overflow-y:auto; background:var(--bg-surface); border:1px solid var(--border-strong); border-radius:14px; box-shadow:0 12px 32px rgba(0,0,0,0.25); z-index:3000; padding:6px;">
                            ${this.renderSetPickerItemsHTML(col, '')}
                        </div>
                    </div>
                </div>
            </div>

            <div id="singleSetContainer">
                <div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Cargando historial del set...</div>
            </div>
        `;
    },

    renderSetPickerItemsHTML(col, filterQuery = '') {
        const q = (filterQuery || '').toLowerCase().trim();
        const filtered = col.filter(s => {
            const setNum = (s.set_num || '').toLowerCase();
            const name = (s.name || '').toLowerCase();
            const theme = (s.theme_name || '').toLowerCase();
            return !q || setNum.includes(q) || name.includes(q) || theme.includes(q);
        });

        if (filtered.length === 0) {
            return '<div style="padding:14px; text-align:center; color:var(--text-muted); font-size:0.85rem;">No se encontraron sets coincidentes</div>';
        }

        const selectedId = App.profileState.selectedSetId;

        return filtered.map(s => {
            const isSel = s.set_num === selectedId;
            const setNumShort = s.set_num.split('-')[0];
            const img = s.set_img_url || 'https://via.placeholder.com/60?text=?';

            return `
            <div class="stats-set-option-item ${isSel ? 'selected' : ''}" 
                 onclick="StatsView.selectSetFromPicker('${s.set_num}', '#${setNumShort} - ${s.name.replace(/'/g, "\\'")}')"
                 style="display:flex; align-items:center; gap:10px; padding:8px 10px; border-radius:8px; cursor:pointer; transition:background 0.15s ease; ${isSel ? 'background:var(--accent-bg); border:1px solid rgba(227,0,11,0.2);' : ''}">
                <img src="${img}" onload="window.UI?.removeWhiteBackground ? window.UI.removeWhiteBackground(this) : null" style="width:32px; height:32px; object-fit:contain; border-radius:4px; flex-shrink:0; background:var(--bg-surface-muted);">
                <div style="flex:1; min-width:0;">
                    <div style="font-weight:600; font-size:0.88rem; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.name}</div>
                    <div style="font-family:'IBM Plex Mono',monospace; font-size:0.72rem; color:var(--text-muted);">#${setNumShort} ${s.theme_name ? '• ' + s.theme_name : ''}</div>
                </div>
                ${isSel ? '<i data-lucide="check" style="width:16px; height:16px; color:var(--accent); flex-shrink:0;"></i>' : ''}
            </div>
            `;
        }).join('');
    },

    openSetPickerDropdown() {
        const menu = document.getElementById('stats-set-dropdown-menu');
        if (menu) {
            menu.style.display = 'block';
            lucide.createIcons();
        }
        setTimeout(() => {
            const closeHandler = (e) => {
                const wrap = document.getElementById('stats-set-picker-wrap');
                if (wrap && !wrap.contains(e.target)) {
                    if (menu) menu.style.display = 'none';
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 50);
    },

    filterSetPickerDropdown(val) {
        const menu = document.getElementById('stats-set-dropdown-menu');
        if (menu) {
            menu.style.display = 'block';
            const col = Storage.getCollection() || [];
            menu.innerHTML = this.renderSetPickerItemsHTML(col, val);
            lucide.createIcons();
        }
    },

    selectSetFromPicker(setNum, labelText) {
        App.profileState.selectedSetId = setNum;
        const input = document.getElementById('stats-set-search-input');
        if (input) input.value = labelText;
        const menu = document.getElementById('stats-set-dropdown-menu');
        if (menu) menu.style.display = 'none';
        this.initSetCharts();
    },

    initCollectionCharts(stats, historyData) {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#F9F8F6' : '#1A1916';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

        if (App.financialChart) { try { App.financialChart.destroy(); } catch (e) { } App.financialChart = null; }
        if (App.yearChart) { try { App.yearChart.destroy(); } catch (e) { } App.yearChart = null; }

        // 1. Timeline Chart (Respetando Rango Temporal 1M, 3M, 6M, 1A, TODO)
        this.renderTimelineChart(stats, historyData, App.profileState.timeRange || 'all');

        // 2. Financial Comparison Chart
        const finList = stats.financialComparison || [];
        if (finList.length > 0 && document.getElementById('financialChart')) {
            const labels = finList.map(f => f.name);
            const pvpData = finList.map(f => f.retailPrice || 0);
            const paidData = finList.map(f => f.purchasePrice || 0);
            const valData = finList.map(f => f.currentValue != null ? f.currentValue : 0);

            App.financialChart = new ApexCharts(document.getElementById('financialChart'), {
                series: [
                    { name: 'P.V.P. Oficial', data: pvpData },
                    { name: 'Precio Pagado', data: paidData },
                    { name: 'Valor Actual', data: valData }
                ],
                chart: { type: 'bar', height: Math.max(340, finList.length * 38), background: 'transparent', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                plotOptions: { bar: { horizontal: true, borderRadius: 5, barHeight: '65%' } },
                colors: ['#A855F7', '#0075FF', '#00D26A'],
                dataLabels: { enabled: false },
                grid: { borderColor: gridColor, strokeDashArray: 4 },
                xaxis: { categories: labels, labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' }, formatter: (v) => `${v.toFixed(0)}€` } },
                yaxis: { labels: { style: { colors: textColor } } },
                tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => `${v.toFixed(2)} €` } },
                theme: { mode: isDark ? 'dark' : 'light' }
            });
            App.financialChart.render();
        }

        // 3. Yearly Chart
        const yearly = stats.yearlyAnalysis || [];
        if (yearly.length > 0 && document.getElementById('yearChart')) {
            const years = yearly.map(y => y.year.toString());
            const spendData = yearly.map(y => y.investedTotal || 0);
            const setsData = yearly.map(y => y.setsCount || 0);

            App.yearChart = new ApexCharts(document.getElementById('yearChart'), {
                series: [
                    { name: 'Inversión (€)', type: 'column', data: spendData },
                    { name: 'Sets Adquiridos', type: 'line', data: setsData }
                ],
                chart: { type: 'line', height: 280, background: 'transparent', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                colors: ['#0075FF', '#FFC700'],
                stroke: { width: [0, 3], curve: 'smooth' },
                plotOptions: { bar: { borderRadius: 8, columnWidth: '40%' } },
                dataLabels: { enabled: false },
                grid: { borderColor: gridColor, strokeDashArray: 4 },
                xaxis: { categories: years, labels: { style: { colors: textColor } } },
                yaxis: [
                    { labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' }, formatter: (v) => `${v.toFixed(0)}€` } },
                    { opposite: true, labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' }, formatter: (v) => `${v.toFixed(0)} sets` } }
                ],
                tooltip: { theme: isDark ? 'dark' : 'light' }
            });
            App.yearChart.render();
        }
    },

    renderTimelineChart(stats, historyData, range = 'all') {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#F9F8F6' : '#1A1916';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

        let rawSnapshots = historyData?.snapshots || [];
        if (rawSnapshots.length === 0) return;

        let filtered = [...rawSnapshots];
        if (range !== 'all') {
            const now = new Date();
            let daysToSubtract = 365;
            if (range === '1M') daysToSubtract = 30;
            else if (range === '3M') daysToSubtract = 90;
            else if (range === '6M') daysToSubtract = 180;
            else if (range === '1A') daysToSubtract = 365;

            const cutoff = new Date(now.getTime() - (daysToSubtract * 24 * 60 * 60 * 1000));
            filtered = rawSnapshots.filter(s => new Date(s.date) >= cutoff);
            if (filtered.length === 0) filtered = rawSnapshots;
        }

        const dates = filtered.map(s => s.date);
        const values = filtered.map(s => s.totalValue || 0);
        const investedVals = filtered.map(s => s.investedValue || 0);

        if (App.timelineChart) { try { App.timelineChart.destroy(); } catch (e) { } App.timelineChart = null; }

        if (document.getElementById('timelineChart')) {
            App.timelineChart = new ApexCharts(document.getElementById('timelineChart'), {
                series: [
                    { name: 'Patrimonio (Valor Actual €)', data: values },
                    { name: 'Inversión Acumulada (€)', data: investedVals }
                ],
                chart: { type: 'area', height: 300, background: 'transparent', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                colors: ['#00D26A', '#0075FF'],
                fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.35, opacityTo: 0.05, stops: [0, 90, 100] } },
                stroke: { curve: 'smooth', width: 3 },
                dataLabels: { enabled: false },
                grid: { borderColor: gridColor, strokeDashArray: 4 },
                xaxis: { categories: dates, labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' } } },
                yaxis: { labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' }, formatter: (v) => `${v.toFixed(0)}€` } },
                tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => `${v.toFixed(2)} €` } }
            });
            App.timelineChart.render();
        }
    },

    async initSetCharts() {
        const container = document.getElementById('singleSetContainer');
        if (!container) return;

        const setId = App.profileState.selectedSetId;
        if (!setId) {
            container.innerHTML = '<div class="text-center p-4 text-muted">Selecciona un set arriba para ver su análisis.</div>';
            return;
        }

        let setHistory = null;
        try {
            setHistory = await API.getSetHistory(setId);
        } catch (e) {
            console.error(e);
        }

        if (!setHistory) {
            container.innerHTML = '<div class="text-center p-4 text-muted">No se pudo obtener la información de este set.</div>';
            return;
        }

        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const textColor = isDark ? '#F9F8F6' : '#1A1916';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)';

        const isGrowthPos = (setHistory.growthAmount || 0) >= 0;
        const pts = setHistory.history || [];

        container.innerHTML = `
            <div class="bento-grid">
                <!-- Single Set Header Hero -->
                <div class="bento-card bento-col-12" style="display:flex; align-items:center; gap:20px; flex-wrap:wrap;">
                    <img src="${setHistory.setImgUrl}" onload="window.UI?.removeWhiteBackground ? window.UI.removeWhiteBackground(this) : null" style="width:100px; height:100px; object-fit:contain; border-radius:12px; background:var(--bg-surface-muted); padding:10px;">
                    <div style="flex:1;">
                        <div style="font-family:'IBM Plex Mono',monospace; font-size:0.85rem; color:var(--text-muted);">#${setId.split('-')[0]}</div>
                        <h3 style="font-size:1.4rem; font-family:'Space Grotesk',sans-serif; font-weight:700;">${setHistory.name}</h3>
                        <div style="margin-top:6px; display:flex; gap:16px; font-size:0.88rem; color:var(--text-secondary); flex-wrap:wrap;">
                            <span>P.V.P. Oficial: <strong style="color:var(--text-primary); font-family:'IBM Plex Mono',monospace;">${(setHistory.retailPrice || 0).toFixed(2)}€</strong></span>
                            <span>Precio Pagado: <strong style="color:var(--text-primary); font-family:'IBM Plex Mono',monospace;">${(setHistory.purchasePrice || 0).toFixed(2)}€</strong></span>
                            <span>Valor Actual: <strong style="color:var(--accent); font-family:'IBM Plex Mono',monospace;">${(setHistory.currentValue || 0).toFixed(2)}€</strong></span>
                        </div>
                    </div>
                </div>

                <!-- 4 Individual KPI Cards -->
                <div class="bento-card bento-col-3" style="border-top:4px solid var(--accent);">
                    <div class="kpi-title">Valor Actual</div>
                    <div class="kpi-value">${(setHistory.currentValue || 0).toFixed(2)}€</div>
                </div>
                <div class="bento-card bento-col-3" style="border-top:4px solid #FFC700;">
                    <div class="kpi-title">Máximo Histórico</div>
                    <div class="kpi-value" style="color:#FFC700;">${(setHistory.allTimeHigh || 0).toFixed(2)}€</div>
                    <div class="kpi-subtext">${setHistory.allTimeHighDate || 'Fecha N/A'}</div>
                </div>
                <div class="bento-card bento-col-3" style="border-top:4px solid #0075FF;">
                    <div class="kpi-title">Mínimo Histórico</div>
                    <div class="kpi-value" style="color:#0075FF;">${(setHistory.allTimeLow || 0).toFixed(2)}€</div>
                    <div class="kpi-subtext">${setHistory.allTimeLowDate || 'Fecha N/A'}</div>
                </div>
                <div class="bento-card bento-col-3" style="border-top:4px solid ${isGrowthPos ? '#00D26A' : '#FF2A2A'};">
                    <div class="kpi-title">Revalorización vs PVP</div>
                    <div class="kpi-value" style="color:${isGrowthPos ? '#00D26A' : '#FF2A2A'};">
                        ${isGrowthPos ? '+' : ''}${(setHistory.growthPct || 0).toFixed(1)}%
                    </div>
                    <div class="kpi-subtext">${isGrowthPos ? '+' : ''}${(setHistory.growthAmount || 0).toFixed(2)}€ neto</div>
                </div>

                <!-- Individual Price Line Chart -->
                <div class="bento-card bento-col-12">
                    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px;">
                        <h3 style="font-size:1.1rem;">Histórico de Precios de #${setId.split('-')[0]}</h3>
                        ${pts.length === 1 ? '<span style="font-size:0.78rem; color:var(--text-muted); background:var(--bg-surface-muted); padding:4px 10px; border-radius:8px; border:1px solid var(--border); display:inline-flex; align-items:center; gap:6px;"><i data-lucide="info" style="width:14px;height:14px;color:var(--accent);"></i> Primer snapshot registrado. La evolución acumulará puntos con cada actualización periódica.</span>' : ''}
                    </div>
                    <div id="singleSetChart" style="width:100%; min-height:300px;"></div>
                </div>
            </div>
        `;

        lucide.createIcons();

        if (pts.length > 0 && document.getElementById('singleSetChart')) {
            const dates = pts.map(p => p.checkedAt);
            const prices = pts.map(p => p.price);

            if (App.singleSetChart) { try { App.singleSetChart.destroy(); } catch(e){} App.singleSetChart = null; }

            App.singleSetChart = new ApexCharts(document.getElementById('singleSetChart'), {
                series: [{ name: 'Precio (€)', data: prices }],
                chart: { type: 'line', height: 300, background: 'transparent', fontFamily: 'Inter, sans-serif', toolbar: { show: false } },
                colors: ['#00D26A'],
                stroke: { curve: 'smooth', width: 3 },
                markers: { size: 5, colors: ['#00D26A'] },
                grid: { borderColor: gridColor, strokeDashArray: 4 },
                xaxis: { categories: dates, labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' } } },
                yaxis: { labels: { style: { colors: textColor, fontFamily: 'IBM Plex Mono, monospace' }, formatter: (v) => `${v.toFixed(2)}€` } },
                tooltip: { theme: isDark ? 'dark' : 'light', y: { formatter: (v) => `${v.toFixed(2)} €` } }
            });
            App.singleSetChart.render();
        }
    }
};
