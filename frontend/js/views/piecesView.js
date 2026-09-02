const PiecesView = {
    async render(container) {
        const col = Storage.getCollection();

        if (col.length === 0) {
            container.innerHTML = `
            <div class="view-container">
                <div class="page-header">
                    <div class="page-header-title-wrap">
                        <div class="page-header-icon" style="background: linear-gradient(135deg, #10B981, #059669);">
                            <i data-lucide="puzzle" style="width: 26px; height: 26px;"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Mis Piezas</h2>
                                <span class="page-header-badge" style="color:#10B981; background:rgba(16,185,129,0.1); border-color:rgba(16,185,129,0.2);">🧩 Inventario de Piezas</span>
                            </div>
                            <div style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Desglose consolidado de ladrillos y piezas de tu colección
                            </div>
                        </div>
                    </div>
                </div>
                <div class="text-center p-4 text-muted">
                    <i data-lucide="package-open" style="width:48px;height:48px;margin-bottom:12px;opacity:0.4;"></i>
                    <p>Añade sets a tu colección para ver tu inventario de piezas acumulado.</p>
                </div>
            </div>`;
            lucide.createIcons();
            return;
        }

        container.innerHTML = `
            <div class="view-container" id="my-pieces-view">
                <!-- Header Title Bar -->
                <div class="page-header">
                    <div class="page-header-title-wrap">
                        <div class="page-header-icon" style="background: linear-gradient(135deg, #10B981, #059669);">
                            <i data-lucide="puzzle" style="width: 26px; height: 26px;"></i>
                        </div>
                        <div>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <h2 style="font-family: 'Space Grotesk', sans-serif; font-size: 1.6rem; font-weight: 700;">Mis Piezas</h2>
                                <span class="page-header-badge" style="color:#10B981; background:rgba(16,185,129,0.1); border-color:rgba(16,185,129,0.2);">🧩 Inventario de Piezas</span>
                            </div>
                            <div id="pieces-subtitle" style="font-size: 0.88rem; color: var(--text-secondary); margin-top: 2px;">
                                Cargando inventario completo...
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
                        <div style="text-align: right; background: var(--bg-surface-muted); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border);">
                            <div id="pieces-total-count" style="font-family:'IBM Plex Mono',monospace; font-size:1.4rem; font-weight:bold; color:var(--accent); line-height:1;">—</div>
                            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px; margin-top:3px;">Piezas Totales</div>
                        </div>
                        <div style="text-align: right; background: var(--bg-surface-muted); padding: 8px 16px; border-radius: 12px; border: 1px solid var(--border);">
                            <div id="pieces-unique-count" style="font-family:'IBM Plex Mono',monospace; font-size:1.4rem; font-weight:bold; color:var(--text-secondary); line-height:1;">—</div>
                            <div style="font-size:0.68rem; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.8px; margin-top:3px;">Tipos Únicos</div>
                        </div>
                    </div>
                </div>

                <!-- FILTERS BAR -->
                <div class="toolbar-container" id="pieces-filters" style="opacity: 0.5; pointer-events: none;">
                    <div class="toolbar-row">
                        <select id="filter-set" class="input-field" style="flex:1; min-width:160px;" onchange="PiecesView.applyMyPiecesFilters()">
                            <option value="all">Todos los sets</option>
                        </select>
                        <select id="filter-color" class="input-field" style="flex:1; min-width:160px;" onchange="PiecesView.applyMyPiecesFilters()">
                            <option value="all">Todos los colores</option>
                        </select>
                        <select id="filter-sort" class="input-field" style="flex:1; min-width:160px;" onchange="PiecesView.applyMyPiecesFilters()">
                            <option value="quantity">Más cantidad primero</option>
                            <option value="quantity_asc">Menos cantidad primero</option>
                            <option value="name">Nombre A→Z</option>
                            <option value="color">Color A→Z</option>
                        </select>
                        <button class="btn btn-outline" style="border-radius: 12px;" onclick="PiecesView.resetMyPiecesCache()" title="Recargar todas las piezas desde Rebrickable">
                            <i data-lucide="refresh-cw"></i> Recargar
                        </button>
                    </div>
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

        if (App.myPiecesState.allPieces !== null) {
            this._renderPiecesGrid();
            return;
        }

        App.myPiecesState.loading = true;
        const setIds = col.map(s => s.set_num);
        const allRaw = [];
        let loaded = 0;

        const concurrency = 3;
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
                const progressBar = document.getElementById('progress-bar');
                const progressText = document.getElementById('progress-text');
                if (progressBar) progressBar.style.width = `${(loaded / setIds.length) * 100}%`;
                if (progressText) progressText.textContent = `Descargando piezas de ${loaded} / ${setIds.length} sets...`;
            }));
        }

        App.myPiecesState.allPieces = allRaw;
        App.myPiecesState.loading = false;
        this._renderPiecesGrid();
    },

    _renderPiecesGrid() {
        const raw = App.myPiecesState.allPieces || [];

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

        const totalEl = document.getElementById('pieces-total-count');
        const uniqueEl = document.getElementById('pieces-unique-count');
        const subtitleEl = document.getElementById('pieces-subtitle');
        const progressDiv = document.getElementById('pieces-progress');

        if (totalEl) totalEl.textContent = totalQuantity.toLocaleString('es');
        if (uniqueEl) uniqueEl.textContent = pieces.length.toLocaleString('es');
        if (subtitleEl) subtitleEl.textContent = `Inventario completo de ${Storage.getCollection().length} set${Storage.getCollection().length !== 1 ? 's' : ''}`;
        if (progressDiv) progressDiv.remove();

        const uniqueColors = [...new Set(pieces.map(p => p.color && p.color.name ? p.color.name : 'Unknown'))].sort();
        const col = Storage.getCollection();
        const uniqueSets = col.map(s => ({ num: s.set_num, name: s.name }));

        const colorSelect = document.getElementById('filter-color');
        const setSelect = document.getElementById('filter-set');
        const filtersBar = document.getElementById('pieces-filters');

        if (colorSelect) {
            const savedColor = App.myPiecesState.colorFilter;
            colorSelect.innerHTML = `<option value="all">Todos los colores</option>` +
                uniqueColors.map(c => `<option value="${c}" ${savedColor === c ? 'selected' : ''}>${c}</option>`).join('');
        }
        if (setSelect) {
            const savedSet = App.myPiecesState.setFilter;
            setSelect.innerHTML = `<option value="all">Todos los sets</option>` +
                uniqueSets.map(s => `<option value="${s.num}" ${savedSet === s.num ? 'selected' : ''}>${s.name}</option>`).join('');
        }
        const sortSelect = document.getElementById('filter-sort');
        if (sortSelect) sortSelect.value = App.myPiecesState.sortBy;

        if (filtersBar) {
            filtersBar.style.opacity = '1';
            filtersBar.style.pointerEvents = 'auto';
        }

        this.applyMyPiecesFilters();
    },

    applyMyPiecesFilters() {
        const raw = App.myPiecesState.allPieces || [];

        const colorSelect = document.getElementById('filter-color');
        const setSelect = document.getElementById('filter-set');
        const sortSelect = document.getElementById('filter-sort');

        const colorFilter = colorSelect ? colorSelect.value : 'all';
        const setFilter = setSelect ? setSelect.value : 'all';
        const sortBy = sortSelect ? sortSelect.value : 'quantity';

        App.myPiecesState.colorFilter = colorFilter;
        App.myPiecesState.setFilter = setFilter;
        App.myPiecesState.sortBy = sortBy;

        const pieceMap = {};
        raw.forEach(p => {
            const colorName = p.color && p.color.name ? p.color.name : 'Unknown';
            if (setFilter !== 'all' && p._setNum !== setFilter) return;
            if (colorFilter !== 'all' && colorName !== colorFilter) return;

            const key = `${p.part.part_num}__${p.color ? p.color.id : 0}`;
            if (!pieceMap[key]) {
                pieceMap[key] = { part: p.part, color: p.color, colorName, quantity: 0 };
            }
            pieceMap[key].quantity += p.quantity;
        });

        let pieces = Object.values(pieceMap);

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
                    <img src="${img}" alt="${p.part.name}" loading="lazy" onload="UI.removeWhiteBackground(this)">
                </div>
                <div class="my-piece-qty">${p.quantity}x</div>
                <div class="my-piece-color">${colorDot}<span>${p.colorName}</span></div>
                <div class="my-piece-num">${p.part.part_num}</div>
            </div>
            `;
        }).join('');
    },

    resetMyPiecesCache() {
        App.myPiecesState.allPieces = null;
        App.myPiecesState.colorFilter = 'all';
        App.myPiecesState.setFilter = 'all';
        this.render(document.getElementById('main-content'));
    }
};
