const App = {
    currentView: 'login',
    searchState: {
        results: [],
        query: '',
        category: ''
    },
    collectionState: {
        tab: 'collection', // or 'wishlist'
        searchQuery: '',
        sortBy: 'default'
    },

    init() {
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
                    <h1 style="color: var(--primary); font-size: 2rem;">BrickCollector</h1>
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
                    ${this.searchState.results.length > 0 ? this.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('') : '<div class="text-center text-muted mt-4">Busca tu próximo set de Lego.</div>'}
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
            resultsContainer.innerHTML = this.searchState.results.map(s => UI.createLegoCard(s, 'search')).join('');
        }
        lucide.createIcons();
    },

    // --- ACTIONS FROM CARDS ---
    addFromSearch(setId, target) {
        const set = this.searchState.results.find(s => s.set_num === setId);
        if (set) {
            if (target === 'collection') {
                const added = Storage.addToCollection(set);
                if (added) UI.showToast('Añadido a Colección', 'success');
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

        container.innerHTML = `
            <div class="view-container">
                <h2 class="mb-4">Mis Legos</h2>
                <div class="flex mb-4 p-1" style="background: rgba(30, 41, 59, 0.5); border-radius: 12px; border: 1px solid var(--border);">
                    <button class="flex-1 text-center py-2 rounded-md ${isCol ? 'font-bold' : ''}" style="border:none; cursor:pointer; background: ${isCol ? 'var(--primary)' : 'transparent'}; color: ${isCol ? '#000' : 'var(--text-muted)'}; transition: all 0.2s;" onclick="App.setCollectionTab('collection')">Mi Colección</button>
                    <button class="flex-1 text-center py-2 rounded-md ${!isCol ? 'font-bold' : ''}" style="border:none; cursor:pointer; background: ${!isCol ? 'var(--primary)' : 'transparent'}; color: ${!isCol ? '#000' : 'var(--text-muted)'}; transition: all 0.2s;" onclick="App.setCollectionTab('wishlist')">Lista de Deseos</button>
                </div>
                
                <div class="flex gap-2 mb-4">
                    <input type="text" id="local-search" class="input-field flex-1" placeholder="Buscar..." value="${this.collectionState.searchQuery}" onkeyup="App.updateCollectionSearch(this.value)">
                    <select id="local-sort" class="input-field" style="width: 120px;" onchange="App.updateCollectionSort(this.value)">
                        <option value="default" ${this.collectionState.sortBy === 'default' ? 'selected' : ''}>Orden</option>
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
    updateCollectionSearch(val) {
        this.collectionState.searchQuery = val;
        this.renderCollection(document.getElementById('main-content'));
        lucide.createIcons();
        document.getElementById('local-search').focus(); // Keep focus
    },
    updateCollectionSort(val) {
        this.collectionState.sortBy = val;
        this.renderCollection(document.getElementById('main-content'));
        lucide.createIcons();
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
        let themeCounts = {};

        col.forEach(s => {
            const p = s.num_parts || 0;
            const v = s.estimated_price || 0;
            totalPieces += p;
            totalValue += v;
            
            if (!largestSet || p > (largestSet.num_parts || 0)) {
                largestSet = s;
            }

            if (s.theme_id) {
                themeCounts[s.theme_id] = (themeCounts[s.theme_id] || 0) + 1;
            }
        });

        // Resolve top themes (we just have ID, we could fetch names but for simplicity we use ID or known map)
        const sortedThemes = Object.entries(themeCounts).sort((a,b) => b[1] - a[1]).slice(0,3);

        container.innerHTML = `
            <div class="view-container">
                <div class="text-center mb-4">
                    <div style="width:80px; height:80px; border-radius:50%; background:var(--primary); color:black; font-size:2rem; font-weight:bold; display:flex; align-items:center; justify-content:center; margin:0 auto 10px auto;">
                        ${user.name[0]}${user.lastName[0]}
                    </div>
                    <h2>${user.name} ${user.lastName}</h2>
                    <p class="text-muted">${user.email}</p>
                </div>

                <div style="display: flex; flex-direction: column; gap: 30px;">
                    <div>
                        <h3 class="mb-3">Estadísticas Totales</h3>
                <div class="stat-grid">
                    <div class="stat-card">
                        <div class="stat-value">${col.length}</div>
                        <div class="stat-label">Sets Totales</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${totalPieces}</div>
                        <div class="stat-label">Piezas Totales</div>
                    </div>
                    <div class="stat-card" style="grid-column: span 2;">
                        <div class="stat-value">$${totalValue.toFixed(2)}</div>
                        <div class="stat-label">Valor Estimado Vitrina</div>
                        </div>
                    </div>
                    
                    <div>
                        <h3 class="mb-3">Distribución de Temas</h3>
                <div style="background: var(--bg-card); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 25px; display: flex; justify-content: center;">
                    <canvas id="themeChart" style="max-height: 250px;"></canvas>
                    </div>
                    
                    ${largestSet ? `
                    <div>
                        <h3 class="mb-3">El Set más Grande</h3>
                <div style="background: var(--bg-card); padding: 15px; border-radius: var(--radius-md); border: 1px solid var(--border); margin-bottom: 25px; display:flex; gap:15px; align-items:center;">
                    <img src="${largestSet.set_img_url}" style="width:80px; height:80px; object-fit:contain;">
                    <div>
                        <div style="font-weight:bold;">${largestSet.name}</div>
                        <div class="text-primary">${largestSet.num_parts} piezas</div>
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

        if(Object.keys(themeCounts).length > 0) {
            const ctx = document.getElementById('themeChart').getContext('2d');
            const themeNames = Object.keys(themeCounts).map(id => {
                const map = API.CATEGORIES.find(c => c.rebrickableId == id);
                return map ? map.name : `Theme ${id}`;
            });
            new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: themeNames,
                    datasets: [{
                        data: Object.values(themeCounts),
                        backgroundColor: ['#FFCF00', '#E3000B', '#10B981', '#3B82F6', '#8B5CF6', '#F97316', '#EC4899'],
                        borderWidth: 0
                    }]
                },
                options: {
                    plugins: {
                        legend: { position: 'right', labels: { color: '#F8FAFC' } }
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

    startTracker(setId, totalBags) {
        const set = Storage.getCollection().find(s => s.set_num === setId);
        if (set && parseInt(totalBags) > 0) {
            set.buildTracker.active = true;
            set.buildTracker.totalBags = parseInt(totalBags);
            set.buildTracker.currentBag = 0;
            set.buildTracker.startDate = new Date().toISOString();
            set.buildTracker.endDate = null;
            Storage.updateSetInCollection(set);
            UI.renderSetDetails(set, true);
            UI.showToast("¡Rastreador iniciado!", "success");
        } else {
            UI.showToast("Introduce un número de bolsas válido mayor a 0.", "error");
        }
    },

    markAsAlreadyBuilt(setId) {
        const set = Storage.getCollection().find(s => s.set_num === setId);
        if (set) {
            set.buildTracker.active = true;
            set.buildTracker.totalBags = 1;
            set.buildTracker.currentBag = 1;
            const now = new Date().toISOString();
            set.buildTracker.startDate = now;
            set.buildTracker.endDate = now;
            Storage.updateSetInCollection(set);
            UI.renderSetDetails(set, true);
            UI.showToast("¡Marcado como ya montado!", "success");
        }
    },

    finishTracker(setId) {
        const set = Storage.getCollection().find(s => s.set_num === setId);
        if (set) {
            set.buildTracker.endDate = new Date().toISOString();
            Storage.updateSetInCollection(set);
            UI.renderSetDetails(set, true);
            UI.showToast("¡Construcción finalizada!", "success");
        }
    },

    changeTrackerBag(setId, delta) {
        const set = Storage.getCollection().find(s => s.set_num === setId);
        if (set) {
            const newVal = set.buildTracker.currentBag + delta;
            if (newVal >= 0 && newVal <= (set.buildTracker.totalBags || 999)) {
                set.buildTracker.currentBag = newVal;
                Storage.updateSetInCollection(set);
                UI.renderSetDetails(set, true);
            }
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
