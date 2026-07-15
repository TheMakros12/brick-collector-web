const App = {
    currentView: 'login',
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
        themeFilter: 'all'
    },

    init() {
        API.loadAllThemes(); // Load themes mapping in background
        const user = Storage.getUser();
        
        // Navigation Listeners
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                App.navigate(view);
            });
        });

        if (user) {
            App.navigate('search');
        } else {
            App.navigate('login');
        }
    },

    navigate(view) {
        this.currentView = view;
        const main = document.getElementById('main-content');
        const nav = document.getElementById('main-nav');
        
        // Update nav active state
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        if (view === 'login') {
            nav.classList.add('hidden');
            this.renderLogin(main);
        } else {
            nav.classList.remove('hidden');
            if (view === 'search') this.renderSearch(main);
            else if (view === 'collection') this.renderCollection(main);
            else if (view === 'profile') this.renderProfile(main);
        }
        
        lucide.createIcons();
    },

    // --- LOGIN VIEW ---
    renderLogin(container) {
        container.innerHTML = `
            <div class="view-container" style="display: flex; flex-direction: column; justify-content: center; min-height: 80vh;">
                <div class="text-center mb-4">
                    <h1 style="color: var(--text-primary); font-family: 'Space Grotesk', sans-serif; font-size: 2rem;">BrickCollector</h1>
                    <p style="color: var(--text-muted);">Tu colección de Legos, organizada.</p>
                </div>
                <form id="login-form" style="background: var(--bg-card); padding: 30px; border-radius: var(--radius-lg); border: 1px solid var(--border); max-width: 400px; margin: 0 auto; width: 100%;">
                    <div class="input-group">
                        <label>Nombre</label>
                        <input type="text" id="login-name" class="input-field" required>
                    </div>
                    <div class="input-group">
                        <label>Apellidos</label>
                        <input type="text" id="login-last" class="input-field" required>
                    </div>
                    <div class="input-group">
                        <label>Email</label>
                        <input type="email" id="login-email" class="input-field" required>
                    </div>
                    <button type="submit" class="btn w-full mt-4">Entrar a mi Colección</button>
                </form>
            </div>
        `;

        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            btn.innerHTML = '<i data-lucide="loader" class="spin"></i> Cargando datos...';
            lucide.createIcons();
            const user = {
                name: document.getElementById('login-name').value,
                lastName: document.getElementById('login-last').value,
                email: document.getElementById('login-email').value,
            };
            await Storage.saveUser(user);
            App.navigate('search');
        });
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
    addFromSearch(setId, target) {
        const set = this.searchState.results.find(s => s.set_num === setId);
        if (set) {
            if (target === 'collection') {
                const added = Storage.addToCollection(set);
                if (added) {
                    UI.showToast('Añadido a Colección', 'success');
                    // Automatically open the details modal so they can fill purchase info
                    App.openSetDetails(setId);
                }
                else UI.showToast('El set ya está en tu colección', 'info');
            } else {
                const added = Storage.addToWishlist(set);
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
            filteredItems.sort((a,b) => (b.estimated_price || 0) - (a.estimated_price || 0));
        } else if (this.collectionState.sortBy === 'year') {
            filteredItems.sort((a,b) => (b.year || 0) - (a.year || 0));
        }

        // Calculate unique themes for the dropdown
        const uniqueThemes = [...new Set(items.map(i => i.theme_id).filter(id => id))];
        const themeOptions = uniqueThemes.map(id => 
            `<option value="${id}" ${this.collectionState.themeFilter == id ? 'selected' : ''}>${API.getThemeName(id)}</option>`
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
                <div class="flex gap-2 mb-4">
                    <select id="local-theme" class="input-field flex-1" onchange="App.updateCollectionThemeFilter(this.value)">
                        <option value="all">Todas las categorías</option>
                        ${themeOptions}
                    </select>
                    <select id="local-sort" class="input-field flex-1" onchange="App.updateCollectionSort(this.value)">
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
        
        if (this.collectionState.sortBy === 'pieces') {
            filteredItems.sort((a,b) => (b.num_parts || 0) - (a.num_parts || 0));
        } else if (this.collectionState.sortBy === 'price') {
            filteredItems.sort((a,b) => (b.estimated_price || 0) - (a.estimated_price || 0));
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

    removeFromCollection(setId) {
        if(confirm("¿Eliminar de la colección?")) {
            Storage.removeFromCollection(setId);
            this.renderCollection(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    removeFromWishlist(setId) {
        if(confirm("¿Eliminar de la lista de deseos?")) {
            Storage.removeFromWishlist(setId);
            this.renderCollection(document.getElementById('main-content'));
            lucide.createIcons();
        }
    },
    moveWishlistToCollection(setId) {
        const set = Storage.getWishlist().find(s => s.set_num === setId);
        if (set) {
            Storage.moveToCollection(set);
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
    exportPDF() {
        const isCol = this.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        if(items.length === 0) return UI.showToast("La lista está vacía.", "error");
        
        const container = document.createElement('div');
        container.style.padding = "20px";
        container.style.fontFamily = "sans-serif";
        container.innerHTML = `
            <h1 style="color: #0F172A; text-align: center;">${isCol ? 'Mi Colección de Legos' : 'Mi Lista de Deseos de Legos'}</h1>
            <p style="text-align: center;">Total de sets: ${items.length}</p>
            <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
                <tr style="background: #FFCF00; border: 1px solid #000;">
                    <th style="padding: 10px; border: 1px solid #000;">ID</th>
                    <th style="padding: 10px; border: 1px solid #000;">Nombre</th>
                    <th style="padding: 10px; border: 1px solid #000;">Piezas</th>
                    <th style="padding: 10px; border: 1px solid #000;">Precio Est.</th>
                </tr>
                ${items.map(i => `
                <tr>
                    <td style="padding: 8px; border: 1px solid #000; text-align: center;">${i.set_num.split('-')[0]}</td>
                    <td style="padding: 8px; border: 1px solid #000;">${i.name}</td>
                    <td style="padding: 8px; border: 1px solid #000; text-align: center;">${i.num_parts || 0}</td>
                    <td style="padding: 8px; border: 1px solid #000; text-align: center;">€${i.estimated_price || 0}</td>
                </tr>
                `).join('')}
            </table>
        `;
        
        const opt = {
            margin: 10,
            filename: isCol ? 'Coleccion_Lego.pdf' : 'Wishlist_Lego.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };
        html2pdf().set(opt).from(container).save();
    },

    // --- PROFILE VIEW ---
    renderProfile(container) {
        const user = Storage.getUser();
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

        col.forEach(s => {
            const p = s.num_parts || 0;
            const v = s.estimated_price || 0;
            const y = s.year || 0;
            totalPieces += p;
            totalValue += v;
            
            if (!largestSet || p > (largestSet.num_parts || 0)) largestSet = s;
            if (!mostValuableSet || v > (mostValuableSet.estimated_price || 0)) mostValuableSet = s;
            if (y > 0 && (!oldestSet || y < (oldestSet.year || 9999))) oldestSet = s;

            if (s.theme_id) {
                themeCounts[s.theme_id] = (themeCounts[s.theme_id] || 0) + 1;
            }
            if (y > 0) {
                yearCounts[y] = (yearCounts[y] || 0) + 1;
            }
            
            let pricePaid = null;
            if (s.purchaseDetails && s.purchaseDetails.pricePaid !== undefined && s.purchaseDetails.pricePaid !== '') {
                pricePaid = parseFloat(s.purchaseDetails.pricePaid);
            }
            
            if (pricePaid !== null && pricePaid > 0) {
                if (p > 0) {
                    const ppp = pricePaid / p;
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

        container.innerHTML = `
            <div class="view-container">
                <div class="text-center mb-4">
                    <div style="width:80px; height:80px; border-radius:50%; background:var(--bg-surface-muted); border:1px solid var(--border); color:var(--text-primary); font-family: 'Space Grotesk', sans-serif; font-size:2rem; font-weight:600; display:flex; align-items:center; justify-content:center; margin:0 auto 10px auto;">
                        ${user.name[0]}${user.lastName[0]}
                    </div>
                    <h2>${user.name} ${user.lastName}</h2>
                    <p class="text-muted" style="color: var(--text-secondary)">${user.email}</p>
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
                                <div class="stat-value" id="stat-value" style="font-family: 'IBM Plex Mono', monospace;">$0</div>
                                <div class="stat-label">Valor Estimado Vitrina</div>
                            </div>
                            <div class="stat-card" style="border-radius: 8px;">
                                <div class="stat-value" style="font-family: 'IBM Plex Mono', monospace; color: ${revalColor};">${avgRevaluation > 0 ? '+' : ''}${avgRevaluation.toFixed(1)}%</div>
                                <div class="stat-label">Revalorización Media</div>
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                        <div>
                            <h3 class="mb-3">Distribución de Temas</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: center;">
                                <canvas id="themeChart" style="max-height: 250px;"></canvas>
                            </div>
                        </div>
                        <div>
                            <h3 class="mb-3">Inversión vs Valor Actual</h3>
                            <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; justify-content: center;">
                                <canvas id="financialChart" style="max-height: 250px;"></canvas>
                            </div>
                        </div>
                    </div>
                    
                    ${Object.keys(yearCounts).length > 0 ? `
                    <div>
                        <h3 class="mb-3">Sets por Año de Lanzamiento</h3>
                        <div style="background: var(--bg-surface-muted); padding: 15px; border-radius: var(--radius-lg); border: 1px solid var(--border);">
                            <canvas id="yearChart" style="max-height: 250px;"></canvas>
                        </div>
                    </div>` : ''}

                    ${col.length > 0 ? `
                    <div>
                        <h3 class="mb-3" style="font-family: 'Space Grotesk', sans-serif;">Tops de Colección</h3>
                        <div style="display: flex; flex-wrap: wrap; gap: 15px;">
                            ${renderHighlight("El Más Grande", largestSet, `<span style="font-family: 'IBM Plex Mono', monospace;">${largestSet?.num_parts}</span> piezas`)}
                            ${renderHighlight("El Más Valioso", mostValuableSet, `<span style="font-family: 'IBM Plex Mono', monospace;">€${mostValuableSet?.estimated_price}</span>`)}
                            ${renderHighlight("El Más Antiguo", oldestSet, `Año <span style="font-family: 'IBM Plex Mono', monospace;">${oldestSet?.year}</span>`)}
                            ${renderHighlight("Mejor Precio/Pieza", bestPricePerPieceSet, bestPricePerPiece !== Infinity ? `<span style="font-family: 'IBM Plex Mono', monospace;">€${bestPricePerPiece.toFixed(2)}</span>/pz` : '-')}
                            ${renderHighlight("Mayor Revalorización", highestRevalSet, highestRevalPct !== -Infinity ? `<span style="font-family: 'IBM Plex Mono', monospace;">+${highestRevalPct.toFixed(1)}%</span>` : '-')}
                        </div>
                    </div>` : ''}

                </div> <!-- End gap container -->

                <div class="mt-5 pt-4" style="border-top: 1px solid var(--border);">
                    <button class="btn btn-danger w-full" onclick="App.clearAllData()">
                        <i data-lucide="alert-triangle"></i> Borrar Todo (Danger Zone)
                    </button>
                    <button class="btn btn-outline w-full mt-2" onclick="App.logout()">
                        <i data-lucide="log-out"></i> Cerrar Sesión
                    </button>
                </div>
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
                obj.innerText = isCurrency ? `$${start.toFixed(2)}` : start;
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
                options: { plugins: { legend: { position: 'right', labels: { color: textColor } } } }
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

        if(Object.keys(yearCounts).length > 0) {
            const ctxYear = document.getElementById('yearChart').getContext('2d');
            const years = Object.keys(yearCounts).sort();
            const data = years.map(y => yearCounts[y]);
            if (App.yearChart) App.yearChart.destroy();
            App.yearChart = new Chart(ctxYear, {
                type: 'bar',
                data: {
                    labels: years,
                    datasets: [{
                        label: 'Sets',
                        data: data,
                        backgroundColor: '#B94324',
                        borderRadius: 4
                    }]
                },
                options: {
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: textColor, stepSize: 1 }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { color: textColor }, grid: { display: false } }
                    }
                }
            });
        }
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
    async openSetDetails(setId) {
        // Try to get from collection first
        let set = Storage.getCollection().find(s => s.set_num === setId);
        let inCol = true;
        
        if (!set) {
            inCol = false;
            // Try wishlist
            set = Storage.getWishlist().find(s => s.set_num === setId);
            if (!set) {
                // Must be from search results
                set = this.searchState.results.find(s => s.set_num === setId);
            }
        }

        if (set) {
            UI.renderSetDetails(set, inCol);
        }
    },

    savePurchaseDetails(setId) {
        const type = document.getElementById('purchase-type').value;
        const price = parseFloat(document.getElementById('purchase-price').value) || 0;
        const year = parseInt(document.getElementById('purchase-year').value) || new Date().getFullYear();

        const set = Storage.getCollection().find(s => s.set_num === setId);
        if (set) {
            set.purchaseDetails = {
                type: type,
                pricePaid: type === 'gift' ? 0 : price,
                purchaseYear: year
            };
            Storage.updateSetInCollection(set);
            UI.showToast("Datos de compra guardados", "success");
            UI.renderSetDetails(set, true);
        }
    },

    async viewPieces(setId) {
        UI.showModal('<div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Cargando piezas...</div>');
        lucide.createIcons();
        const pieces = await API.getSetPieces(setId);
        UI.renderPiecesList(pieces);
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
