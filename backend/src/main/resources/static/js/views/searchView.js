const SearchView = {
    async render(container) {
        const categoriesOptions = [
            '<option value="">Todas las categorías</option>',
            ...API.CATEGORIES.map(c => `<option value="${c.id}" ${App.searchState.category === c.id ? 'selected' : ''}>${c.name}</option>`)
        ].join('');

        const popularChips = [
            { id: '', label: '🔥 Destacados' },
            { id: 'star-wars', label: '🏎️ Star Wars' },
            { id: 'technic', label: '⚙️ Technic' },
            { id: 'icons', label: '👑 Icons / Creator' },
            { id: 'speed-champions', label: '🏎️ Speed Champions' },
            { id: 'harry-potter', label: '🧙‍♂️ Harry Potter' },
            { id: 'city', label: '🏙️ City' }
        ];

        const chipsHtml = popularChips.map(chip => {
            const isActive = (App.searchState.category === chip.id);
            return `<button class="category-chip ${isActive ? 'active' : ''}" data-cat="${chip.id}" onclick="SearchView.quickSearchCategory('${chip.id}')">${chip.label}</button>`;
        }).join('');

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
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Catálogo LEGO®</h2>
                                <span class="page-header-badge" style="color:#0072FF; background:rgba(0,114,255,0.1); border-color:rgba(0,114,255,0.2);">🔍 Búsqueda Global</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Explora la base de datos oficial de Rebrickable por número de set (ej. 10330), nombre o temática
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Integrated Search Toolbar -->
                <div class="toolbar-container">
                    <div class="toolbar-row">
                        <div class="input-group flex-1" style="margin-bottom: 0; min-width: 260px; position: relative;">
                            <i data-lucide="search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-muted); pointer-events: none;"></i>
                            <input type="text" id="search-input" class="input-field" style="padding-left: 42px;" placeholder="Ingresa ID de set o palabras clave..." value="${App.searchState.query}">
                        </div>
                        <select id="search-category" class="input-field" style="min-width: 180px; max-width: 240px;">
                            ${categoriesOptions}
                        </select>
                        <button class="btn" style="border-radius: 12px; padding: 0 24px;" onclick="SearchView.performSearch()">
                            <i data-lucide="search"></i> Buscar
                        </button>
                    </div>

                    <!-- Category Chips -->
                    <div style="margin-top: 6px;">
                        <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">Categorías Populares</div>
                        <div class="filter-chips-scroll">
                            ${chipsHtml}
                        </div>
                    </div>
                </div>

                <div id="search-results" class="mt-4">
                    ${App.searchState.results.length > 0 ?
                App.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('') +
                ((App.searchState.results.length >= 30 && !/^\d+(-1)?$/.test(App.searchState.query)) ? '<button class="btn btn-outline w-full mt-4" onclick="SearchView.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>' : '')
                : `<div class="text-center text-muted p-4"><i data-lucide="compass" style="width:48px;height:48px;margin-bottom:10px;opacity:0.4;"></i><br>Selecciona una categoría o introduce palabras clave para buscar.</div>`}
                </div>
            </div>
        `;

        lucide.createIcons();

        document.getElementById('search-category').addEventListener('change', (e) => {
            App.searchState.category = e.target.value;
            this.performSearch();
        });

        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    },

    quickSearchCategory(catId) {
        App.searchState.category = catId;
        const select = document.getElementById('search-category');
        if (select) select.value = catId;

        document.querySelectorAll('.category-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cat === catId);
        });

        this.performSearch();
    },

    async performSearch() {
        const queryInput = document.getElementById('search-input');
        const categorySelect = document.getElementById('search-category');

        const query = queryInput ? queryInput.value : App.searchState.query;
        const category = categorySelect ? categorySelect.value : App.searchState.category;

        App.searchState.query = query;
        App.searchState.category = category;
        App.searchState.page = 1;

        document.querySelectorAll('.category-chip').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.cat === category);
        });

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Buscando sets...</div>';
        lucide.createIcons();

        let results = [];
        if (/^\d+(-1)?$/.test(query)) {
            const set = await API.getSetDetails(query);
            results = set ? [set] : [];
        } else {
            results = await API.searchSets(query, category);
        }

        App.searchState.results = results;

        if (results.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center text-muted p-4"><i data-lucide="search-x" style="width:48px;height:48px;margin-bottom:10px;opacity:0.4;"></i><br>No se encontraron resultados para los filtros seleccionados.</div>';
        } else {
            let html = results.map(s => UI.createLegoCard(s, 'search')).join('');
            if (!/^\d+(-1)?$/.test(query) && results.length >= 30) {
                html += '<button class="btn btn-outline w-full mt-4" onclick="SearchView.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>';
            }
            resultsContainer.innerHTML = html;
        }
        lucide.createIcons();
    },

    async loadMoreResults() {
        const btn = document.getElementById('load-more-btn');
        if (btn) {
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Cargando...';
            lucide.createIcons();
        }

        App.searchState.page++;
        const newResults = await API.searchSets(App.searchState.query, App.searchState.category, App.searchState.page);

        if (newResults && newResults.length > 0) {
            App.searchState.results = [...App.searchState.results, ...newResults];
            const resultsContainer = document.getElementById('search-results');
            let html = App.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('');
            if (newResults.length >= 30) {
                html += '<button class="btn btn-outline w-full mt-4" onclick="SearchView.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>';
            }
            resultsContainer.innerHTML = html;
            lucide.createIcons();
        } else {
            if (btn) btn.remove();
            UI.showToast("No hay más resultados", "info");
        }
    }
};
