const SearchView = {
    _debouncedPerformSearch: null,

    async render(container) {
        container.innerHTML = `
            <div class="view-container">
                <!-- Header Title Bar -->
                <div class="page-header">
                    <div class="page-header-title-wrap">
                        <div class="page-header-icon" style="background: linear-gradient(135deg, #00C6FF, #0072FF);">
                            <i data-lucide="search" style="width: 26px; height: 26px;"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Buscar Set LEGO®</h2>
                                <span class="page-header-badge" style="color:#0072FF; background:rgba(0,114,255,0.1); border-color:rgba(0,114,255,0.2);">⚡ Tiempo Real</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Escribe el número o ID de set para ver la lista de coincidencias en tiempo real
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Direct Search Bar -->
                <div class="toolbar-container" style="padding: 16px;">
                    <div class="input-group" style="margin-bottom: 0; position: relative;">
                        <i data-lucide="search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; color: var(--text-muted); pointer-events: none;"></i>
                        <input type="text" id="search-input" class="input-field" style="padding-left: 50px; padding-right: 42px; font-size: 1.05rem; height: 52px; border-radius: 14px;" placeholder="Escribe el ID de set (ej. 77252, 10307...)" value="${App.searchState.query || ''}" oninput="SearchView.onInputChange(this.value)">
                        ${App.searchState.query ? `<button style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;" onclick="SearchView.clearSearch()"><i data-lucide="x-circle" style="width: 20px; height: 20px;"></i></button>` : ''}
                    </div>
                </div>

                <!-- Real-Time Live Results -->
                <div id="search-results" class="mt-4">
                    ${this.renderResultsHtml()}
                </div>
            </div>
        `;

        lucide.createIcons();
    },

    renderResultsHtml() {
        const query = (App.searchState.query || '').trim();
        const results = App.searchState.results || [];

        if (!query) {
            return `
                <div class="text-center text-muted p-5" style="background: var(--bg-surface); border-radius: 16px; border: 1px dashed var(--border); margin-top: 20px;">
                    <i data-lucide="search-code" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4; color: var(--accent);"></i>
                    <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Búsqueda por Coincidencias de ID</h3>
                    <p style="font-size: 0.88rem; max-width: 320px; margin: 0 auto; color: var(--text-secondary);">
                        Conforme escribes números en la casilla, aparecerá la lista con todas las opciones coincidentes.
                    </p>
                </div>
            `;
        }

        if (results.length === 0) {
            return `
                <div class="text-center text-muted p-5" style="background: var(--bg-surface); border-radius: 16px; border: 1px solid var(--border);">
                    <i data-lucide="search-x" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4;"></i>
                    <h3 style="font-size: 1rem; font-weight: 600; color: var(--text-primary);">No se encontraron coincidencias</h3>
                    <p style="font-size: 0.85rem; margin-top: 4px;">Revisa el número introducido "${query}" e inténtalo de nuevo.</p>
                </div>
            `;
        }

        let html = results.map(s => UI.createLegoCard(s, 'search')).join('');
        if (results.length >= 30) {
            html += '<button class="btn btn-outline w-full mt-4" onclick="SearchView.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>';
        }
        return html;
    },

    onInputChange(val) {
        App.searchState.query = val;
        if (!this._debouncedPerformSearch) {
            this._debouncedPerformSearch = UI.debounce(() => this.performSearch(), 300);
        }
        this._debouncedPerformSearch();
    },

    clearSearch() {
        const input = document.getElementById('search-input');
        if (input) input.value = '';
        App.searchState.query = '';
        App.searchState.results = [];
        const resultsContainer = document.getElementById('search-results');
        if (resultsContainer) {
            resultsContainer.innerHTML = this.renderResultsHtml();
            lucide.createIcons();
        }
    },

    async performSearch() {
        const query = (App.searchState.query || '').trim();
        const resultsContainer = document.getElementById('search-results');
        if (!resultsContainer) return;

        if (!query) {
            App.searchState.results = [];
            resultsContainer.innerHTML = this.renderResultsHtml();
            lucide.createIcons();
            return;
        }

        resultsContainer.innerHTML = '<div class="text-center p-5"><i data-lucide="loader" class="spin" style="width: 28px; height: 28px;"></i><div style="font-size: 0.9rem; margin-top: 8px; color: var(--text-muted);">Buscando coincidencias...</div></div>';
        lucide.createIcons();

        let results = [];
        try {
            // Realizar búsqueda general de catálogo para obtener la lista de coincidencias
            results = await API.searchSets(query);

            // Si es un número de set específico, intentar obtener además la ficha exacta y priorizarla al inicio
            if (/^\d+(-1)?$/.test(query)) {
                const exactSet = await API.getSetDetails(query);
                if (exactSet) {
                    results = [exactSet, ...results.filter(s => s.set_num !== exactSet.set_num)];
                }
            }
        } catch (e) {
            console.error(e);
        }

        App.searchState.results = results;
        resultsContainer.innerHTML = this.renderResultsHtml();
        lucide.createIcons();
    },

    async loadMoreResults() {
        const btn = document.getElementById('load-more-btn');
        if (btn) {
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Cargando...';
            lucide.createIcons();
        }

        App.searchState.page = (App.searchState.page || 1) + 1;
        const newResults = await API.searchSets(App.searchState.query, null, App.searchState.page);

        if (newResults && newResults.length > 0) {
            App.searchState.results = [...App.searchState.results, ...newResults];
            const resultsContainer = document.getElementById('search-results');
            resultsContainer.innerHTML = this.renderResultsHtml();
            lucide.createIcons();
        } else {
            if (btn) btn.remove();
            UI.showToast("No hay más resultados", "info");
        }
    }
};
