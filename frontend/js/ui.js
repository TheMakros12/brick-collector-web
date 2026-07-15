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
                    <div class="set-id">${set.set_num.split('-')[0]}</div>
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
        
        let trackerHtml = '';
        if (isInCollection) {
            const tracker = set.buildTracker || { active: false, totalBags: 0, currentBag: 0, startDate: null, endDate: null };
            const pct = tracker.totalBags > 0 ? Math.round((tracker.currentBag / tracker.totalBags) * 100) : 0;
            
            let trackerContent = '';
            if (!tracker.active && !tracker.endDate) {
                trackerContent = `
                    <div class="input-group mb-2">
                        <label>Total de Bolsas (Opcional)</label>
                        <input type="number" id="tracker-total" class="input-field" value="${tracker.totalBags || ''}" placeholder="Ej: 15" min="1">
                    </div>
                    <button class="btn w-full mb-2" onclick="App.startTracker('${set.set_num}', document.getElementById('tracker-total').value)">Empezar Construcción</button>
                    <button class="btn btn-outline w-full" onclick="App.markAsAlreadyBuilt('${set.set_num}')" style="border-color: var(--success); color: var(--success);">
                        <i data-lucide="check-square"></i> Ya lo tengo montado
                    </button>
                `;
            } else if (tracker.active && !tracker.endDate) {
                trackerContent = `
                    <div class="flex justify-between items-center mb-2" style="font-size: 0.9rem;">
                        <span>Inicio: ${new Date(tracker.startDate).toLocaleDateString()}</span>
                        <span>Bolsa ${tracker.currentBag} de ${tracker.totalBags}</span>
                    </div>
                    
                    <div class="theme-bar-bg mb-4" style="background: rgba(255,255,255,0.1)">
                        <div class="theme-bar-fill" style="width: ${pct}%; background: var(--success)"></div>
                    </div>
                    
                    <div class="flex items-center justify-between mb-4">
                        <span>Avanzar bolsa:</span>
                        <div class="flex items-center gap-2">
                            <button class="btn btn-outline" style="padding: 5px 15px;" onclick="App.changeTrackerBag('${set.set_num}', -1)">-</button>
                            <button class="btn btn-outline" style="padding: 5px 15px;" onclick="App.changeTrackerBag('${set.set_num}', 1)">+</button>
                        </div>
                    </div>
                    <button class="btn w-full" style="background: var(--success); color: white;" onclick="App.finishTracker('${set.set_num}')">Marcar como Finalizado</button>
                `;
            } else if (tracker.endDate) {
                const days = Math.ceil((new Date(tracker.endDate) - new Date(tracker.startDate)) / (1000 * 60 * 60 * 24)) || 1;
                trackerContent = `
                    <div class="text-center" style="color: var(--success);">
                        <i data-lucide="check-circle" style="width: 40px; height: 40px; margin-bottom: 10px;"></i>
                        <h4 class="mb-2">¡Construcción Completada!</h4>
                        <p class="text-muted" style="font-size: 0.9rem;">
                            Inicio: ${new Date(tracker.startDate).toLocaleDateString()}<br>
                            Fin: ${new Date(tracker.endDate).toLocaleDateString()}<br>
                            Tiempo: ${days} días
                        </p>
                    </div>
                `;
            }

            trackerHtml = `
                <div class="build-tracker mt-4">
                    <h3 style="font-size: 1.1rem; margin-bottom: 15px;">Progreso de Construcción</h3>
                    ${trackerContent}
                </div>
            `;
        }

        const content = `
            <div class="text-center mb-4">
                <img src="${imageUrl}" alt="${set.name}" style="max-width: 100%; max-height: 200px; object-fit: contain;">
            </div>
            <h2 class="mb-2" style="font-size: 1.3rem;">${set.name}</h2>
            <div class="set-id mb-4" style="font-size: 1rem;">${set.set_num.split('-')[0]} • Año: ${set.year || 'N/A'}</div>
            
            <div class="stat-grid" style="margin-bottom: 15px;">
                <div class="stat-card" style="padding: 10px;">
                    <div class="stat-value" style="font-size: 1.2rem;">${set.num_parts || 0}</div>
                    <div class="stat-label">Piezas</div>
                </div>
                <div class="stat-card" style="padding: 10px;">
                    <div class="stat-value" style="font-size: 1.2rem;">€${set.estimated_price || 0}</div>
                    <div class="stat-label">Precio Estimado</div>
                </div>
            </div>

            <a href="${set.set_url}" target="_blank" class="btn btn-outline w-full mb-4" style="text-decoration: none;">
                <i data-lucide="external-link"></i> Ver en Rebrickable
            </a>

            ${isInCollection ? `
                <button class="btn w-full mb-4" onclick="App.viewPieces('${set.set_num}')">
                    <i data-lucide="puzzle"></i> Ver Piezas del Set
                </button>
            ` : ''}

            ${trackerHtml}
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
                input:checked + .slider { background-color: var(--primary); }
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
                    <div style="font-size: 0.75rem; color: var(--primary); font-weight: bold;">${p.quantity}x</div>
                    <div style="font-size: 0.65rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${p.part.part_num}</div>
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
