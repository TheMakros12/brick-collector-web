const SearchView = {
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
                                <span class="page-header-badge" style="color:#0072FF; background:rgba(0,114,255,0.1); border-color:rgba(0,114,255,0.2);">🎯 Búsqueda por ID</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Escribe el ID exacto del set y pulsa Enter o Buscar para obtener su ficha oficial
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Main Direct Search Bar -->
                <div class="toolbar-container" style="padding: 16px;">
                    <form onsubmit="event.preventDefault(); SearchView.performSearch();" style="display: flex; gap: 10px; width: 100%;">
                        <div class="input-group" style="margin-bottom: 0; position: relative; flex: 1;">
                            <i data-lucide="search" style="position: absolute; left: 16px; top: 50%; transform: translateY(-50%); width: 22px; height: 22px; color: var(--text-muted); pointer-events: none;"></i>
                            <input type="text" id="search-input" class="input-field" style="padding-left: 50px; padding-right: 42px; font-size: 1.05rem; height: 52px; border-radius: 14px;" placeholder="Escribe el ID del set (ej. 42172, 10307, 75375...)" value="${App.searchState.query || ''}" oninput="SearchView.onInputChange(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault(); SearchView.performSearch();}">
                            ${App.searchState.query ? `<button type="button" style="position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer; padding: 4px;" onclick="SearchView.clearSearch()"><i data-lucide="x-circle" style="width: 20px; height: 20px;"></i></button>` : ''}
                        </div>
                        <button type="submit" class="btn btn-primary" style="height: 52px; border-radius: 14px; padding: 0 24px; font-weight: 600; white-space: nowrap; display: flex; align-items: center; gap: 8px;">
                            <i data-lucide="search" style="width: 18px; height: 18px;"></i> Buscar
                        </button>
                    </form>
                </div>

                <!-- Search Results Area -->
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
        const hasSearched = App.searchState.hasSearched || false;

        if (!hasSearched || !query) {
            return `
                <div class="text-center text-muted p-5" style="background: var(--bg-surface); border-radius: 16px; border: 1px dashed var(--border); margin-top: 20px;">
                    <i data-lucide="search-code" style="width: 48px; height: 48px; margin-bottom: 12px; opacity: 0.4; color: var(--accent);"></i>
                    <h3 style="font-size: 1.1rem; font-weight: 600; color: var(--text-primary); margin-bottom: 4px;">Consulta Directa por ID de Set</h3>
                    <p style="font-size: 0.88rem; max-width: 380px; margin: 0 auto; color: var(--text-secondary);">
                        Escribe el número/ID del set de LEGO® (ej. 42172, 10307, 75375) y pulsa <strong>Enter</strong> o el botón <strong>Buscar</strong>.
                    </p>
                </div>
            `;
        }

        if (results.length === 0) {
            return `
                <div class="text-center text-muted p-5" style="background: var(--bg-surface); border-radius: 16px; border: 1px solid var(--border); margin-top: 20px;">
                    <i data-lucide="alert-circle" style="width: 48px; height: 48px; margin-bottom: 12px; color: #FF2A2A; opacity: 0.8;"></i>
                    <h3 style="font-size: 1.1rem; font-weight: 700; color: #FF2A2A; margin-bottom: 6px;">ID de set incorrecto o no encontrado</h3>
                    <p style="font-size: 0.88rem; max-width: 420px; margin: 0 auto; color: var(--text-secondary);">
                        No se ha encontrado ningún set de LEGO® con el ID "<strong>${query}</strong>". Por favor, verifica el número e inténtalo de nuevo.
                    </p>
                </div>
            `;
        }

        return results.map(s => UI.createLegoCard(s, 'search')).join('');
    },

    onInputChange(val) {
        App.searchState.query = val;
    },

    clearSearch() {
        const input = document.getElementById('search-input');
        if (input) input.value = '';
        App.searchState.query = '';
        App.searchState.results = [];
        App.searchState.hasSearched = false;
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
            App.searchState.hasSearched = false;
            resultsContainer.innerHTML = this.renderResultsHtml();
            lucide.createIcons();
            return;
        }

        resultsContainer.innerHTML = `<div class="text-center p-5"><i data-lucide="loader" class="spin" style="width: 28px; height: 28px; color: var(--accent);"></i><div style="font-size: 0.9rem; margin-top: 8px; color: var(--text-muted);">Consultando ficha oficial del set ${query}...</div></div>`;
        lucide.createIcons();

        let exactSet = null;
        try {
            // 1. Consulta directa por ID de set a Rebrickable/Backend
            exactSet = await API.getSetDetails(query);

            // 2. Si no responde por id directo y no contenia guion, probar añadiendo -1
            if (!exactSet && !query.includes('-')) {
                exactSet = await API.getSetDetails(query + '-1');
            }

            // 3. Si tampoco responde directo, buscar en catalogo general y filtrar EXCLUSIVAMENTE coincidencia exacta de ID
            if (!exactSet) {
                const searchResults = await API.searchSets(query);
                if (searchResults && searchResults.length > 0) {
                    const cleanQ = query.replace('-1', '').trim().toLowerCase();
                    exactSet = searchResults.find(s => {
                        const sid = (s.set_num || s.setId || '').replace('-1', '').trim().toLowerCase();
                        return sid === cleanQ;
                    });
                }
            }
        } catch (e) {
            console.error("Error buscando el set por ID:", e);
        }

        App.searchState.hasSearched = true;
        App.searchState.results = exactSet ? [exactSet] : [];
        resultsContainer.innerHTML = this.renderResultsHtml();
        lucide.createIcons();
    }
};
