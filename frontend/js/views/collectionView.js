const CollectionView = {
    render(container) {
        const isCol = App.collectionState.tab === 'collection';
        const colList = Storage.getCollection() || [];
        const wishList = Storage.getWishlist() || [];
        const colCount = colList.length;
        const wishCount = wishList.length;
        const items = isCol ? colList : wishList;

        // Filter & Sort items
        let filteredItems = Array.isArray(items) ? [...items] : [];
        if (App.collectionState.searchQuery) {
            const q = App.collectionState.searchQuery.toLowerCase();
            filteredItems = filteredItems.filter(i => i && i.name && (i.name.toLowerCase().includes(q) || (i.set_num && i.set_num.includes(q))));
        }

        if (App.collectionState.sortBy === 'pieces') {
            filteredItems.sort((a, b) => (b.num_parts || 0) - (a.num_parts || 0));
        } else if (App.collectionState.sortBy === 'price') {
            filteredItems.sort((a, b) => (b.retail_price || 0) - (a.retail_price || 0));
        } else if (App.collectionState.sortBy === 'year') {
            filteredItems.sort((a, b) => (b.year || 0) - (a.year || 0));
        }

        // Calculate unique themes for chips
        const uniqueThemes = Array.isArray(items) ? [...new Set(items.map(i => i.theme_id).filter(id => id))] : [];

        const themeChipsHtml = [
            `<button class="category-chip ${App.collectionState.themeFilter === 'all' ? 'active' : ''}" data-cat="all" onclick="CollectionView.updateCollectionThemeFilter('all')">Todas las categorías</button>`,
            ...uniqueThemes.map(id => {
                const isActive = App.collectionState.themeFilter == id;
                return `<button class="category-chip ${isActive ? 'active' : ''}" data-cat="${id}" onclick="CollectionView.updateCollectionThemeFilter('${id}')">${API.getThemeName(id)}</button>`;
            })
        ].join('');

        // Calculate unique purchase years
        const uniqueYears = Array.isArray(items) ? [...new Set(items.map(i => i.purchaseDetails && i.purchaseDetails.purchaseYear).filter(y => y))].sort((a, b) => b - a) : [];
        const yearOptions = uniqueYears.map(y =>
            `<option value="${y}" ${App.collectionState.yearFilter == y ? 'selected' : ''}>Comprado en ${y}</option>`
        ).join('');

        container.innerHTML = `
            <div class="view-container">
                <!-- Header Title Bar -->
                <div class="page-header">
                    <div class="page-header-title-wrap">
                        <div class="page-header-icon" style="background: linear-gradient(135deg, #F5C518, #E3000B);">
                            <i data-lucide="layers" style="width: 26px; height: 26px;"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Mi Colección</h2>
                                <span class="page-header-badge">✨ Vitrina Digital</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Catálogo personal de sets guardados y lista de deseos LEGO®
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn" style="border-radius: 12px;" onclick="CollectionView.exportPDF()">
                            <i data-lucide="send"></i> Enviar PDF
                        </button>
                        ${!isCol ? `<button class="btn btn-outline" style="border-radius: 12px;" onclick="CollectionView.shareWishlist()"><i data-lucide="share-2"></i> Compartir</button>` : ''}
                    </div>
                </div>

                <!-- Segmented Control Tab Switcher -->
                <div class="segmented-control mb-4">
                    <button class="segmented-tab ${isCol ? 'active' : ''}" onclick="CollectionView.setCollectionTab('collection')">
                        <i data-lucide="box" style="width: 16px; height: 16px;"></i>
                        Mi Colección
                        <span class="segmented-count-badge">${colCount}</span>
                    </button>
                    <button class="segmented-tab ${!isCol ? 'active' : ''}" onclick="CollectionView.setCollectionTab('wishlist')">
                        <i data-lucide="heart" style="width: 16px; height: 16px;"></i>
                        Lista de Deseos
                        <span class="segmented-count-badge">${wishCount}</span>
                    </button>
                </div>
                
                <!-- Integrated Toolbar Controls -->
                <div class="toolbar-container">
                    <div class="toolbar-row">
                        <div class="input-group flex-1" style="margin-bottom: 0; min-width: 220px; position: relative;">
                            <i data-lucide="search" style="position: absolute; left: 14px; top: 50%; transform: translateY(-50%); width: 18px; height: 18px; color: var(--text-muted); pointer-events: none;"></i>
                            <input type="text" id="local-search" class="input-field" style="padding-left: 42px;" placeholder="Buscar por número o nombre de set..." value="${App.collectionState.searchQuery}" onkeyup="CollectionView.updateCollectionSearch(this.value)">
                        </div>
                        <select id="local-year" class="input-field" style="min-width: 150px; max-width: 200px;" onchange="CollectionView.updateCollectionYearFilter(this.value)">
                            <option value="all">Cualquier año</option>
                            ${yearOptions}
                        </select>
                        <select id="local-sort" class="input-field" style="min-width: 150px; max-width: 200px;" onchange="CollectionView.updateCollectionSort(this.value)">
                            <option value="default" ${App.collectionState.sortBy === 'default' ? 'selected' : ''}>Orden Original</option>
                            <option value="pieces" ${App.collectionState.sortBy === 'pieces' ? 'selected' : ''}>+ Piezas</option>
                            <option value="price" ${App.collectionState.sortBy === 'price' ? 'selected' : ''}>+ Precio</option>
                            <option value="year" ${App.collectionState.sortBy === 'year' ? 'selected' : ''}>Recientes</option>
                        </select>
                    </div>

                    <div style="margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap;">
                        <div class="filter-chips-scroll flex-1">
                            ${themeChipsHtml}
                        </div>
                        <div class="filter-chips-scroll">
                            <button class="category-chip ${App.collectionState.retiredFilter === 'all' ? 'active' : ''}" data-ret="all" onclick="CollectionView.updateCollectionRetiredFilter('all')">Todos</button>
                            <button class="category-chip ${App.collectionState.retiredFilter === 'retired' ? 'active' : ''}" data-ret="retired" onclick="CollectionView.updateCollectionRetiredFilter('retired')">🔒 Descatalogados (EOL)</button>
                            <button class="category-chip ${App.collectionState.retiredFilter === 'active' ? 'active' : ''}" data-ret="active" onclick="CollectionView.updateCollectionRetiredFilter('active')">🛒 En Catálogo</button>
                        </div>
                    </div>
                </div>

                <div id="collection-list">
                    ${filteredItems.length > 0 ?
                filteredItems.map(s => UI.createLegoCard(s, App.collectionState.tab)).join('')
                : `<div class="text-center text-muted p-4"><i data-lucide="package-open" style="width:48px;height:48px;margin-bottom:10px;opacity:0.4;"></i><br>La lista está vacía o no hay coincidencias.</div>`}
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    setCollectionTab(tab) {
        App.collectionState.tab = tab;
        this.render(document.getElementById('main-content'));
        lucide.createIcons();
    },

    updateCollectionListOnly() {
        const isCol = App.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();

        let filteredItems = items;
        if (App.collectionState.searchQuery) {
            const q = App.collectionState.searchQuery.toLowerCase();
            filteredItems = items.filter(i => i.name.toLowerCase().includes(q) || i.set_num.startsWith(q));
        }

        if (App.collectionState.themeFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.theme_id == App.collectionState.themeFilter);
        }

        if (App.collectionState.retiredFilter === 'retired') {
            filteredItems = filteredItems.filter(i => i.retired === true);
        } else if (App.collectionState.retiredFilter === 'active') {
            filteredItems = filteredItems.filter(i => i.retired === false);
        }

        if (App.collectionState.yearFilter && App.collectionState.yearFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.purchaseDetails && i.purchaseDetails.purchaseYear == App.collectionState.yearFilter);
        }

        if (App.collectionState.sortBy === 'pieces') {
            filteredItems.sort((a, b) => (b.num_parts || 0) - (a.num_parts || 0));
        } else if (App.collectionState.sortBy === 'price') {
            filteredItems.sort((a, b) => (b.retail_price || 0) - (a.retail_price || 0));
        } else if (App.collectionState.sortBy === 'year') {
            filteredItems.sort((a, b) => (b.year || 0) - (a.year || 0));
        }

        const listContainer = document.getElementById('collection-list');
        if (listContainer) {
            listContainer.innerHTML = filteredItems.length > 0 ?
                filteredItems.map(s => UI.createLegoCard(s, App.collectionState.tab)).join('')
                : `<div class="text-center text-muted p-4">La lista está vacía.</div>`;
            lucide.createIcons();
        }
    },

    _debouncedSearch: null,
    updateCollectionSearch(val) {
        App.collectionState.searchQuery = val;
        if (!this._debouncedSearch) {
            this._debouncedSearch = UI.debounce(() => this.updateCollectionListOnly(), 250);
        }
        this._debouncedSearch();
    },
    updateCollectionSort(val) {
        App.collectionState.sortBy = val;
        this.updateCollectionListOnly();
    },
    updateCollectionThemeFilter(val) {
        UI.hapticFeedback('light');
        App.collectionState.themeFilter = val;
        document.querySelectorAll('.filter-chips-scroll .category-chip').forEach(btn => {
            const catId = btn.getAttribute('data-cat');
            btn.classList.toggle('active', catId == val);
        });
        this.updateCollectionListOnly();
    },
    updateCollectionRetiredFilter(val) {
        UI.hapticFeedback('light');
        App.collectionState.retiredFilter = val;
        document.querySelectorAll('.filter-chips-scroll [data-ret]').forEach(btn => {
            const retId = btn.getAttribute('data-ret');
            btn.classList.toggle('active', retId === val);
        });
        this.updateCollectionListOnly();
    },
    updateCollectionYearFilter(val) {
        App.collectionState.yearFilter = val;
        this.updateCollectionListOnly();
    },

    async removeFromCollection(setId) {
        if (confirm("¿Eliminar de la colección?")) {
            await Storage.removeFromCollection(setId);
            App.myPiecesState.allPieces = null; // invalidate pieces cache
            this.render(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    async removeFromWishlist(setId) {
        if (confirm("¿Eliminar de la lista de deseos?")) {
            await Storage.removeFromWishlist(setId);
            this.render(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    async moveWishlistToCollection(setId) {
        const set = Storage.getWishlist().find(s => s.set_num === setId);
        if (set) {
            await Storage.moveToCollection(set);
            this.render(document.getElementById('main-content'));
            lucide.createIcons();
            UI.showToast("Añadido a tu colección", "success");
        }
    },
    shareWishlist() {
        const list = Storage.getWishlist();
        if (list.length === 0) return UI.showToast("La lista está vacía", "error");
        const text = "¡Mira mi Lista de Deseos de Lego!\n\n" + list.map(s => `- ${s.name} (${s.set_num})`).join('\n');
        if (navigator.share) {
            navigator.share({ title: 'Mi Wishlist Lego', text: text });
        } else {
            prompt("Copia este texto para compartir:", text);
        }
    },
    async exportPDF() {
        if (window.PDFGenerator) {
            await window.PDFGenerator.generate();
        } else {
            UI.showToast("El generador PDF no está disponible.", "error");
        }
    }
};
