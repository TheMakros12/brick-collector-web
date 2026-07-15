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
        const price = set.estimated_price ? `€${set.estimated_price}` : 'N/A';
        
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
                </div>
                <div class="set-info">
                    <div class="set-id tech-text">${set.set_num.split('-')[0]}</div>
                    <div class="set-name">${set.name}</div>
                    <div class="set-meta">
                        <span><i data-lucide="box" style="width:14px"></i> ${pieces}</span>
                        <span><i data-lucide="dollar-sign" style="width:14px"></i> ${price}</span>
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
        container.innerHTML = `
            <div class="modal-overlay" onclick="UI.closeModal(event)">
                <div class="modal-content" onclick="event.stopPropagation()">
                    <button class="modal-close" onclick="UI.closeModal(null, true)">
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
            document.getElementById('modal-container').innerHTML = '';
        }
    },

    renderSetDetails(set, isInCollection) {
        const imageUrl = set.set_img_url || 'https://via.placeholder.com/300?text=No+Image';
        const purchase = set.purchaseDetails || { type: 'self', pricePaid: '', notes: '' };
        


        let purchaseHtml = '';
        let actionsHtml = '';

        if (isInCollection) {
            // --- PURCHASE DETAILS ---
            const currentYear = new Date().getFullYear();
            const pYear = purchase.purchaseYear || currentYear;
            
            purchaseHtml = `
                <div class="modal-section mt-4">
                    <div class="modal-section-title"><i data-lucide="credit-card"></i> Mi Compra</div>
                    <div class="input-group mb-3">
                        <label>Método de Adquisición</label>
                        <select id="purchase-type" class="input-field" onchange="document.getElementById('purchase-price-group').style.display = this.value === 'gift' ? 'none' : 'block'">
                            <option value="self" ${purchase.type === 'self' ? 'selected' : ''}>🛍️ Comprado por mí</option>
                            <option value="gift" ${purchase.type === 'gift' ? 'selected' : ''}>🎁 Fue un regalo</option>
                            <option value="partial" ${purchase.type === 'partial' ? 'selected' : ''}>🤝 Pago compartido / Segunda mano</option>
                        </select>
                    </div>
                    <div class="input-group mb-3" id="purchase-price-group" style="display: ${purchase.type === 'gift' ? 'none' : 'block'};">
                        <label>Precio Pagado (€)</label>
                        <input type="number" id="purchase-price" class="input-field" step="0.01" value="${purchase.pricePaid}">
                    </div>
                    <div class="input-group mb-3">
                        <label>Año de Compra</label>
                        <input type="number" id="purchase-year" class="input-field" value="${pYear}" min="1900" max="2100">
                    </div>
                    <button class="btn btn-outline w-full" onclick="App.savePurchaseDetails('${set.set_num}')"><i data-lucide="save"></i> Guardar Detalles</button>
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
                <img src="${imageUrl}" alt="${set.name}" style="max-width: 100%; max-height: 250px; object-fit: contain;">
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
                <div>
                    <div class="modal-section">
                        <div class="modal-section-title"><i data-lucide="info"></i> Datos del Mercado</div>
                        <div class="stat-grid" style="margin-bottom: 0;">
                            <div class="stat-card" style="padding: 15px;">
                                <div class="stat-value" style="font-size: 1.5rem;">${set.num_parts || 0}</div>
                                <div class="stat-label">Piezas</div>
                            </div>
                            <div class="stat-card" style="padding: 15px;">
                                <div class="stat-value" style="font-size: 1.5rem;">€${set.estimated_price || 0}</div>
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
                <div>
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
            UI.showModal('<div class="text-center p-4">No se encontraron piezas.</div>');
            return;
        }

        const piecesHtml = pieces.map(p => {
            const img = p.part.part_img_url || 'https://via.placeholder.com/50?text=?';
            return `
                <div class="piece-card">
                    <img src="${img}" alt="${p.part.name}" loading="lazy">
                    <div style="font-size: 0.75rem; color: var(--accent); font-weight: bold;">${p.quantity}x</div>
                    <div class="tech-text" style="font-size: 0.65rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: var(--text-secondary);">${p.part.part_num}</div>
                </div>
            `;
        }).join('');

        const content = `
            <h2 class="mb-4">Piezas del Set</h2>
            <div class="grid-pieces" style="max-height: 60vh; overflow-y: auto; padding-right: 5px;">
                ${piecesHtml}
            </div>
        `;

        UI.showModal(content);
    }
};
