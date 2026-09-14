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
                            <button class="category-chip ${App.collectionState.retiredFilter === 'all' ? 'active' : ''}" data-cat="all" onclick="CollectionView.updateCollectionRetiredFilter('all')">Todos</button>
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

        UI.showToast("Generando PDF en alta definición...", "info");

        const totalPieces = isCol ? items.reduce((sum, i) => sum + (i.num_parts || 0), 0) : 0;
        const totalValue = isCol
            ? items.reduce((sum, s) => sum + (s.purchaseDetails?.pricePaid ? parseFloat(s.purchaseDetails.pricePaid) : (s.retail_price || 0)), 0)
            : items.reduce((sum, i) => sum + (i.retail_price || 0), 0);

        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

        const container = document.createElement('div');
        container.style.width = "650px";
        container.style.padding = "24px 24px";
        container.style.fontFamily = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
        container.style.backgroundColor = "#FFFFFF";
        container.style.color = "#111827";
        container.style.position = "absolute";
        container.style.left = "-9999px";
        container.style.top = "0px";
        container.style.boxSizing = "border-box";
        document.body.appendChild(container);

        const logoUrl = window.location.origin + '/Lego.webp';

        const headerHtml = `
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E5E7EB; padding-bottom: 16px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <img src="${logoUrl}" alt="LEGO Logo" crossorigin="anonymous" style="width: 46px; height: 46px; border-radius: 10px; object-fit: contain; flex-shrink: 0; box-shadow: 0 3px 8px rgba(227,0,11,0.2);">
                    <div>
                        <h1 style="margin: 0; font-family: 'Space Grotesk', sans-serif; font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.4px;">
                            ${isCol ? 'INFORME DE COLECCIÓN LEGO®' : 'MI LISTA DE DESEOS LEGO®'}
                        </h1>
                        <div style="font-size: 11.5px; color: #6B7280; margin-top: 2px;">
                            ${isCol ? 'Inventario Consolidado de Piezas y Sets' : 'Ideas de Regalo y Sets Deseados'}
                        </div>
                    </div>
                </div>
                <div style="text-align: right; flex-shrink: 0;">
                    <div style="font-size: 10px; font-weight: 700; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.8px;">FECHA DE EMISIÓN</div>
                    <div style="font-size: 12px; font-weight: 700; color: #111827; margin-top: 2px;">${dateString}</div>
                </div>
            </div>
        `;

        const kpisHtml = isCol ? `
            <div style="display: flex; gap: 12px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
                    <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">TOTAL SETS</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #E3000B; margin-top: 2px;">${items.length}</div>
                </div>
                <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
                    <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">PIEZAS TOTALES</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #111827; margin-top: 2px;">${totalPieces.toLocaleString('es')}</div>
                </div>
                <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
                    <div style="font-size: 9.5px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">VALOR ESTIMADO / P.V.P.</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 800; color: #10B981; margin-top: 2px;">${totalValue.toFixed(2).replace('.', ',')} €</div>
                </div>
            </div>
        ` : `
            <div style="display: flex; gap: 12px; margin-bottom: 20px; width: 100%; box-sizing: border-box;">
                <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
                    <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">SETS DESEADOS</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #E3000B; margin-top: 2px;">${items.length} set${items.length !== 1 ? 's' : ''}</div>
                </div>
                <div style="flex: 1; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 12px; padding: 12px 14px; box-sizing: border-box;">
                    <div style="font-size: 10px; font-weight: 700; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px;">P.V.P. TOTAL ESTIMADO</div>
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 800; color: #10B981; margin-top: 2px;">${totalValue.toFixed(2).replace('.', ',')} €</div>
                </div>
            </div>
        `;

        const itemsHtml = items.map(i => {
            const setIdShort = i.set_num.split('-')[0];
            const priceVal = (i.retail_price || 0).toFixed(2).replace('.', ',');
            const proxyImg = API.getProxyImageUrl(i.set_img_url);

            if (isCol) {
                return `
                <div style="display: flex; align-items: center; padding: 16px 20px; margin-bottom: 12px; border: 1px solid #E5E7EB; border-radius: 14px; background: #FFFFFF; page-break-inside: avoid; box-shadow: 0 2px 5px rgba(0,0,0,0.02); box-sizing: border-box; width: 100%;">
                    <div style="width: 90px; height: 90px; flex-shrink: 0; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 8px; margin-right: 18px; box-sizing: border-box;">
                        <img src="${proxyImg}" crossorigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <div style="flex: 1; min-width: 0; margin-right: 16px;">
                        <div style="display: inline-block; background: #F3F4F6; color: #374151; font-family: 'Space Grotesk', sans-serif; font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 6px; margin-bottom: 6px;">
                            #${setIdShort}
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${i.name}
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 20px; flex-shrink: 0; text-align: right;">
                        <div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">PIEZAS</div>
                            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 14.5px; font-weight: 700; color: #374151; margin-top: 2px;">
                                ${(i.num_parts || 0).toLocaleString('es')} pcs
                            </div>
                        </div>
                        <div>
                            <div style="font-size: 9.5px; font-weight: 700; color: #9CA3AF; text-transform: uppercase;">PRECIO / PVP</div>
                            <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 800; color: #10B981; margin-top: 2px;">
                                ${priceVal} €
                            </div>
                        </div>
                    </div>
                </div>`;
            } else {
                return `
                <div style="display: flex; align-items: center; padding: 16px 20px; margin-bottom: 12px; border: 1px solid #E5E7EB; border-radius: 14px; background: #FFFFFF; page-break-inside: avoid; box-shadow: 0 2px 5px rgba(0,0,0,0.02); box-sizing: border-box; width: 100%;">
                    <div style="width: 90px; height: 90px; flex-shrink: 0; background: #F9FAFB; border: 1px solid #F3F4F6; border-radius: 12px; display: flex; align-items: center; justify-content: center; padding: 8px; margin-right: 18px; box-sizing: border-box;">
                        <img src="${proxyImg}" crossorigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain;">
                    </div>
                    <div style="flex: 1; min-width: 0; margin-right: 16px;">
                        <div style="display: inline-block; background: #FEE2E2; color: #E3000B; font-family: 'Space Grotesk', sans-serif; font-size: 11.5px; font-weight: 800; padding: 3px 9px; border-radius: 6px; margin-bottom: 6px;">
                            #${setIdShort}
                        </div>
                        <div style="font-size: 16px; font-weight: 700; color: #111827; line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                            ${i.name}
                        </div>
                    </div>
                    <div style="flex-shrink: 0; text-align: right; background: #F0FDF4; border: 1px solid #DCFCE7; padding: 8px 16px; border-radius: 10px;">
                        <div style="font-size: 9.5px; font-weight: 700; color: #166534; text-transform: uppercase;">P.V.P. RECOMENDADO</div>
                        <div style="font-family: 'IBM Plex Mono', monospace; font-size: 16px; font-weight: 800; color: #15803D; margin-top: 1px;">
                            ${priceVal} €
                        </div>
                    </div>
                </div>`;
            }
        }).join('');

        const footerHtml = `
            <div style="margin-top: 20px; padding-top: 14px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: #9CA3AF; width: 100%; box-sizing: border-box;">
                <div>Brick Collector Web — ${isCol ? 'Informe de Inventario de Colección' : 'Lista de Deseos Compartida'}</div>
                <div>Generado automáticamente</div>
            </div>
        `;

        container.innerHTML = `
            ${headerHtml}
            ${kpisHtml}
            <div style="display: flex; flex-direction: column; width: 100%; box-sizing: border-box;">
                ${itemsHtml}
            </div>
            ${footerHtml}
        `;

        const opt = {
            margin: [8, 8, 8, 8],
            filename: isCol ? 'Lego_Collection_Report.pdf' : 'Lego_Wishlist_Report.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#FFFFFF',
                logging: false,
                windowWidth: 800
            },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        try {
            const imgs = Array.from(container.querySelectorAll('img'));
            await Promise.all(imgs.map(img => {
                if (img.complete) return Promise.resolve();
                return new Promise(resolve => {
                    img.onload = resolve;
                    img.onerror = resolve;
                });
            }));

            const pdfBlob = await html2pdf().set(opt).from(container).output('blob');
            const pdfFile = new File([pdfBlob], opt.filename, { type: 'application/pdf' });

            let shared = false;
            if (navigator.share && navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
                try {
                    await navigator.share({
                        files: [pdfFile],
                        title: isCol ? 'Mi Colección LEGO' : 'Mi Lista de Deseos LEGO',
                        text: isCol ? 'Te comparto mi informe de Colección LEGO® en PDF.' : 'Te comparto mi Lista de Deseos LEGO® en PDF.'
                    });
                    shared = true;
                    UI.showToast("PDF compartido con éxito.", "success");
                } catch (shareErr) {
                    console.warn("navigator.share cancelado o no disponible, descargando archivo directamente:", shareErr);
                }
            }

            if (!shared) {
                await html2pdf().set(opt).from(container).save();
                UI.showToast("PDF generado y descargado con éxito.", "success");
            }
        } catch (e) {
            console.error("Error generating PDF", e);
            UI.showToast("Error al procesar el PDF.", "error");
        } finally {
            if (container.parentNode) {
                container.parentNode.removeChild(container);
            }
        }
    }
};
