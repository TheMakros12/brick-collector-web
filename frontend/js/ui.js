const UI = {
    // Show a toast notification
    showToast(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let icon = 'check-circle';
        if (type === 'error') icon = 'alert-circle';
        else if (type === 'info') icon = 'info';

        toast.innerHTML = `
            <i data-lucide="${icon}"></i>
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();

        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.add('hiding');
            toast.addEventListener('animationend', () => {
                toast.remove();
            });
        }, 3000);
    },

    // Renders a single Lego Card HTML string
    createLegoCard(set, type) {
        const imageUrl = set.set_img_url || 'https://via.placeholder.com/150?text=No+Image';
        const pieces = set.num_parts || 0;
        const price = set.retail_price ? `${set.retail_price}€` : 'N/A';

        // --- Retirement alert (Wishlist only) ---
        let retirementBadge = '';
        if (type === 'wishlist' && set.year) {
            const currentYear = new Date().getFullYear();
            const age = currentYear - set.year;
            if (age >= 4) {
                retirementBadge = `
                    <div class="retirement-badge retirement-retired">
                        <i data-lucide="alert-circle" style="width:12px;height:12px;flex-shrink:0;"></i>
                        Posiblemente retirado
                    </div>`;
            } else if (age >= 2) {
                retirementBadge = `
                    <div class="retirement-badge retirement-risk">
                        <i data-lucide="alert-triangle" style="width:12px;height:12px;flex-shrink:0;"></i>
                        En riesgo de retirarse
                    </div>`;
            }
        }
        
        let actionsHtml = '';
        if (type === 'search') {
            actionsHtml = `
                <button class="btn w-full mb-2" onclick="App.addFromSearch('${set.set_num}', 'collection')">
                    <i data-lucide="plus"></i> Colección
                </button>
                <button class="btn btn-outline w-full" onclick="App.addFromSearch('${set.set_num}', 'wishlist')">
                    <i data-lucide="star"></i> Wishlist
                </button>
            `;
        } else if (type === 'wishlist') {
            actionsHtml = `
                <button class="btn w-full mb-2" onclick="App.moveWishlistToCollection('${set.set_num}')">
                    <i data-lucide="check"></i> Lo Tengo
                </button>
                <button class="btn btn-danger w-full" onclick="App.removeFromWishlist('${set.set_num}')">
                    <i data-lucide="trash-2"></i> Eliminar
                </button>
            `;
        } else if (type === 'collection') {
            actionsHtml = `
                <button class="btn btn-danger w-full" onclick="App.removeFromCollection('${set.set_num}')">
                    <i data-lucide="trash-2"></i> Eliminar
                </button>
            `;
        }

        return `
            <div class="set-card" data-id="${set.set_num}">
                <div class="set-image-container" onclick="App.openSetDetails('${set.set_num}')">
                    <img src="${imageUrl}" alt="${set.name}" loading="lazy">
                    ${retirementBadge}
                </div>
                <div class="set-info">
                    <div class="set-id tech-text">${set.set_num.split('-')[0]}</div>
                    <div class="set-name">${set.name}</div>
                    <div class="set-meta">
                        <span><i data-lucide="box" style="width:14px"></i> ${pieces}</span>
                        <span><i data-lucide="coins" style="width:14px"></i> ${price}</span>
                    </div>
                    <div class="set-actions flex-column">
                        ${actionsHtml}
                    </div>
                </div>
            </div>
        `;
    },


    showModal(contentHtml) {
        const container = document.getElementById('modal-container');
        document.body.style.overflow = 'hidden';
        container.innerHTML = `
            <div class="modal-overlay" onclick="UI.closeModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="UI.closeModal(null, true)" aria-label="Cerrar modal">
                        <i data-lucide="x"></i>
                    </button>
                    ${contentHtml}
                </div>
            </div>
        `;
        lucide.createIcons();
    },

    closeModal(event, force = false) {
        if (force || (event && event.target.classList.contains('modal-overlay'))) {
            document.body.style.overflow = '';
            document.getElementById('modal-container').innerHTML = '';
        }
    },    renderSetDetails(set, isInCollection) {
        const imageUrl = set.set_img_url || 'https://via.placeholder.com/300?text=No+Image';
        const todayStr = new Date().toISOString().split('T')[0];
        const pDate = (set.purchaseDetails && (set.purchaseDetails.acquisitionDate || (set.purchaseDetails.purchaseYear ? `${set.purchaseDetails.purchaseYear}-01-01` : null))) || set.acquisition_date || todayStr;
        const pPrice = (set.purchaseDetails && set.purchaseDetails.pricePaid !== undefined) ? set.purchaseDetails.pricePaid : (set.purchase_price !== null ? set.purchase_price : (set.retail_price || 0));
        const acqType = (set.purchaseDetails && set.purchaseDetails.type) || 'self';

        let purchaseHtml = '';
        let actionsHtml = '';

        if (isInCollection) {
            purchaseHtml = `
                <div class="modal-section" style="margin: 0; display: flex; flex-direction: column; gap: 12px; height: 100%;">
                    <div class="modal-section-title" style="margin-bottom: 5px;"><i data-lucide="credit-card"></i> Mi Compra</div>
                    <div class="input-group">
                        <label>Método de Adquisición</label>
                        <select id="purchase-type" class="input-field" onchange="App.handlePurchaseTypeChange(this, ${set.retail_price || 0})">
                            <option value="self" ${acqType === 'self' || acqType === 'PURCHASED' ? 'selected' : ''}>🛍️ Comprado por mí</option>
                            <option value="gift" ${acqType === 'gift' || acqType === 'GIFT' ? 'selected' : ''}>🎁 Fue un regalo</option>
                            <option value="partial" ${acqType === 'partial' || acqType === 'PARTIAL' ? 'selected' : ''}>🤝 Pago compartido / Segunda mano</option>
                        </select>
                    </div>
                    <div class="input-group" id="purchase-price-group">
                        <label>Precio Pagado por Mí (€)</label>
                        <input type="number" id="purchase-price" class="input-field" step="0.01" value="${pPrice}">
                    </div>
                    <div class="input-group">
                        <label>Precio Oficial del Set / MSRP (€)</label>
                        <input type="number" id="purchase-retail" class="input-field" step="0.01" value="${set.retail_price || ''}" readonly style="opacity:0.7">
                    </div>
                    <div class="input-group">
                        <label>Fecha de Compra (Día / Mes / Año)</label>
                        <input type="date" id="purchase-date" class="input-field" value="${pDate}">
                    </div>
                    <div style="margin-top: auto; padding-top: 10px;">
                        <button class="btn btn-outline w-full" onclick="App.savePurchaseDetails('${set.set_num}')"><i data-lucide="save"></i> Guardar Detalles</button>
                    </div>
                </div>
            `;

            actionsHtml = `
                <button class="btn w-full mb-3" onclick="App.viewPieces('${set.set_num}')">
                    <i data-lucide="puzzle"></i> Ver Piezas del Set
                </button>
            `;
        }

        const content = `
            <!-- HEADER -->
            <div class="text-center mb-4" style="background: var(--bg-surface-muted); border-radius: var(--radius-md); padding: 20px;">
                <img src="${imageUrl}" alt="${set.name}" style="max-width: 100%; max-height: 250px; object-fit: contain; mix-blend-mode: multiply;">
            </div>
            
            <div style="text-align: center; margin-bottom: 20px;">
                <h2 style="font-size: 1.5rem; margin-bottom: 5px;">${set.name}</h2>
                <div class="tech-text text-secondary" style="font-size: 1rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                    <span style="background: var(--accent-bg); color: var(--accent-text); padding: 2px 8px; border-radius: 4px; font-weight: bold;">${set.set_num.split('-')[0]}</span>
                    <span>Año: ${set.year || 'N/A'}</span>
                </div>
            </div>
            
            <!-- GRID LAYOUT -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px;">
                
                <!-- LEFT COLUMN -->
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="modal-section" style="margin: 0;">
                        <div class="modal-section-title"><i data-lucide="info"></i> Datos del Mercado</div>
                        <div class="stat-grid" style="margin-bottom: 0;">
                            <div class="stat-card" style="padding: 15px;">
                                <div class="stat-value" style="font-size: 1.5rem;">${set.num_parts || 0}</div>
                                <div class="stat-label">Piezas</div>
                            </div>
                            <div class="stat-card" style="padding: 15px;">
                                <div class="stat-value" style="font-size: 1.5rem;">€${set.retail_price || 0}</div>
                                <div class="stat-label">Precio Estimado</div>
                            </div>
                        </div>
                    </div>

                    ${actionsHtml}
                    
                    <a href="${set.set_url}" target="_blank" class="btn btn-outline w-full" style="text-decoration: none;">
                        <i data-lucide="external-link"></i> Ver en Rebrickable
                    </a>
                </div>

                <!-- RIGHT COLUMN -->
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    ${purchaseHtml}
                </div>
            </div>
        `;
        
        UI.showModal(content);
        // Add basic switch styles if not in css
        if(!document.getElementById('switch-style')) {
            const style = document.createElement('style');
            style.id = 'switch-style';
            style.innerHTML = `
                .switch { position: relative; display: inline-block; width: 50px; height: 26px; }
                .switch input { opacity: 0; width: 0; height: 0; }
                .slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #334155; transition: .4s; border-radius: 34px; }
                .slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; }
                input:checked + .slider { background-color: var(--accent); }
                input:checked + .slider:before { transform: translateX(24px); }
            `;
            document.head.appendChild(style);
        }
    },

    renderPiecesList(pieces) {
        if (!pieces || pieces.length === 0) {
            UI.showModal('<div class="text-center p-4"><i data-lucide="package-open" style="width:48px;height:48px;margin-bottom:10px;opacity:0.5;"></i><br>No se encontraron piezas.</div>');
            lucide.createIcons();
            return;
        }

        const totalPieces = pieces.reduce((sum, p) => sum + p.quantity, 0);

        // Obtener lista única de colores
        const uniqueColors = [...new Set(pieces.map(p => p.color && p.color.name ? p.color.name : 'Unknown'))].sort();
        const colorOptions = uniqueColors.map(c => `<option value="${c}">${c}</option>`).join('');

        const piecesHtml = pieces.map(p => {
            const img = p.part.part_img_url || 'https://via.placeholder.com/100?text=?';
            const colorName = p.color && p.color.name ? p.color.name : 'Unknown';
            
            return `
                <div class="piece-card" data-color="${colorName.replace(/"/g, '&quot;')}" style="background: var(--bg-surface-muted); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 15px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center; gap: 8px;">
                    <img src="${img}" alt="${p.part.name}" loading="lazy" style="width: 75px; height: 75px; object-fit: contain; mix-blend-mode: multiply;">
                    <div style="width: 100%;">
                        <div style="font-size: 1rem; color: var(--text-primary); font-family: 'Space Grotesk', sans-serif; font-weight: bold;">${p.quantity}x</div>
                        <div style="font-size: 0.75rem; color: var(--text-secondary); margin-top: 3px;">${colorName}</div>
                        <div class="tech-text" style="font-size: 0.7rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; margin-top: 2px;" title="${p.part.name}">${p.part.part_num}</div>
                    </div>
                </div>
            `;
        }).join('');

        const content = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1px solid var(--border); padding-bottom: 15px; margin-bottom: 20px; padding-right: 40px;">
                <div style="flex: 1;">
                    <h2 style="margin: 0 0 10px 0; font-family: 'Space Grotesk', sans-serif;">Inventario de Piezas</h2>
                    <div style="max-width: 300px;">
                        <select class="input-field" style="width: 100%; cursor: pointer;" onchange="UI.filterPiecesByColor(this.value)">
                            <option value="all">Todos los colores</option>
                            ${colorOptions}
                        </select>
                    </div>
                </div>
                <div style="text-align: right; min-width: 120px;">
                    <div style="font-family: 'IBM Plex Mono', monospace; font-size: 1.25rem; font-weight: bold; color: var(--accent); line-height: 1;">${totalPieces}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 1px; margin-top: 4px;">Piezas Totales</div>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 15px; max-height: 60vh; overflow-y: auto; padding-right: 10px;" class="custom-scrollbar">
                ${piecesHtml}
            </div>
        `;

        UI.showModal(content);
        lucide.createIcons();
    },

    filterPiecesByColor(color) {
        const cards = document.querySelectorAll('.piece-card[data-color]');
        cards.forEach(card => {
            if (color === 'all' || card.getAttribute('data-color') === color) {
                card.style.display = 'flex';
            } else {
                card.style.display = 'none';
            }
        });
    }
};
