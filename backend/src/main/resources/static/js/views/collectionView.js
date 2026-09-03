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
        const isCol = App.collectionState.tab === 'collection';
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        if (items.length === 0) return UI.showToast("La lista está vacía.", "error");

        UI.showToast("Generando PDF, descargando fotos...", "info");

        const totalPieces = isCol ? items.reduce((sum, i) => sum + (i.num_parts || 0), 0) : 0;

        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString('en-US', dateOptions).toUpperCase();

        const container = document.createElement('div');
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

        const getBase64 = async (url) => {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch(e) { return ''; }
        };

        const itemsHtmlArray = await Promise.all(items.map(async i => {
            const setIdShort = i.set_num.split('-')[0];
            const priceVal = (i.retail_price || 0).toFixed(2);
            const proxyImg = API.getProxyImageUrl(i.set_img_url);
            const b64Img = await getBase64(proxyImg) || proxyImg; // Fallback to URL if base64 fails

            return `
            <div style="display: flex; align-items: center; padding: 25px 0; border-bottom: 1px solid #EAEAEA; page-break-inside: avoid; position: relative; z-index: 1;">
                <div style="width: 120px; height: 120px; flex-shrink: 0; background: #FFFFFF; border: 1px solid #EAEAEA; border-radius: 16px; overflow: hidden; display: flex; justify-content: center; align-items: center; padding: 8px; margin-right: 35px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
                    <img src="${b64Img}" style="max-width: 100%; max-height: 100%; object-fit: contain;">
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
        }));
        
        let itemsHtml = itemsHtmlArray.join('');

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
            const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
            const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                await navigator.share({
                    files: [pdfFile],
                    title: isCol ? 'Mi Colección LEGO' : 'Mi Lista de Deseos LEGO',
                    text: isCol ? 'Te comparto mi informe de Colección LEGO® en PDF.' : 'Te comparto mi Lista de Deseos LEGO® en PDF.'
                });
                UI.showToast("PDF enviado con éxito.", "success");
            } else {
                await html2pdf().set(opt).from(container).save();
                UI.showToast("PDF generado con éxito.", "success");
            }
        } catch (e) {
            console.error("Error generating/sharing PDF", e);
            UI.showToast("Error al procesar el PDF.", "error");
        }
    }
};
