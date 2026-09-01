const App = {
    currentView: 'search',
    searchState: {
        results: [],
        query: '',
        category: '',
        page: 1
    },
    collectionState: {
        tab: 'collection', // or 'wishlist'
        searchQuery: '',
        sortBy: 'default',
        themeFilter: 'all',
        yearFilter: 'all'
    },
    myPiecesState: {
        allPieces: null,          // cache: null = not loaded, [] = loaded
        colorFilter: 'all',
        setFilter: 'all',
        sortBy: 'quantity',
        loading: false
    },

    async init() {
        API.loadAllThemes(); // Load themes mapping in background
        
        // Navigation Listeners (Top nav & Mobile bottom nav)
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) App.navigate(view);
            });
        });

        // Theme Change Listener
        document.addEventListener('themeChanged', () => {
            if (App.currentView === 'profile') {
                setTimeout(() => {
                    App.renderProfile(document.getElementById('main-content'));
                }, 50);
            }
        });

        // Automatically unregister any old stuck Service Workers
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(registrations => {
                for (let reg of registrations) {
                    reg.unregister();
                }
            }).catch(err => {
                console.log('SW unregister note:', err);
            });
        }

        // Initial load
        await Storage.fetchAll();

        App.navigate('search');
    },

    navigate(view) {
        this.currentView = view;
        const main = document.getElementById('main-content');
        const nav = document.getElementById('main-nav');
        const mobileNav = document.getElementById('mobile-bottom-nav');
        
        // Update nav active state (both top and bottom mobile nav)
        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        if (nav) nav.classList.remove('hidden');
        if (mobileNav) mobileNav.classList.remove('hidden');

        if (view === 'search') this.renderSearch(main);
        else if (view === 'collection') this.renderCollection(main);
        else if (view === 'pieces') this.renderMyPieces(main);
        else if (view === 'profile') this.renderProfile(main);
        
        lucide.createIcons();
    },

    // --- SEARCH VIEW ---
    async renderSearch(container) {
        const categoriesOptions = [
            '<option value="">Todas las categorías</option>',
            ...API.CATEGORIES.map(c => `<option value="${c.id}" ${this.searchState.category === c.id ? 'selected' : ''}>${c.name}</option>`)
        ].join('');

        container.innerHTML = `
            <div class="view-container">
                <h2 class="mb-4">Buscar Legos</h2>
                <div class="input-group">
                    <select id="search-category" class="input-field mb-4">
                        ${categoriesOptions}
                    </select>
                </div>
                <div class="input-group" style="flex-direction: row; gap: 10px;">
                    <input type="text" id="search-input" class="input-field" placeholder="ID del set o nombre..." style="flex: 1;" value="${this.searchState.query}">
                    <button class="btn" onclick="App.performSearch()">
                        <i data-lucide="search"></i>
                    </button>
                </div>
                <div id="search-results" class="mt-4">
                    ${this.searchState.results.length > 0 ? 
                        this.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('') + 
                        ((this.searchState.results.length >= 30 && !/^\d+(-1)?$/.test(this.searchState.query)) ? '<button class="btn btn-outline w-full mt-4" onclick="App.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>' : '') 
                        : '<div class="text-center text-muted mt-4">Busca tu próximo set de Lego.</div>'}
                </div>
            </div>
        `;

        document.getElementById('search-category').addEventListener('change', (e) => {
            this.searchState.category = e.target.value;
            this.performSearch();
        });
        
        document.getElementById('search-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.performSearch();
        });
    },

    async performSearch() {
        const query = document.getElementById('search-input').value;
        const category = document.getElementById('search-category').value;
        
        this.searchState.query = query;
        this.searchState.category = category;
        this.searchState.page = 1;

        const resultsContainer = document.getElementById('search-results');
        resultsContainer.innerHTML = '<div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Buscando...</div>';
        lucide.createIcons();

        // If it's a specific ID search (numbers and optional dash)
        if (/^\d+(-1)?$/.test(query)) {
            const set = await API.getSetDetails(query);
            if (set) {
                this.searchState.results = [set];
            } else {
                this.searchState.results = [];
            }
        } else {
            this.searchState.results = await API.searchSets(query, category);
        }

        if (this.searchState.results.length === 0) {
            resultsContainer.innerHTML = '<div class="text-center text-muted p-4">No se encontraron resultados.</div>';
        } else {
            let html = this.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('');
            if (!/^\d+(-1)?$/.test(query) && this.searchState.results.length >= 30) {
                html += '<button class="btn btn-outline w-full mt-4" onclick="App.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>';
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

        this.searchState.page++;
        const newResults = await API.searchSets(this.searchState.query, this.searchState.category, this.searchState.page);
        
        if (newResults && newResults.length > 0) {
            this.searchState.results = [...this.searchState.results, ...newResults];
            const resultsContainer = document.getElementById('search-results');
            let html = this.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('');
            if (newResults.length >= 30) {
                html += '<button class="btn btn-outline w-full mt-4" onclick="App.loadMoreResults()" id="load-more-btn">Cargar Más Resultados</button>';
            }
            resultsContainer.innerHTML = html;
            lucide.createIcons();
        } else {
            if (btn) btn.remove();
            UI.showToast("No hay más resultados", "info");
        }
    },

    // --- ACTIONS FROM CARDS ---
    async addFromSearch(setId, target) {
        const set = this.searchState.results.find(s => s.set_num === setId);
        if (set) {
            if (target === 'collection') {
                const exists = Storage.getCollection().find(s => s.set_num === set.set_num);
                if (exists) {
                    UI.showToast('El set ya está en tu colección', 'info');
                } else {
                    this.pendingAddSet = set; // Store temporarily for modal
                    App.openSetDetails(setId, true);
                }
            } else {
                const added = await Storage.addToWishlist(set);
                if (added) UI.showToast('Añadido a Lista de Deseos', 'success');
                else UI.showToast('El set ya está en tu lista de deseos', 'info');
            }
        }
    },

    // --- COLLECTION VIEW ---
    renderCollection(container) {
        const isCol = this.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        
        // Filter & Sort items
        let filteredItems = items;
        if (this.collectionState.searchQuery) {
            const q = this.collectionState.searchQuery.toLowerCase();
            filteredItems = items.filter(i => i.name.toLowerCase().includes(q) || i.set_num.includes(q));
        }
        
        if (this.collectionState.sortBy === 'pieces') {
            filteredItems.sort((a,b) => (b.num_parts || 0) - (a.num_parts || 0));
        } else if (this.collectionState.sortBy === 'price') {
            filteredItems.sort((a,b) => (b.retail_price || 0) - (a.retail_price || 0));
        } else if (this.collectionState.sortBy === 'year') {
            filteredItems.sort((a,b) => (b.year || 0) - (a.year || 0));
        }

        // Calculate unique themes for the dropdown
        const uniqueThemes = [...new Set(items.map(i => i.theme_id).filter(id => id))];
        const themeOptions = uniqueThemes.map(id => 
            `<option value="${id}" ${this.collectionState.themeFilter == id ? 'selected' : ''}>${API.getThemeName(id)}</option>`
        ).join('');

        // Calculate unique purchase years
        const uniqueYears = [...new Set(items.map(i => i.purchaseDetails && i.purchaseDetails.purchaseYear).filter(y => y))].sort((a,b) => b - a);
        const yearOptions = uniqueYears.map(y => 
            `<option value="${y}" ${this.collectionState.yearFilter == y ? 'selected' : ''}>Comprado en ${y}</option>`
        ).join('');

        container.innerHTML = `
            <div class="view-container">
                <h2 class="mb-4">Mis Legos</h2>
                <div class="flex mb-4 p-1" style="background: var(--bg-surface-muted); border-radius: 12px; border: 1px solid var(--border);">
                    <button class="flex-1 text-center py-2 rounded-md ${isCol ? 'font-bold' : ''}" style="border:none; cursor:pointer; background: ${isCol ? 'var(--accent)' : 'transparent'}; color: ${isCol ? 'var(--bg-surface)' : 'var(--text-secondary)'}; transition: all 0.2s;" onclick="App.setCollectionTab('collection')">Mi Colección</button>
                    <button class="flex-1 text-center py-2 rounded-md ${!isCol ? 'font-bold' : ''}" style="border:none; cursor:pointer; background: ${!isCol ? 'var(--accent)' : 'transparent'}; color: ${!isCol ? 'var(--bg-surface)' : 'var(--text-secondary)'}; transition: all 0.2s;" onclick="App.setCollectionTab('wishlist')">Lista de Deseos</button>
                </div>
                
                <div class="flex gap-2 mb-2">
                    <input type="text" id="local-search" class="input-field flex-1" placeholder="Buscar..." value="${this.collectionState.searchQuery}" onkeyup="App.updateCollectionSearch(this.value)">
                </div>
                <div class="flex gap-2 mb-4" style="flex-wrap: wrap;">
                    <select id="local-theme" class="input-field flex-1" onchange="App.updateCollectionThemeFilter(this.value)" style="min-width: 140px;">
                        <option value="all">Todas las categorías</option>
                        ${themeOptions}
                    </select>
                    <select id="local-year" class="input-field flex-1" onchange="App.updateCollectionYearFilter(this.value)" style="min-width: 140px;">
                        <option value="all">Cualquier año</option>
                        ${yearOptions}
                    </select>
                    <select id="local-sort" class="input-field flex-1" onchange="App.updateCollectionSort(this.value)" style="min-width: 140px;">
                        <option value="default" ${this.collectionState.sortBy === 'default' ? 'selected' : ''}>Orden Original</option>
                        <option value="pieces" ${this.collectionState.sortBy === 'pieces' ? 'selected' : ''}>+ Piezas</option>
                        <option value="price" ${this.collectionState.sortBy === 'price' ? 'selected' : ''}>+ Precio</option>
                        <option value="year" ${this.collectionState.sortBy === 'year' ? 'selected' : ''}>Recientes</option>
                    </select>
                </div>

                <div class="flex gap-2 mb-4">
                    <button class="btn btn-outline flex-1" onclick="App.exportPDF()">
                        <i data-lucide="file-text"></i> Exportar a PDF
                    </button>
                    ${!isCol ? `<button class="btn btn-outline flex-1" onclick="App.shareWishlist()"><i data-lucide="share-2"></i> Compartir</button>` : ''}
                </div>

                <div id="collection-list">
                    ${filteredItems.length > 0 ? 
                        filteredItems.map(s => UI.createLegoCard(s, this.collectionState.tab)).join('') 
                        : `<div class="text-center text-muted p-4">La lista está vacía.</div>`}
                </div>
            </div>
        `;
    },

    setCollectionTab(tab) {
        this.collectionState.tab = tab;
        this.renderCollection(document.getElementById('main-content'));
        lucide.createIcons();
    },
    updateCollectionListOnly() {
        const isCol = this.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        
        let filteredItems = items;
        if (this.collectionState.searchQuery) {
            const q = this.collectionState.searchQuery.toLowerCase();
            filteredItems = items.filter(i => i.name.toLowerCase().includes(q) || i.set_num.startsWith(q));
        }

        if (this.collectionState.themeFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.theme_id == this.collectionState.themeFilter);
        }
        
        if (this.collectionState.yearFilter && this.collectionState.yearFilter !== 'all') {
            filteredItems = filteredItems.filter(i => i.purchaseDetails && i.purchaseDetails.purchaseYear == this.collectionState.yearFilter);
        }
        
        if (this.collectionState.sortBy === 'pieces') {
            filteredItems.sort((a,b) => (b.num_parts || 0) - (a.num_parts || 0));
        } else if (this.collectionState.sortBy === 'price') {
            filteredItems.sort((a,b) => (b.retail_price || 0) - (a.retail_price || 0));
        } else if (this.collectionState.sortBy === 'year') {
            filteredItems.sort((a,b) => (b.year || 0) - (a.year || 0));
        }

        const listContainer = document.getElementById('collection-list');
        if (listContainer) {
            listContainer.innerHTML = filteredItems.length > 0 ? 
                filteredItems.map(s => UI.createLegoCard(s, this.collectionState.tab)).join('') 
                : `<div class="text-center text-muted p-4">La lista está vacía.</div>`;
            lucide.createIcons();
        }
    },

    updateCollectionSearch(val) {
        this.collectionState.searchQuery = val;
        this.updateCollectionListOnly();
    },
    updateCollectionSort(val) {
        this.collectionState.sortBy = val;
        this.updateCollectionListOnly();
    },
    updateCollectionThemeFilter(val) {
        this.collectionState.themeFilter = val;
        this.updateCollectionListOnly();
    },
    updateCollectionYearFilter(val) {
        this.collectionState.yearFilter = val;
        this.updateCollectionListOnly();
    },

    async removeFromCollection(setId) {
        if(confirm("¿Eliminar de la colección?")) {
            await Storage.removeFromCollection(setId);
            this.myPiecesState.allPieces = null; // invalidate pieces cache
            this.renderCollection(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    async removeFromWishlist(setId) {
        if(confirm("¿Eliminar de la lista de deseos?")) {
            await Storage.removeFromWishlist(setId);
            this.renderCollection(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    async moveWishlistToCollection(setId) {
        const set = Storage.getWishlist().find(s => s.set_num === setId);
        if (set) {
            await Storage.moveToCollection(set);
            this.renderCollection(document.getElementById('main-content'));
            lucide.createIcons();
            UI.showToast("Añadido a tu colección", "success");
        }
    },
    shareWishlist() {
        const list = Storage.getWishlist();
        if(list.length === 0) return UI.showToast("La lista está vacía", "error");
        const text = "¡Mira mi Lista de Deseos de Lego!\n\n" + list.map(s => `- ${s.name} (${s.set_num})`).join('\n');
        if (navigator.share) {
            navigator.share({ title: 'Mi Wishlist Lego', text: text });
        } else {
            prompt("Copia este texto para compartir:", text);
        }
    },
    async exportPDF() {
        const isCol = this.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        if(items.length === 0) return UI.showToast("La lista está vacía.", "error");
        
        UI.showToast("Generando PDF, descargando fotos...", "info");
        
        const totalPieces = isCol ? items.reduce((sum, i) => sum + (i.num_parts || 0), 0) : 0;
        
        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString('en-US', dateOptions).toUpperCase();

        const container = document.createElement('div');
        // Fijamos el ancho para que el layout no se rompa al renderizar
        container.style.width = "800px"; 
        container.style.padding = "40px";
        container.style.fontFamily = "'Montserrat', 'Inter', 'Segoe UI', sans-serif";
        container.style.backgroundColor = "#FFFFFF";
        container.style.color = "#000000";
        container.style.position = "relative";
        
        const reportTitle = isCol ? 'LEGO COLLECTION REPORT' : 'LEGO WISHLIST REPORT';
        const totalStats = isCol 
            ? `TOTAL SETS: ${items.length} &nbsp;|&nbsp; TOTAL PIECES: ${totalPieces.toLocaleString()}`
            : `TOTAL SETS: ${items.length}`;

        const headerBg = `
            <div style="position: absolute; top: 0; left: 0; right: 0; height: 180px; background: linear-gradient(135deg, #F0F4F8 0%, #FFFFFF 100%); z-index: 0; opacity: 0.5;"></div>
        `;

        let itemsHtml = items.map(i => {
            const setIdShort = i.set_num.split('-')[0];
            const priceVal = (i.retail_price || 0).toFixed(2);
            
            // Usamos nuestro backend como proxy para saltarnos las restricciones CORS del navegador
            const proxyImg = `http://localhost:8080/api/catalog/proxy-image?url=${encodeURIComponent(i.set_img_url)}`;

            return `
            <div style="display: flex; align-items: center; padding: 25px 0; border-bottom: 1px solid #EAEAEA; page-break-inside: avoid; position: relative; z-index: 1;">
                
                <div style="width: 120px; height: 120px; flex-shrink: 0; background: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 16px; overflow: hidden; display: flex; justify-content: center; align-items: center; padding: 8px; margin-right: 35px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <img src="${proxyImg}" crossorigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                </div>
                
                <div style="flex: 2; display: flex; flex-direction: column; justify-content: center;">
                    <div style="font-size: 20px; font-weight: 800; margin-bottom: 4px;">#${setIdShort}</div>
                    <div style="font-size: 22px; font-weight: 700;">${i.name}</div>
                </div>
                
                <div style="flex: 1.5; display: flex; justify-content: ${isCol ? 'flex-start' : 'flex-end'}; align-items: center; gap: 40px;">
                    ${isCol ? `
                        <div style="display: flex; flex-direction: column;">
                            <div style="font-size: 16px; color: #444; margin-bottom: 6px;">Pieces</div>
                            <div style="font-size: 18px;">${(i.num_parts || 0).toLocaleString()} pcs</div>
                        </div>
                    ` : `
                        <div style="display: flex; flex-direction: column; text-align: left;">
                            <div style="font-size: 16px; color: #444; margin-bottom: 6px;">Estimated</div>
                            <div style="font-size: 18px; font-weight: 800;">€${priceVal}</div>
                        </div>
                    `}
                </div>
                
            </div>
            `;
        }).join('');

        container.innerHTML = `
            ${headerBg}
            <div style="text-align: center; margin-bottom: 25px; position: relative; z-index: 1;">
                <h1 style="margin: 0 0 15px 0; font-size: 32px; font-weight: 400; letter-spacing: 1px; color: #111;">${reportTitle}</h1>
                <div style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">DATE: <span style="font-weight: 400;">${dateString}</span></div>
                <div style="font-size: 14px; font-weight: 700;">${totalStats}</div>
            </div>
            
            <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #EAEAEA; padding-bottom: 10px; margin-bottom: 10px; position: relative; z-index: 1;">
                <div style="background:#E3000B; color:white; font-family:Arial; font-weight:900; font-style:italic; text-shadow:-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000; padding:3px 8px; border:2px solid #000; border-radius:3px; font-size:18px;">LEGO</div>
            </div>
            
            <div style="display: flex; flex-direction: column;">
                ${itemsHtml}
            </div>
            
            <div style="margin-top: 30px; text-align: center; font-size: 14px; color: #888; position: relative; z-index: 1;">
                Lego ${isCol ? 'Collection' : 'Wishlist'} | Detailed Inventory
            </div>
        `;
        
        const opt = {
            margin: [10, 10, 10, 10],
            filename: isCol ? 'Lego_Collection_Report.pdf' : 'Lego_Wishlist_Report.pdf',
            image: { type: 'jpeg', quality: 1 },
            html2canvas: { scale: 2, useCORS: true, backgroundColor: '#FFFFFF' },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        
        try {
            await html2pdf().set(opt).from(container).save();
            UI.showToast("PDF generado con éxito.", "success");
        } catch (e) {
            console.error("Error generating PDF", e);
            UI.showToast("Error al generar PDF", "error");
        }
    },

    // --- PROFILE VIEW ---
    renderProfile(container) {
        const col = Storage.getCollection();
        
        let totalPieces = 0;
        let totalValue = 0;
        let largestSet = null;
        let mostValuableSet = null;
        let oldestSet = null;
        let themeCounts = {};
        let yearCounts = {};
        
        let bestPricePerPieceSet = null;
        let bestPricePerPiece = Infinity;
        
        let highestRevalSet = null;
        let highestRevalPct = -Infinity;
        
        let revalPercentages = [];
        let horizontalChartData = [];

        let top5CPP = [];
        let acquisitionCounts = { 'self': 0, 'gift': 0, 'partial': 0 };
        let purchaseYearSpend = {};
        
        const wish = Storage.getWishlist() || [];
        const wishlistTotalCost = wish.reduce((sum, s) => sum + (s.retail_price || 0), 0);

        // If the Mis Piezas cache is loaded, use it as the source of truth for piece counts
        // (more accurate than num_parts metadata). Otherwise fall back to num_parts.
        const piecesCache = this.myPiecesState.allPieces;
        if (piecesCache && piecesCache.length > 0) {
            totalPieces = piecesCache.reduce((sum, p) => sum + p.quantity, 0);
        }

        col.forEach(s => {
            const p = s.num_parts || 0;
            const v = (s.market_value !== undefined && s.market_value !== null && s.market_value > 0) ? s.market_value : (s.retail_price || 0);
            const y = s.year || 0;
            // Only add to totalPieces from num_parts if cache is NOT available
            if (!piecesCache || piecesCache.length === 0) {
                totalPieces += p;
            }
            totalValue += v;
            
            if (!largestSet || p > (largestSet.num_parts || 0)) largestSet = s;
            const topSetMarketVal = mostValuableSet ? ((mostValuableSet.market_value !== undefined && mostValuableSet.market_value !== null && mostValuableSet.market_value > 0) ? mostValuableSet.market_value : (mostValuableSet.retail_price || 0)) : 0;
            if (!mostValuableSet || v > topSetMarketVal) mostValuableSet = s;
            if (y > 0 && (!oldestSet || y < (oldestSet.year || 9999))) oldestSet = s;

            if (s.theme_id) {
                themeCounts[s.theme_id] = (themeCounts[s.theme_id] || 0) + 1;
            }
            if (y > 0) {
                yearCounts[y] = (yearCounts[y] || 0) + 1;
            }
            
            let pricePaid = null;
            if (s.purchaseDetails) {
                if (s.purchaseDetails.type) acquisitionCounts[s.purchaseDetails.type]++;
                
                if (s.purchaseDetails.pricePaid !== undefined && s.purchaseDetails.pricePaid !== '') {
                    pricePaid = parseFloat(s.purchaseDetails.pricePaid);
                }
                
                if (s.purchaseDetails.purchaseYear && pricePaid !== null) {
                    const py = s.purchaseDetails.purchaseYear;
                    purchaseYearSpend[py] = (purchaseYearSpend[py] || 0) + pricePaid;
                }
            }
            
            if (pricePaid !== null && pricePaid > 0) {
                if (p > 0) {
                    const ppp = pricePaid / p;
                    top5CPP.push({ set: s, cpp: ppp });
                    if (ppp < bestPricePerPiece) {
                        bestPricePerPiece = ppp;
                        bestPricePerPieceSet = s;
                    }
                }
                
                if (v > 0) {
                    const rev = ((v - pricePaid) / pricePaid) * 100;
                    revalPercentages.push(rev);
                    if (rev > highestRevalPct) {
                        highestRevalPct = rev;
                        highestRevalSet = s;
                    }
                }
            }

            if (pricePaid !== null && v > 0) {
                horizontalChartData.push({
                    name: s.name,
                    pricePaid: pricePaid,
                    marketValue: v
                });
            }
        });

        top5CPP.sort((a, b) => a.cpp - b.cpp);
        top5CPP = top5CPP.slice(0, 5);

        horizontalChartData.sort((a, b) => b.marketValue - a.marketValue);
        horizontalChartData = horizontalChartData.slice(0, 15); // Top 15

        const avgRevaluation = revalPercentages.length > 0 
            ? revalPercentages.reduce((a,b)=>a+b,0) / revalPercentages.length 
            : 0;
            
        const revalColor = avgRevaluation > 0 ? 'var(--success)' : 'var(--accent)';

        // Badges Logic
        let badges = [];
        if (col.length >= 1) badges.push({ icon: 'star', text: 'Coleccionista Novato' });
        if (col.length >= 10) badges.push({ icon: 'award', text: 'Gran Coleccionista' });
        if (totalPieces >= 5000) badges.push({ icon: 'hammer', text: 'Maestro Constructor' });
        if (totalValue >= 1000) badges.push({ icon: 'gem', text: 'Vitrina de Lujo' });
        
        const topThemeId = Object.keys(themeCounts).sort((a,b) => themeCounts[b] - themeCounts[a])[0];
        if (topThemeId && themeCounts[topThemeId] >= 3) {
            const themeMap = API.CATEGORIES.find(c => c.rebrickableId == topThemeId);
            if(themeMap) badges.push({ icon: 'heart', text: `Fan de ${themeMap.name}` });
        }

        const badgesHtml = badges.map(b => `<div class="profile-badge"><i data-lucide="${b.icon}"></i> ${b.text}</div>`).join('');

        const renderHighlight = (title, set, subtitle) => set ? `
            <div class="highlight-set-card flex-1">
                <img src="${set.set_img_url}" class="highlight-set-img" alt="Set">
                <div>
                    <div class="highlight-title">${title}</div>
                    <div class="highlight-name">${set.name}</div>
                    <div class="tech-text" style="color: var(--text-secondary); font-size: 0.85rem;">${subtitle}</div>
                </div>
            </div>
        ` : '';

        let cppRows = top5CPP.map((item, index) => `
            <tr>
                <td style="padding:12px 8px; border-bottom:1px solid var(--border);">${index + 1}</td>
                <td style="padding:12px 8px; border-bottom:1px solid var(--border); display:flex; align-items:center; gap:10px;">
                    <img src="${item.set.set_img_url}" style="width:32px; height:32px; object-fit:contain; border-radius:4px; background:transparent;"> 
                    <span style="color: var(--text-secondary); font-family: 'IBM Plex Mono', monospace; font-size: 0.85rem;">${item.set.set_num.split('-')[0]}</span>
                    <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:260px;" title="${item.set.name}">${item.set.name}</span>
                </td>
                <td style="padding:12px 8px; border-bottom:1px solid var(--border); font-family: 'IBM Plex Mono', monospace;">${item.cpp.toFixed(3)}€</td>
            </tr>
        `).join('');

        container.innerHTML = `
            <div class="view-container">
                <div class="text-center mb-4">
                    <div style="width:80px; height:80px; border-radius:50%; background:var(--bg-surface-muted); border:1px solid var(--border); color:var(--text-primary); display:flex; align-items:center; justify-content:center; margin:0 auto 10px auto;">
                        <i data-lucide="user" style="width:40px; height:40px;"></i>
                    </div>
                    <h2>Mi Colección</h2>
                    <div class="badge-container">${badgesHtml}</div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 30px;">
                    <div>
                        <h3 class="mb-3" style="font-family: 'Space Grotesk', sans-serif;">KPIs</h3>
                        <div class="stat-grid" style="grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));">
                            <div class="stat-card" style="border-radius: 8px;">
                                <div class="stat-value" id="stat-sets" style="font-family: 'IBM Plex Mono', monospace;">0</div>
                                <div class="stat-label">Sets Totales</div>
                            </div>
                            <div class="stat-card" style="border-radius: 8px;">
                                <div class="stat-value" id="stat-pieces" style="font-family: 'IBM Plex Mono', monospace;">0</div>
                                <div class="stat-label">Piezas Totales</div>
                            </div>
                            <div class="stat-card" style="border-radius: 8px;">
                                <div class="stat-value" id="stat-value" style="font-family: 'IBM Plex Mono', monospace;">0€</div>
                                <div class="stat-label">Valor Estimado Vitrina</div>
                            </div>
                            <div class="stat-card" style="border-radius: 8px;">
                                <div class="stat-value" style="font-family: 'IBM Plex Mono', monospace; color: ${revalColor};">${avgRevaluation > 0 ? '+' : ''}${avgRevaluation.toFixed(1)}%</div>
                                <div class="stat-label">Revalorización Media</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 class="mb-3">Wishlist vs Colección</h3>
                        <div style="background: var(--bg-surface-muted); padding: 20px; border-radius: var(--radius-lg); border: 1px solid var(--border);">

                            <!-- Two KPI cards side by side -->
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 18px;">
                                <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; border-left: 3px solid var(--accent);">
                                    <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 6px;">Tu Vitrina</div>
                                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 1.35rem; font-weight: bold; color: var(--accent);">${totalValue.toFixed(2)}€</div>
                                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">${col.length} set${col.length !== 1 ? 's' : ''} en colección</div>
                                </div>
                                <div style="background: var(--bg-surface); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 14px 16px; border-left: 3px solid var(--text-muted);">
                                    <div style="font-size: 0.72rem; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 6px;">Coste Wishlist</div>
                                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 1.35rem; font-weight: bold; color: var(--text-secondary);">${wishlistTotalCost.toFixed(2)}€</div>
                                    <div style="font-size: 0.78rem; color: var(--text-secondary); margin-top: 4px;">${Storage.getWishlist().length} set${Storage.getWishlist().length !== 1 ? 's' : ''} deseados</div>
                                </div>
                            </div>

                            <!-- Stacked bar with labels -->
                            ${(totalValue + wishlistTotalCost) > 0 ? (() => {
                                const colPct = Math.round((totalValue / (totalValue + wishlistTotalCost)) * 100);
                                const wisPct = 100 - colPct;
                                return `
                                <div style="margin-bottom: 10px;">
                                    <div style="display: flex; border-radius: var(--radius-md); overflow: hidden; height: 28px; background: var(--bg-surface);">
                                        <div style="width: ${colPct}%; background: var(--accent); display: flex; align-items: center; justify-content: center; transition: width 0.5s ease;">
                                            ${colPct > 10 ? `<span style="font-size:0.72rem; font-weight:700; color:#fff;">${colPct}%</span>` : ''}
                                        </div>
                                        <div style="flex:1; background: var(--border); display: flex; align-items: center; justify-content: center;">
                                            ${wisPct > 10 ? `<span style="font-size:0.72rem; font-weight:700; color: var(--text-secondary);">${wisPct}%</span>` : ''}
                                        </div>
                                    </div>
                                    <div style="display: flex; justify-content: space-between; margin-top: 6px;">
                                        <div style="display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--text-muted);">
                                            <span style="display:inline-block; width:10px; height:10px; border-radius:2px; background: var(--accent);"></span> Colección
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 5px; font-size: 0.75rem; color: var(--text-muted);">
                                            Wishlist <span style="display:inline-block; width:10px; height:10px; border-radius:2px; background: var(--border);"></span>
                                        </div>
                                    </div>
                                </div>
                                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 8px; padding-top: 12px; border-top: 1px solid var(--border); text-align: center;">
                                    ${wishlistTotalCost > 0 
                                        ? `Si completaras tu wishlist, tu inversión total sería <strong style="color: var(--text-primary);">${(totalValue + wishlistTotalCost).toFixed(2)}€</strong>`
                                        : `🎉 ¡Tu wishlist está vacía! Tienes <strong style="color: var(--accent);">${totalValue.toFixed(2)}€</strong> en colección`
                                    }
                                </div>
                                `;
                            })() : ''}
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
                        ${top5CPP.length > 0 ? `
                        <div style="display: flex; flex-direction: column;">
                            <h3 class="mb-3">Top 5: Menor Coste por Pieza</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); overflow-x: auto; flex: 1;">
                                <table style="width:100%; border-collapse:collapse; text-align:left; font-size:0.9rem;">
                                    <thead>
                                        <tr style="color:var(--text-secondary);">
                                            <th style="padding:10px 8px; border-bottom:1px solid var(--border);">#</th>
                                            <th style="padding:10px 8px; border-bottom:1px solid var(--border);">Set</th>
                                            <th style="padding:10px 8px; border-bottom:1px solid var(--border);">CPP</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${cppRows}
                                    </tbody>
                                </table>
                            </div>
                        </div>` : ''}

                        <div style="display: flex; flex-direction: column;">
                            <h3 class="mb-3">Origen de Colección</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: center; align-items: center; flex: 1;">
                                <canvas id="acqChart" style="max-height: 220px;"></canvas>
                            </div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 20px;">
                        ${Object.keys(purchaseYearSpend).length > 0 ? `
                        <div style="display: flex; flex-direction: column;">
                            <h3 class="mb-3">Gasto por Año de Compra</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); flex: 1;">
                                <canvas id="yearChart" style="max-height: 250px;"></canvas>
                            </div>
                        </div>` : ''}

                        <div style="display: flex; flex-direction: column;">
                            <h3 class="mb-3">Distribución de Temas</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: center; flex: 1;">
                                <canvas id="themeChart" style="max-height: 250px;"></canvas>
                            </div>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <h3 class="mb-3">Precio Original vs Valor Actual (Top 15)</h3>
                        <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: center;">
                            <canvas id="financialChart" style="max-height: 350px;"></canvas>
                        </div>
                    </div>
                    
                    ${col.length > 0 ? `
                    <div>
                        <h3 class="mb-3" style="font-family: 'Space Grotesk', sans-serif;">Tops de Colección</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            ${renderHighlight("El Más Grande", largestSet, `<span style="font-family: 'IBM Plex Mono', monospace;">${largestSet?.num_parts}</span> piezas`)}
                            ${renderHighlight("El Más Valioso", mostValuableSet, `<span style="font-family: 'IBM Plex Mono', monospace;">€${(mostValuableSet?.market_value && mostValuableSet?.market_value > 0) ? mostValuableSet.market_value : (mostValuableSet?.retail_price || 0)}</span>`)}
                            ${renderHighlight("El Más Antiguo", oldestSet, `Año <span style="font-family: 'IBM Plex Mono', monospace;">${oldestSet?.year}</span>`)}
                            ${renderHighlight("Mejor Precio/Pieza", bestPricePerPieceSet, bestPricePerPiece !== Infinity ? `<span style="font-family: 'IBM Plex Mono', monospace;">€${bestPricePerPiece.toFixed(2)}</span>/pz` : '-')}
                            ${renderHighlight("Mayor Revalorización", highestRevalSet, highestRevalPct !== -Infinity ? `<span style="font-family: 'IBM Plex Mono', monospace;">+${highestRevalPct.toFixed(1)}%</span>` : '-')}
                        </div>
                    </div>` : ''}

                </div> <!-- End gap container -->
            </div>
        `;

        // Run animations
        const animateValue = (id, end, isCurrency = false) => {
            const obj = document.getElementById(id);
            if (!obj) return;
            let start = 0;
            const duration = 1000;
            const stepTime = Math.abs(Math.floor(duration / (end || 1)));
            const timer = setInterval(() => {
                start += Math.max(1, Math.ceil(end / 30));
                if (start >= end) {
                    start = end;
                    clearInterval(timer);
                }
                obj.innerText = isCurrency ? `${start.toFixed(2)}€` : start;
            }, Math.max(stepTime, 20));
        };

        setTimeout(() => {
            animateValue("stat-sets", col.length);
            animateValue("stat-pieces", totalPieces);
            animateValue("stat-value", totalValue, true);
        }, 100);

        const textColor = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#6B685F';

        if(Object.keys(themeCounts).length > 0) {
            const ctx = document.getElementById('themeChart').getContext('2d');
            const themeNames = Object.keys(themeCounts).map(id => API.getThemeName(id));
            if (App.themeChart) App.themeChart.destroy();
            App.themeChart = new Chart(ctx, {
                type: 'doughnut',
                plugins: [ChartDataLabels],
                data: {
                    labels: themeNames,
                    datasets: [{
                        data: Object.values(themeCounts),
                        backgroundColor: [
                            getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B94324',
                            getComputedStyle(document.documentElement).getPropertyValue('--warning').trim() || '#C97F1D',
                            getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#3F7D5C',
                            '#3B82F6', '#8B5CF6', '#F97316', '#EC4899'
                        ],
                        borderWidth: 0
                    }]
                },
                options: { 
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        datalabels: {
                            color: '#ffffff',
                            font: { weight: 'bold', size: 13 },
                            formatter: (value) => value
                        },
                        legend: { position: window.innerWidth < 480 ? 'bottom' : 'right', labels: { color: textColor } } 
                    } 
                }
            });
        }

        if (Object.keys(acquisitionCounts).some(k => acquisitionCounts[k] > 0)) {
            const ctxAcq = document.getElementById('acqChart').getContext('2d');
            const labelsMap = { 'self': 'Pagado por mí', 'gift': 'Regalo', 'partial': 'Pago compartido' };
            const activeKeys = Object.keys(acquisitionCounts).filter(k => acquisitionCounts[k] > 0);
            
            if (App.acqChart) App.acqChart.destroy();
            App.acqChart = new Chart(ctxAcq, {
                type: 'doughnut',
                plugins: [ChartDataLabels],
                data: {
                    labels: activeKeys.map(k => labelsMap[k]),
                    datasets: [{
                        data: activeKeys.map(k => acquisitionCounts[k]),
                        backgroundColor: ['#3F7D5C', '#8B5CF6', '#F97316'],
                        borderWidth: 0
                    }]
                },
                options: { 
                    maintainAspectRatio: false,
                    plugins: { 
                        datalabels: {
                            color: '#ffffff',
                            font: { weight: 'bold', size: 13 },
                            formatter: (value) => value
                        },
                        legend: { position: 'right', labels: { color: textColor } } 
                    } 
                }
            });
        }

        if(horizontalChartData.length > 0) {
            const ctxFin = document.getElementById('financialChart').getContext('2d');
            const labelsFin = horizontalChartData.map(d => d.name);
            const invData = horizontalChartData.map(d => d.pricePaid);
            const valData = horizontalChartData.map(d => d.marketValue);
            
            const colorAccent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#B94324';
            const colorSuccess = getComputedStyle(document.documentElement).getPropertyValue('--success').trim() || '#3F7D5C';
            
            if (App.financialChart) App.financialChart.destroy();
            App.financialChart = new Chart(ctxFin, {
                type: 'bar',
                data: {
                    labels: labelsFin,
                    datasets: [
                        {
                            label: 'Precio Compra (€)',
                            data: invData,
                            backgroundColor: colorAccent,
                            borderRadius: 4
                        },
                        {
                            label: 'Valor Mercado (€)',
                            data: valData,
                            backgroundColor: colorSuccess,
                            borderRadius: 4
                        }
                    ]
                },
                options: { 
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top', labels: { color: textColor } } },
                    scales: {
                        x: { ticks: { color: textColor }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        y: { ticks: { color: textColor }, grid: { display: false } }
                    }
                }
            });
            
            // Adjust height based on number of items to prevent squishing
            const chartParent = document.getElementById('financialChart').parentElement;
            chartParent.style.height = `${Math.max(250, horizontalChartData.length * 40 + 50)}px`;
            chartParent.style.display = 'block'; // Remove flex to allow height control
            document.getElementById('financialChart').style.maxHeight = 'none';
        }

        if(Object.keys(purchaseYearSpend).length > 0) {
            const ctxYear = document.getElementById('yearChart').getContext('2d');
            const years = Object.keys(purchaseYearSpend).sort();
            const data = years.map(y => purchaseYearSpend[y]);
            if (App.yearChart) App.yearChart.destroy();
            App.yearChart = new Chart(ctxYear, {
                type: 'bar',
                plugins: [ChartDataLabels],
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Gasto (€)',
                        data: data,
                        backgroundColor: '#B94324',
                        borderRadius: 4
                    }]
                },
                options: {
                    plugins: { 
                        legend: { display: false },
                        datalabels: {
                            color: textColor,
                            anchor: 'end',
                            align: 'top',
                            font: { weight: 'bold', size: 12 },
                            formatter: (value) => value.toFixed(2) + '€'
                        }
                    },
                    scales: {
                        y: { ticks: { color: textColor }, grid: { color: 'rgba(0,0,0,0.05)' }, beginAtZero: true },
                        x: { ticks: { color: textColor }, grid: { display: false } }
                    },
                    maintainAspectRatio: false,
                    layout: {
                        padding: {
                            top: 25 // extra space for labels above bars
                        }
                    }
                }
            });
        }
    },

    // --- MY PIECES VIEW ---
    async renderMyPieces(container) {
        const col = Storage.getCollection();

        if (col.length === 0) {
            container.innerHTML = `
                <div class="view-container">
                    <div class="text-center" style="padding: 80px 20px; color: var(--text-muted);">
                        <i data-lucide="puzzle" style="width:64px;height:64px;margin-bottom:16px;opacity:0.4;"></i>
                        <h2 style="font-family:'Space Grotesk',sans-serif;margin-bottom:8px;">Todavía no hay piezas</h2>
                        <p>Añade sets a tu colección y aquí verás todas sus piezas.</p>
                    </div>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        // Show the shell with a loading indicator immediately
        container.innerHTML = `
            <div class="view-container" id="my-pieces-view">
                <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px; margin-bottom:24px;">
                    <div>
                        <h2 style="font-family:'Space Grotesk',sans-serif; font-size:1.75rem; margin-bottom:4px;">Mis Piezas</h2>
                        <p id="pieces-subtitle" style="color:var(--text-muted); font-size:0.9rem;">Cargando inventario completo...</p>
                    </div>
                    <div style="display:flex; align-items:center; gap:12px; flex-wrap:wrap;">
                        <div style="text-align:right;">
                            <div id="pieces-total-count" style="font-family:'IBM Plex Mono',monospace; font-size:1.5rem; font-weight:bold; color:var(--accent); line-height:1;">—</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:2px;">Piezas Totales</div>
                        </div>
                        <div style="text-align:right;">
                            <div id="pieces-unique-count" style="font-family:'IBM Plex Mono',monospace; font-size:1.5rem; font-weight:bold; color:var(--text-secondary); line-height:1;">—</div>
                            <div style="font-size:0.7rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:1px; margin-top:2px;">Tipos Únicos</div>
                        </div>
                    </div>
                </div>

                <!-- FILTERS BAR -->
                <div id="pieces-filters" style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px; padding:16px; background:var(--bg-surface); border:1px solid var(--border); border-radius:var(--radius-lg); opacity:0.5; pointer-events:none;">
                    <select id="filter-set" class="input-field" style="flex:1; min-width:160px;" onchange="App.applyMyPiecesFilters()">
                        <option value="all">Todos los sets</option>
                    </select>
                    <select id="filter-color" class="input-field" style="flex:1; min-width:160px;" onchange="App.applyMyPiecesFilters()">
                        <option value="all">Todos los colores</option>
                    </select>
                    <select id="filter-sort" class="input-field" style="flex:1; min-width:160px;" onchange="App.applyMyPiecesFilters()">
                        <option value="quantity">Más cantidad primero</option>
                        <option value="quantity_asc">Menos cantidad primero</option>
                        <option value="name">Nombre A→Z</option>
                        <option value="color">Color A→Z</option>
                    </select>
                    <button class="btn btn-outline" onclick="App.resetMyPiecesCache()" title="Recargar todas las piezas desde Rebrickable">
                        <i data-lucide="refresh-cw"></i>
                    </button>
                </div>

                <!-- LOADING INDICATOR -->
                <div id="pieces-progress" style="margin-bottom:20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                        <span style="font-size:0.85rem; color:var(--text-muted);" id="progress-text">Descargando piezas de 0 / ${col.length} sets...</span>
                    </div>
                    <div style="height:6px; background:var(--bg-surface-muted); border-radius:var(--radius-pill); overflow:hidden;">
                        <div id="progress-bar" style="height:100%; width:0%; background:var(--accent); border-radius:var(--radius-pill); transition: width 0.3s ease;"></div>
                    </div>
                </div>

                <!-- GRID -->
                <div id="pieces-grid" class="my-pieces-grid"></div>
            </div>
        `;
        lucide.createIcons();

        // If already cached, render immediately
        if (this.myPiecesState.allPieces !== null) {
            this._renderPiecesGrid();
            return;
        }

        // Load all pieces from all sets in parallel (with concurrency limit)
        this.myPiecesState.loading = true;
        const setIds = col.map(s => s.set_num);
        const allRaw = []; // [{piece, setName, setNum}, ...]
        let loaded = 0;

        const concurrency = 3; // fetch up to 3 sets at a time
        const chunks = [];
        for (let i = 0; i < setIds.length; i += concurrency) {
            chunks.push(setIds.slice(i, i + concurrency));
        }

        for (const chunk of chunks) {
            await Promise.all(chunk.map(async (setId) => {
                const setObj = col.find(s => s.set_num === setId);
                const pieces = await API.getSetPieces(setId);
                pieces.forEach(p => allRaw.push({ ...p, _setName: setObj.name, _setNum: setObj.set_num }));
                loaded++;
                // Update progress
                const progressBar = document.getElementById('progress-bar');
                const progressText = document.getElementById('progress-text');
                if (progressBar) progressBar.style.width = `${(loaded / setIds.length) * 100}%`;
                if (progressText) progressText.textContent = `Descargando piezas de ${loaded} / ${setIds.length} sets...`;
            }));
        }

        this.myPiecesState.allPieces = allRaw;
        this.myPiecesState.loading = false;
        this._renderPiecesGrid();
    },

    _renderPiecesGrid() {
        const raw = this.myPiecesState.allPieces || [];

        // Aggregate: group by part_num+color so we sum quantities
        const pieceMap = {};
        raw.forEach(p => {
            const key = `${p.part.part_num}__${p.color ? p.color.id : 0}`;
            if (!pieceMap[key]) {
                pieceMap[key] = {
                    part: p.part,
                    color: p.color,
                    quantity: 0,
                    sets: new Set()
                };
            }
            pieceMap[key].quantity += p.quantity;
            pieceMap[key].sets.add(p._setNum);
        });

        let pieces = Object.values(pieceMap);
        const totalQuantity = pieces.reduce((s, p) => s + p.quantity, 0);

        // Update counters
        const totalEl = document.getElementById('pieces-total-count');
        const uniqueEl = document.getElementById('pieces-unique-count');
        const subtitleEl = document.getElementById('pieces-subtitle');
        const progressDiv = document.getElementById('pieces-progress');

        if (totalEl) totalEl.textContent = totalQuantity.toLocaleString('es');
        if (uniqueEl) uniqueEl.textContent = pieces.length.toLocaleString('es');
        if (subtitleEl) subtitleEl.textContent = `Inventario completo de ${Storage.getCollection().length} set${Storage.getCollection().length !== 1 ? 's' : ''}`;
        if (progressDiv) progressDiv.remove();

        // Build filter options
        const uniqueColors = [...new Set(pieces.map(p => p.color && p.color.name ? p.color.name : 'Unknown'))].sort();
        const col = Storage.getCollection();
        const uniqueSets = col.map(s => ({ num: s.set_num, name: s.name }));

        const colorSelect = document.getElementById('filter-color');
        const setSelect = document.getElementById('filter-set');
        const filtersBar = document.getElementById('pieces-filters');

        if (colorSelect) {
            const savedColor = this.myPiecesState.colorFilter;
            colorSelect.innerHTML = `<option value="all">Todos los colores</option>` +
                uniqueColors.map(c => `<option value="${c}" ${savedColor === c ? 'selected' : ''}>${c}</option>`).join('');
        }
        if (setSelect) {
            const savedSet = this.myPiecesState.setFilter;
            setSelect.innerHTML = `<option value="all">Todos los sets</option>` +
                uniqueSets.map(s => `<option value="${s.num}" ${savedSet === s.num ? 'selected' : ''}>${s.name}</option>`).join('');
        }
        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect) sortSelect.value = this.myPiecesState.sortBy;

        if (filtersBar) {
            filtersBar.style.opacity = '1';
            filtersBar.style.pointerEvents = 'auto';
        }

        this.applyMyPiecesFilters();
    },

    applyMyPiecesFilters() {
        const raw = this.myPiecesState.allPieces || [];

        // Read current filter values from DOM
        const colorSelect = document.getElementById('filter-color');
        const setSelect = document.getElementById('filter-set');
        const sortSelect = document.getElementById('filter-sort');

        const colorFilter = colorSelect ? colorSelect.value : 'all';
        const setFilter = setSelect ? setSelect.value : 'all';
        const sortBy = sortSelect ? sortSelect.value : 'quantity';

        this.myPiecesState.colorFilter = colorFilter;
        this.myPiecesState.setFilter = setFilter;
        this.myPiecesState.sortBy = sortBy;

        // Aggregate
        const pieceMap = {};
        raw.forEach(p => {
            const colorName = p.color && p.color.name ? p.color.name : 'Unknown';
            // Set filter: skip if not from selected set
            if (setFilter !== 'all' && p._setNum !== setFilter) return;
            // Color filter
            if (colorFilter !== 'all' && colorName !== colorFilter) return;

            const key = `${p.part.part_num}__${p.color ? p.color.id : 0}`;
            if (!pieceMap[key]) {
                pieceMap[key] = { part: p.part, color: p.color, colorName, quantity: 0 };
            }
            pieceMap[key].quantity += p.quantity;
        });

        let pieces = Object.values(pieceMap);

        // Sort
        if (sortBy === 'quantity') pieces.sort((a, b) => b.quantity - a.quantity);
        else if (sortBy === 'quantity_asc') pieces.sort((a, b) => a.quantity - b.quantity);
        else if (sortBy === 'name') pieces.sort((a, b) => a.part.name.localeCompare(b.part.name));
        else if (sortBy === 'color') pieces.sort((a, b) => a.colorName.localeCompare(b.colorName));

        const grid = document.getElementById('pieces-grid');
        if (!grid) return;

        if (pieces.length === 0) {
            grid.innerHTML = `<div class="my-pieces-empty"><i data-lucide="search-x" style="width:48px;height:48px;margin-bottom:12px;opacity:0.4;"></i><p>No hay piezas con esos filtros</p></div>`;
            lucide.createIcons();
            return;
        }

        grid.innerHTML = pieces.map(p => {
            const img = p.part.part_img_url || 'https://via.placeholder.com/100?text=?';
            const colorHex = p.color && p.color.rgb ? `#${p.color.rgb}` : null;
            const colorDot = colorHex
                ? `<span class="piece-color-dot" style="background:${colorHex};"></span>`
                : '';
            return `
                <div class="my-piece-card" title="${p.part.name}">
                    <div class="my-piece-img-wrap">
                        <img src="${img}" alt="${p.part.name}" loading="lazy">
                    </div>
                    <div class="my-piece-qty">${p.quantity}x</div>
                    <div class="my-piece-color">${colorDot}<span>${p.colorName}</span></div>
                    <div class="my-piece-num">${p.part.part_num}</div>
                </div>
            `;
        }).join('');
    },

    resetMyPiecesCache() {
        this.myPiecesState.allPieces = null;
        this.myPiecesState.colorFilter = 'all';
        this.myPiecesState.setFilter = 'all';
        this.renderMyPieces(document.getElementById('main-content'));
    },

    clearAllData() {
        if(confirm("¡Peligro! ¿Estás seguro de que quieres borrar TODA tu colección y lista de deseos de este dispositivo?")) {
            Storage.clearAll();
            this.renderProfile(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    logout() {
        Storage.clearUser();
        App.navigate('login');
    },

    // --- MODALS (SET DETAILS & BUILD TRACKER) ---
    async openSetDetails(setId, forceNewPurchase = false) {
        // Try to get from collection first
        let set = Storage.getCollection().find(s => s.set_num === setId);
        let inCol = true;
        
        if (!set) {
            inCol = forceNewPurchase; // If true, we show purchase details anyway
            // Try wishlist
            set = Storage.getWishlist().find(s => s.set_num === setId);
            if (!set) {
                // Must be from search results
                set = this.searchState.results.find(s => s.set_num === setId);
            }
            if (!set && this.pendingAddSet && this.pendingAddSet.set_num === setId) {
                set = this.pendingAddSet;
            }
        }

        if (set) {
            UI.renderSetDetails(set, inCol);
        }
    },

    handlePurchaseTypeChange(selectElem, estimatedPrice) {
        const group = document.getElementById('purchase-price-group');
        const priceInput = document.getElementById('purchase-price');
        
        if (selectElem.value === 'gift') {
            group.style.display = 'none';
            priceInput.value = 0;
        } else {
            group.style.display = 'block';
            if (selectElem.value === 'self') {
                priceInput.value = estimatedPrice;
            } else if (selectElem.value === 'partial') {
                priceInput.value = '';
            }
        }
    },

    async savePurchaseDetails(setId) {
        const type = document.getElementById('purchase-type').value;
        const priceInput = document.getElementById('purchase-price');
        const dateInput = document.getElementById('purchase-date');

        const price = parseFloat(priceInput.value) || 0;
        const acquisitionDate = dateInput.value || new Date().toISOString().split('T')[0];

        let set = Storage.getCollection().find(s => s.set_num === setId);
        let isNew = false;
        
        if (!set && this.pendingAddSet && this.pendingAddSet.set_num === setId) {
            set = this.pendingAddSet;
            isNew = true;
        }

        if (isNew) {
            const added = await Storage.addToCollection(set);
            if (added) {
                const freshItem = Storage.getCollection().find(s => s.set_num === setId);
                if (freshItem && freshItem.itemId) {
                    await Storage.updateSetInCollection(freshItem.itemId, type === 'gift' ? 0 : price, acquisitionDate, type);
                }
                this.pendingAddSet = null;
                this.myPiecesState.allPieces = null;
                UI.showToast("Añadido a Colección con datos de compra", "success");
            }
        } else if (set && set.itemId) {
            await Storage.updateSetInCollection(set.itemId, type === 'gift' ? 0 : price, acquisitionDate, type);
            UI.showToast("Datos de compra actualizados", "success");
        }
        
        UI.closeModal(null, true);
        if (this.currentView === 'collection') {
            this.navigate('collection');
        }
    },

    async viewPieces(setId) {
        UI.showModal('<div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Cargando piezas...</div>');
        lucide.createIcons();
        const pieces = await API.getSetPieces(setId);
        UI.renderPiecesList(pieces);
    },

    handlePurchaseTypeChange(selectElement, defaultPrice) {
        const group = document.getElementById('purchase-price-group');
        const priceInput = document.getElementById('purchase-price');
        if (selectElement.value === 'gift') {
            group.style.display = 'none';
            priceInput.value = 0;
        } else {
            group.style.display = 'block';
            if (selectElement.value === 'self' && (!priceInput.value || priceInput.value == 0)) {
                priceInput.value = defaultPrice;
            }
        }
    }
};

// Initialize App on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

document.addEventListener('themeChanged', () => {
    if (App.currentView === 'profile') {
        const color = getComputedStyle(document.documentElement).getPropertyValue('--text-primary').trim() || '#6B685F';
        
        if (App.themeChart) {
            App.themeChart.options.plugins.legend.labels.color = color;
            App.themeChart.update();
        }
        if (App.yearChart) {
            App.yearChart.options.scales.x.ticks.color = color;
            App.yearChart.options.scales.y.ticks.color = color;
            App.yearChart.update();
        }
    }
});
