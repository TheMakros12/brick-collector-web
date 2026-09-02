const UI = {
    // Recorte automático de fondo blanco mediante Flood-Fill de Canvas.
    // Genera una silueta PNG con fondo 100% transparente sin alterar los colores reales de la foto.
    removeWhiteBackground(img) {
        if (!img || img.dataset.bgProcessed) return;
        img.dataset.bgProcessed = "true";

        const processCanvas = (imageSource) => {
            try {
                const w = imageSource.naturalWidth || imageSource.width;
                const h = imageSource.naturalHeight || imageSource.height;
                if (!w || !h || w < 10 || h < 10) return;

                const canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                ctx.drawImage(imageSource, 0, 0);

                const imgData = ctx.getImageData(0, 0, w, h);
                const data = imgData.data;

                // Threshold para detectar píxeles de fondo blanco y gris claro off-white de JPEG (RGB > 195 y tono neutro)
                const isNearWhite = (r, g, b) => {
                    if (r < 195 || g < 195 || b < 195) return false;
                    const diff = Math.max(Math.abs(r - g), Math.abs(r - b), Math.abs(g - b));
                    return diff < 24;
                };

                const visited = new Uint8Array(w * h);
                const queue = new Int32Array(w * h);
                let qHead = 0, qTail = 0;

                // Añadir los bordes del recuadro exterior a la cola del algoritmo Flood Fill (BFS)
                for (let x = 0; x < w; x++) {
                    let idx = x;
                    let pIdx = idx * 4;
                    if (isNearWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
                        visited[idx] = 1;
                        queue[qTail++] = idx;
                    }
                    idx = (h - 1) * w + x;
                    pIdx = idx * 4;
                    if (!visited[idx] && isNearWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
                        visited[idx] = 1;
                        queue[qTail++] = idx;
                    }
                }
                for (let y = 0; y < h; y++) {
                    let idx = y * w;
                    let pIdx = idx * 4;
                    if (!visited[idx] && isNearWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
                        visited[idx] = 1;
                        queue[qTail++] = idx;
                    }
                    idx = y * w + (w - 1);
                    pIdx = idx * 4;
                    if (!visited[idx] && isNearWhite(data[pIdx], data[pIdx+1], data[pIdx+2])) {
                        visited[idx] = 1;
                        queue[qTail++] = idx;
                    }
                }

                // Iniciar recorrido Flood Fill solo por el espacio de fondo blanco conectado
                while (qHead < qTail) {
                    const curr = queue[qHead++];
                    const cx = curr % w;
                    const cy = (curr / w) | 0;
                    const pIdx = curr * 4;

                    // Convertir el píxel de fondo blanco en transparente
                    data[pIdx + 3] = 0;

                    // 4 Vecinos (arriba, abajo, izquierda, derecha)
                    const n1 = cx > 0 ? curr - 1 : -1;
                    const n2 = cx < w - 1 ? curr + 1 : -1;
                    const n3 = cy > 0 ? curr - w : -1;
                    const n4 = cy < h - 1 ? curr + h : -1;

                    const neighbors = [n1, n2, n3, n4];
                    for (let i = 0; i < 4; i++) {
                        const n = neighbors[i];
                        if (n >= 0 && !visited[n]) {
                            const npIdx = n * 4;
                            if (isNearWhite(data[npIdx], data[npIdx+1], data[npIdx+2])) {
                                visited[n] = 1;
                                queue[qTail++] = n;
                            }
                        }
                    }
                }

                ctx.putImageData(imgData, 0, 0);
                img.src = canvas.toDataURL('image/png');
            } catch (e) {
                // Si CORS bloquea la imagen remota, reintentar a través del proxy local
                if (!img.dataset.proxyAttempted && img.src && img.src.startsWith('http') && !img.src.includes('/api/catalog/proxy-image')) {
                    img.dataset.proxyAttempted = "true";
                    img.dataset.bgProcessed = "";
                    const proxyUrl = `http://localhost:8080/api/catalog/proxy-image?url=${encodeURIComponent(img.src)}`;
                    const proxyImg = new Image();
                    proxyImg.crossOrigin = "Anonymous";
                    proxyImg.onload = () => processCanvas(proxyImg);
                    proxyImg.src = proxyUrl;
                }
            }
        };

        if (img.complete && img.naturalWidth) {
            processCanvas(img);
        } else {
            const tempImg = new Image();
            tempImg.crossOrigin = "Anonymous";
            tempImg.onload = () => processCanvas(tempImg);
            tempImg.onerror = () => {
                if (!img.dataset.proxyAttempted && img.src && img.src.startsWith('http') && !img.src.includes('/api/catalog/proxy-image')) {
                    img.dataset.proxyAttempted = "true";
                    const proxyUrl = `http://localhost:8080/api/catalog/proxy-image?url=${encodeURIComponent(img.src)}`;
                    const proxyImg = new Image();
                    proxyImg.crossOrigin = "Anonymous";
                    proxyImg.onload = () => processCanvas(proxyImg);
                    proxyImg.src = proxyUrl;
                }
            };
            tempImg.src = img.src;
        }
    },

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
                    <img src="${imageUrl}" alt="${set.name}" loading="lazy" onload="UI.removeWhiteBackground(this)">
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
    },

    renderSetDetails(set, isInCollection) {
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
                <img src="${imageUrl}" alt="${set.name}" onload="UI.removeWhiteBackground(this)" style="max-width: 100%; max-height: 250px; object-fit: contain;">
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
        if (document.getElementById('purchase-date')) {
            UI.initCustomDatePicker('purchase-date');
        }
        lucide.createIcons();
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
                    <img src="${img}" alt="${p.part.name}" loading="lazy" onload="UI.removeWhiteBackground(this)" style="width: 75px; height: 75px; object-fit: contain;">
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
    },

    initCustomDatePicker(inputId) {
        const input = document.getElementById(inputId);
        if (!input) return;

        let container = input.closest('.custom-datepicker-container');
        if (container) return; // already initialized

        container = document.createElement('div');
        container.className = 'custom-datepicker-container';
        input.parentNode.insertBefore(container, input);
        container.appendChild(input);

        input.style.display = 'none'; // hide native date input

        let currentDateVal = input.value ? new Date(input.value + 'T00:00:00') : new Date();
        if (isNaN(currentDateVal.getTime())) currentDateVal = new Date();

        let displayYear = currentDateVal.getFullYear();
        let displayMonth = currentDateVal.getMonth();

        const triggerBtn = document.createElement('button');
        triggerBtn.type = 'button';
        triggerBtn.className = 'input-field custom-datepicker-trigger';
        
        const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        const monthNamesCap = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        const updateTriggerText = () => {
            if (input.value) {
                const [y, m, d] = input.value.split('-');
                triggerBtn.innerHTML = `<i data-lucide="calendar" style="width:18px;height:18px;color:var(--accent);"></i> <span style="font-weight:600;">${parseInt(d)} de ${monthNames[parseInt(m)-1]} de ${y}</span>`;
            } else {
                triggerBtn.innerHTML = `<i data-lucide="calendar" style="width:18px;height:18px;color:var(--text-muted);"></i> <span style="color:var(--text-muted);">Seleccionar fecha...</span>`;
            }
            lucide.createIcons();
        };

        updateTriggerText();
        container.appendChild(triggerBtn);

        const popover = document.createElement('div');
        popover.className = 'custom-datepicker-popover';
        container.appendChild(popover);

        const renderCalendar = () => {
            const firstDay = new Date(displayYear, displayMonth, 1);
            const lastDay = new Date(displayYear, displayMonth + 1, 0);
            
            let startingDay = (firstDay.getDay() + 6) % 7;
            const totalDays = lastDay.getDate();

            let daysHtml = '';
            const prevMonthLastDay = new Date(displayYear, displayMonth, 0).getDate();

            for (let i = startingDay - 1; i >= 0; i--) {
                daysHtml += `<div class="calendar-day day-padding">${prevMonthLastDay - i}</div>`;
            }

            const selectedVal = input.value;
            const todayStr = new Date().toISOString().split('T')[0];

            for (let day = 1; day <= totalDays; day++) {
                const monthStr = String(displayMonth + 1).padStart(2, '0');
                const dayStr = String(day).padStart(2, '0');
                const dateIso = `${displayYear}-${monthStr}-${dayStr}`;

                const isSelected = selectedVal === dateIso;
                const isToday = todayStr === dateIso;

                daysHtml += `
                    <div class="calendar-day ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}" data-date="${dateIso}">
                        ${day}
                    </div>
                `;
            }

            const totalCells = startingDay + totalDays;
            const nextPadding = (7 - (totalCells % 7)) % 7;
            for (let i = 1; i <= nextPadding; i++) {
                daysHtml += `<div class="calendar-day day-padding">${i}</div>`;
            }

            const currentYear = new Date().getFullYear();

            popover.innerHTML = `
                <div class="calendar-header">
                    <button type="button" class="calendar-nav-btn" id="cal-prev"><i data-lucide="chevron-left" style="width:16px;height:16px;"></i></button>
                    <div style="font-weight:700; font-family:'Space Grotesk',sans-serif; font-size:0.95rem; display:flex; align-items:center; gap:6px;">
                        <span>${monthNamesCap[displayMonth]}</span>
                        <select id="cal-year-select" class="calendar-year-select">
                            ${Array.from({length: 35}, (_, i) => currentYear - 30 + i).map(y => `<option value="${y}" ${y === displayYear ? 'selected' : ''}>${y}</option>`).join('')}
                        </select>
                    </div>
                    <button type="button" class="calendar-nav-btn" id="cal-next"><i data-lucide="chevron-right" style="width:16px;height:16px;"></i></button>
                </div>

                <div class="calendar-weekdays">
                    <span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span>
                </div>

                <div class="calendar-days-grid">
                    ${daysHtml}
                </div>

                <div class="calendar-footer">
                    <button type="button" class="calendar-footer-btn" id="cal-today"><i data-lucide="sparkles" style="width:13px;height:13px;"></i> Hoy</button>
                    <button type="button" class="calendar-footer-btn" id="cal-clear"><i data-lucide="trash-2" style="width:13px;height:13px;"></i> Borrar</button>
                </div>
            `;
            lucide.createIcons();

            popover.querySelector('#cal-prev').onclick = (e) => {
                e.stopPropagation();
                displayMonth--;
                if (displayMonth < 0) { displayMonth = 11; displayYear--; }
                renderCalendar();
            };

            popover.querySelector('#cal-next').onclick = (e) => {
                e.stopPropagation();
                displayMonth++;
                if (displayMonth > 11) { displayMonth = 0; displayYear++; }
                renderCalendar();
            };

            popover.querySelector('#cal-year-select').onchange = (e) => {
                displayYear = parseInt(e.target.value);
                renderCalendar();
            };

            popover.querySelectorAll('.calendar-day[data-date]').forEach(dayEl => {
                dayEl.onclick = (e) => {
                    e.stopPropagation();
                    input.value = dayEl.dataset.date;
                    updateTriggerText();
                    popover.classList.remove('open');
                };
            });

            popover.querySelector('#cal-today').onclick = (e) => {
                e.stopPropagation();
                const today = new Date();
                const m = String(today.getMonth() + 1).padStart(2, '0');
                const d = String(today.getDate()).padStart(2, '0');
                input.value = `${today.getFullYear()}-${m}-${d}`;
                displayYear = today.getFullYear();
                displayMonth = today.getMonth();
                updateTriggerText();
                popover.classList.remove('open');
            };

            popover.querySelector('#cal-clear').onclick = (e) => {
                e.stopPropagation();
                input.value = '';
                updateTriggerText();
                popover.classList.remove('open');
            };
        };

        renderCalendar();

        triggerBtn.onclick = (e) => {
            e.stopPropagation();
            const isOpen = popover.classList.contains('open');
            document.querySelectorAll('.custom-datepicker-popover.open').forEach(p => p.classList.remove('open'));
            if (!isOpen) {
                popover.classList.add('open');
            }
        };

        document.addEventListener('click', (e) => {
            if (!container.contains(e.target)) {
                popover.classList.remove('open');
            }
        });
    },

    debounce(func, wait = 250) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
