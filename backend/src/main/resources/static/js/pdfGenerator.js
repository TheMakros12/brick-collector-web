var PDFGenerator = window.PDFGenerator = {
    // Genera un Data URL PNG neutro local de 50x50px como placeholder si una imagen falla
    getPlaceholderImage() {
        if (this._placeholderCache) return this._placeholderCache;
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 50;
            canvas.height = 50;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = '#F3F4F6';
            ctx.fillRect(0, 0, 50, 50);
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 50, 50);
            ctx.fillStyle = '#9CA3AF';
            ctx.font = 'bold 10px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('LEGO', 25, 25);
            this._placeholderCache = canvas.toDataURL('image/png');
        } catch (e) {
            this._placeholderCache = null;
        }
        return this._placeholderCache;
    },

    // Detección de dispositivo móvil PWA / táctil estricto para evitar confundir portátiles táctiles de escritorio
    isMobileDevice() {
        const userAgent = navigator.userAgent || '';
        const isMobileUA = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
        return isMobileUA && (window.innerWidth <= 768 || 'ontouchstart' in window);
    },

    // Agrupa los sets por Categoría/Temática y los ordena en orden ASCENDENTE por número de Set (ID)
    groupAndSortItems(items) {
        const getCategory = (item) => {
            if (item.theme_name && item.theme_name.trim()) return item.theme_name.trim();
            if (window.API && API.getThemeName) {
                const name = API.getThemeName(item.theme_id);
                if (name && !name.startsWith('Tema ')) return name;
            }
            return 'Otros / General';
        };

        const parseSetId = (setNum) => {
            if (!setNum) return 0;
            const numPart = String(setNum).split('-')[0];
            return parseInt(numPart, 10) || 0;
        };

        const groups = {};
        items.forEach((item) => {
            const cat = getCategory(item);
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(item);
        });

        const sortedCategories = Object.keys(groups).sort((a, b) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

        const result = [];
        sortedCategories.forEach((catName) => {
            const sortedSets = groups[catName].sort((a, b) => parseSetId(a.set_num) - parseSetId(b.set_num));
            result.push({
                categoryName: catName,
                items: sortedSets
            });
        });

        return result;
    },

    // Precarga fotos en lotes de 5 para evitar la saturación de conexiones HTTP del navegador
    async preloadImagesInBatches(items, batchSize = 5) {
        const placeholder = this.getPlaceholderImage();
        const results = [];
        for (let i = 0; i < items.length; i += batchSize) {
            const batch = items.slice(i, i + batchSize);
            const processedBatch = await Promise.all(batch.map(async (item) => {
                const proxyUrl = API.getProxyImageUrl(item.set_img_url);
                const b64 = await UI.urlToBase64(proxyUrl, 6000);
                return {
                    ...item,
                    renderImg: (b64 && b64.startsWith('data:image/')) ? b64 : placeholder
                };
            }));
            results.push(...processedBatch);
        }
        return results;
    },

    // Construye una fila de 3 tarjetas en grid con altura adaptativa unbreakable por fila
    buildGridRow(itemsRow, type, placeholder) {
        const cells = itemsRow.map((item) => {
            if (!item) {
                return { border: [false, false, false, false], text: '' };
            }
            const setIdShort = item.set_num ? item.set_num.split('-')[0] : '';
            const priceVal = (item.retail_price || 0).toFixed(2).replace('.', ',');
            const partsVal = (item.num_parts || 0).toLocaleString('es');
            const imgSource = item.renderImg || placeholder;

            const headerColumns = (type === 'collection') ? [
                { text: '#' + setIdShort, style: 'badgeCollection', alignment: 'left' },
                { text: partsVal + ' pcs', style: 'itemValueParts', alignment: 'right' }
            ] : [
                { text: '#' + setIdShort, style: 'badgeWishlist', alignment: 'left' }
            ];

            const priceSection = (type === 'collection') ? {
                margin: [0, 4, 0, 0],
                alignment: 'right',
                stack: [
                    { text: 'PRECIO / PVP', style: 'itemLabel' },
                    { text: priceVal + ' €', style: 'itemValuePrice' }
                ]
            } : {
                margin: [0, 4, 0, 0],
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            fillColor: '#ECFDF5',
                            margin: [4, 4, 4, 4],
                            alignment: 'center',
                            stack: [
                                { text: 'P.V.P. RECOMENDADO', style: 'wishlistPvpLabel' },
                                { text: priceVal + ' €', style: 'wishlistPvpValue' }
                            ]
                        }
                    ]]
                },
                layout: 'noBorders'
            };

            return {
                fillColor: '#FFFFFF',
                margin: [6, 8, 6, 8],
                stack: [
                    {
                        columns: headerColumns,
                        margin: [0, 0, 0, 6]
                    },
                    {
                        margin: [0, 2, 0, 8],
                        alignment: 'center',
                        image: imgSource,
                        fit: [140, 105]
                    },
                    {
                        text: item.name || '',
                        fontSize: 9.5,
                        bold: true,
                        color: '#1E293B',
                        lineHeight: 1.25,
                        margin: [0, 0, 0, 8]
                    },
                    priceSection
                ]
            };
        });

        // Rellenar con celdas invisibles sin borde si la fila tiene menos de 3 items
        while (cells.length < 3) {
            cells.push({ border: [false, false, false, false], text: '' });
        }

        return {
            margin: [0, 0, 0, 10],
            unbreakable: true,
            table: {
                widths: ['*', '*', '*'],
                body: [cells]
            },
            layout: {
                hLineWidth: () => 0.75,
                vLineWidth: () => 0.75,
                hLineColor: () => '#E2E8F0',
                vLineColor: () => '#E2E8F0'
            }
        };
    },

    // Constructor aislado para el Informe de Colección en Grid Editorial (3x3)
    buildCollectionDoc(groupedCategories, totalSetsCount, totalPieces, totalValue, logoBase64, dateString) {
        const placeholder = this.getPlaceholderImage();
        const content = [];

        // 1. Cabecera (Header)
        content.push({
            margin: [0, 0, 0, 16],
            columns: [
                {
                    width: 'auto',
                    margin: [0, 0, 12, 0],
                    image: logoBase64 || placeholder,
                    fit: [44, 44]
                },
                {
                    width: '*',
                    stack: [
                        { text: 'INFORME DE COLECCIÓN LEGO®', style: 'headerTitle' },
                        { text: 'Inventario Consolidado por Categorías y Sets', style: 'headerSubtitle' }
                    ]
                },
                {
                    width: 'auto',
                    alignment: 'right',
                    stack: [
                        { text: 'FECHA DE EMISIÓN', style: 'dateLabel' },
                        { text: dateString, style: 'dateValue' }
                    ]
                }
            ]
        });

        // Línea divisoria
        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525.28, y2: 0, lineWidth: 1.5, lineColor: '#E5E7EB' }],
            margin: [0, 0, 0, 16]
        });

        // 2. Tarjetas KPIs (3 columnas)
        content.push({
            margin: [0, 0, 0, 18],
            table: {
                widths: ['*', '*', '*'],
                body: [[
                    {
                        fillColor: '#F9FAFB',
                        margin: [8, 8, 8, 8],
                        stack: [
                            { text: 'TOTAL SETS', style: 'kpiLabel' },
                            { text: String(totalSetsCount), style: 'kpiValueRed' }
                        ]
                    },
                    {
                        fillColor: '#F9FAFB',
                        margin: [8, 8, 8, 8],
                        stack: [
                            { text: 'PIEZAS TOTALES', style: 'kpiLabel' },
                            { text: totalPieces.toLocaleString('es') + ' pcs', style: 'kpiValueDark' }
                        ]
                    },
                    {
                        fillColor: '#F9FAFB',
                        margin: [8, 8, 8, 8],
                        stack: [
                            { text: 'VALOR ESTIMADO / P.V.P.', style: 'kpiLabel' },
                            { text: totalValue.toFixed(2).replace('.', ',') + ' €', style: 'kpiValueGreen' }
                        ]
                    }
                ]]
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#E5E7EB',
                vLineColor: () => '#E5E7EB'
            }
        });

        // 3. Catálogo Editorial en Grid (3 Columnas) por Categoría
        groupedCategories.forEach((group) => {
            content.push({
                margin: [0, 10, 0, 8],
                unbreakable: true,
                keepWithNext: true,
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            fillColor: '#F3F4F6',
                            margin: [8, 5, 8, 5],
                            columns: [
                                {
                                    text: group.categoryName.toUpperCase(),
                                    fontSize: 10,
                                    bold: true,
                                    color: '#E3000B'
                                },
                                {
                                    text: group.items.length + (group.items.length === 1 ? ' set' : ' sets'),
                                    fontSize: 9,
                                    bold: true,
                                    color: '#6B7280',
                                    alignment: 'right'
                                }
                            ]
                        }
                    ]]
                },
                layout: 'noBorders'
            });

            for (let i = 0; i < group.items.length; i += 3) {
                const chunk = group.items.slice(i, i + 3);
                content.push(this.buildGridRow(chunk, 'collection', placeholder));
            }
        });

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [35, 40, 35, 45],
            content: content,
            footer: function (currentPage, pageCount) {
                return {
                    margin: [35, 12, 35, 0],
                    columns: [
                        {
                            text: 'Brick Collector Web — Informe de Inventario de Colección',
                            fontSize: 8.5,
                            color: '#9CA3AF'
                        },
                        {
                            text: 'Página ' + currentPage + ' de ' + pageCount,
                            fontSize: 8.5,
                            color: '#9CA3AF',
                            alignment: 'right'
                        }
                    ]
                };
            },
            styles: this.getCommonStyles()
        };
    },

    // Constructor aislado para la Lista de Deseos en Grid Editorial (3x3)
    buildWishlistDoc(groupedCategories, totalSetsCount, totalValue, logoBase64, dateString) {
        const placeholder = this.getPlaceholderImage();
        const content = [];

        // 1. Cabecera (Header)
        content.push({
            margin: [0, 0, 0, 16],
            columns: [
                {
                    width: 'auto',
                    margin: [0, 0, 12, 0],
                    image: logoBase64 || placeholder,
                    fit: [44, 44]
                },
                {
                    width: '*',
                    stack: [
                        { text: 'MI LISTA DE DESEOS LEGO®', style: 'headerTitle' },
                        { text: 'Ideas de Regalo y Sets Deseados por Categorías', style: 'headerSubtitle' }
                    ]
                },
                {
                    width: 'auto',
                    alignment: 'right',
                    stack: [
                        { text: 'FECHA DE EMISIÓN', style: 'dateLabel' },
                        { text: dateString, style: 'dateValue' }
                    ]
                }
            ]
        });

        // Línea divisoria
        content.push({
            canvas: [{ type: 'line', x1: 0, y1: 0, x2: 525.28, y2: 0, lineWidth: 1.5, lineColor: '#E5E7EB' }],
            margin: [0, 0, 0, 16]
        });

        // 2. Tarjetas KPIs (2 columnas)
        const setsText = totalSetsCount + ' ' + (totalSetsCount !== 1 ? 'sets' : 'set');
        content.push({
            margin: [0, 0, 0, 18],
            table: {
                widths: ['*', '*'],
                body: [[
                    {
                        fillColor: '#F9FAFB',
                        margin: [8, 8, 8, 8],
                        stack: [
                            { text: 'SETS DESEADOS', style: 'kpiLabel' },
                            { text: setsText, style: 'kpiValueRed' }
                        ]
                    },
                    {
                        fillColor: '#F9FAFB',
                        margin: [8, 8, 8, 8],
                        stack: [
                            { text: 'P.V.P. TOTAL ESTIMADO', style: 'kpiLabel' },
                            { text: totalValue.toFixed(2).replace('.', ',') + ' €', style: 'kpiValueGreen' }
                        ]
                    }
                ]]
            },
            layout: {
                hLineWidth: () => 1,
                vLineWidth: () => 1,
                hLineColor: () => '#E5E7EB',
                vLineColor: () => '#E5E7EB'
            }
        });

        // 3. Catálogo Editorial en Grid (3 Columnas) por Categoría
        groupedCategories.forEach((group) => {
            content.push({
                margin: [0, 10, 0, 8],
                unbreakable: true,
                keepWithNext: true,
                table: {
                    widths: ['*'],
                    body: [[
                        {
                            fillColor: '#F3F4F6',
                            margin: [8, 5, 8, 5],
                            columns: [
                                {
                                    text: group.categoryName.toUpperCase(),
                                    fontSize: 10,
                                    bold: true,
                                    color: '#E3000B'
                                },
                                {
                                    text: group.items.length + (group.items.length === 1 ? ' set' : ' sets'),
                                    fontSize: 9,
                                    bold: true,
                                    color: '#6B7280',
                                    alignment: 'right'
                                }
                            ]
                        }
                    ]]
                },
                layout: 'noBorders'
            });

            for (let i = 0; i < group.items.length; i += 3) {
                const chunk = group.items.slice(i, i + 3);
                content.push(this.buildGridRow(chunk, 'wishlist', placeholder));
            }
        });

        return {
            pageSize: 'A4',
            pageOrientation: 'portrait',
            pageMargins: [35, 40, 35, 45],
            content: content,
            footer: function (currentPage, pageCount) {
                return {
                    margin: [35, 12, 35, 0],
                    columns: [
                        {
                            text: 'Brick Collector Web — Lista de Deseos Compartida',
                            fontSize: 8.5,
                            color: '#9CA3AF'
                        },
                        {
                            text: 'Página ' + currentPage + ' de ' + pageCount,
                            fontSize: 8.5,
                            color: '#9CA3AF',
                            alignment: 'right'
                        }
                    ]
                };
            },
            styles: this.getCommonStyles()
        };
    },

    // Estilos visuales comunes del sistema de diseño
    getCommonStyles() {
        return {
            headerTitle: {
                fontSize: 16,
                bold: true,
                color: '#111827'
            },
            headerSubtitle: {
                fontSize: 9.5,
                color: '#6B7280',
                margin: [0, 2, 0, 0]
            },
            dateLabel: {
                fontSize: 8,
                bold: true,
                color: '#9CA3AF'
            },
            dateValue: {
                fontSize: 10,
                bold: true,
                color: '#111827',
                margin: [0, 2, 0, 0]
            },
            kpiLabel: {
                fontSize: 8,
                bold: true,
                color: '#6B7280'
            },
            kpiValueRed: {
                fontSize: 16,
                bold: true,
                color: '#E3000B',
                margin: [0, 2, 0, 0]
            },
            kpiValueDark: {
                fontSize: 16,
                bold: true,
                color: '#111827',
                margin: [0, 2, 0, 0]
            },
            kpiValueGreen: {
                fontSize: 15,
                bold: true,
                color: '#10B981',
                margin: [0, 2, 0, 0]
            },
            badgeCollection: {
                fontSize: 8.5,
                bold: true,
                color: '#1E293B'
            },
            badgeWishlist: {
                fontSize: 8.5,
                bold: true,
                color: '#E3000B'
            },
            itemLabel: {
                fontSize: 7.5,
                bold: true,
                color: '#9CA3AF'
            },
            itemValueParts: {
                fontSize: 8.5,
                bold: true,
                color: '#64748B'
            },
            itemValuePrice: {
                fontSize: 10.5,
                bold: true,
                color: '#059669',
                margin: [0, 1, 0, 0]
            },
            wishlistPvpLabel: {
                fontSize: 7.5,
                bold: true,
                color: '#047857'
            },
            wishlistPvpValue: {
                fontSize: 10.5,
                bold: true,
                color: '#047857',
                margin: [0, 1, 0, 0]
            }
        };
    },

    // Punto de entrada principal para generar el PDF
    async generate() {
        if (typeof pdfMake === 'undefined') {
            return UI.showToast("No se pudo cargar la librería PDF (pdfmake). Revisa tu conexión.", "error");
        }

        const isCol = App.collectionState.tab === 'collection';
        const rawItems = isCol ? Storage.getCollection() : Storage.getWishlist();
        if (!rawItems || rawItems.length === 0) {
            return UI.showToast("La lista está vacía.", "error");
        }

        UI.showToast("Generando informe PDF en alta definición...", "info");

        // Cálculo exacto de la lógica de datos original
        const totalPieces = isCol ? rawItems.reduce((sum, i) => sum + (i.num_parts || 0), 0) : 0;
        const totalValue = isCol
            ? rawItems.reduce((sum, s) => sum + (s.market_value || s.retail_price || 0), 0)
            : rawItems.reduce((sum, i) => sum + (i.retail_price || 0), 0);

        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

        const placeholder = this.getPlaceholderImage();
        const logoUrl = window.location.origin + '/Lego.webp';
        const logoB64 = await UI.urlToBase64(logoUrl, 2000);
        const logoBase64 = (logoB64 && logoB64.startsWith('data:image/')) ? logoB64 : placeholder;

        // Precarga de fotos de sets en LOTES DE 5 (evita la saturación del navegador)
        const itemsWithImages = await this.preloadImagesInBatches(rawItems, 5);

        // Agrupación por Categoría y Ordenación Ascendente por ID de Set (#XXXXX)
        const groupedCategories = this.groupAndSortItems(itemsWithImages);

        const docDefinition = isCol
            ? this.buildCollectionDoc(groupedCategories, rawItems.length, totalPieces, totalValue, logoBase64, dateString)
            : this.buildWishlistDoc(groupedCategories, rawItems.length, totalValue, logoBase64, dateString);

        const filename = isCol ? 'Lego_Collection_Report.pdf' : 'Lego_Wishlist_Report.pdf';
        const title = isCol ? 'Mi Colección LEGO' : 'Mi Lista de Deseos LEGO';
        const shareText = isCol ? 'Te comparto mi informe de Colección LEGO® en PDF.' : 'Te comparto mi Lista de Deseos LEGO® en PDF.';

        try {
            const pdfObj = pdfMake.createPdf(docDefinition);

            // Intentar compartir vía Web Share API ÚNICAMENTE en PWA / Móvil
            if (this.isMobileDevice() && navigator.share && navigator.canShare) {
                pdfObj.getBlob(async (blob) => {
                    if (!blob) return pdfObj.download(filename);
                    try {
                        const pdfFile = new File([blob], filename, { type: 'application/pdf' });
                        if (navigator.canShare({ files: [pdfFile] })) {
                            await navigator.share({
                                files: [pdfFile],
                                title: title,
                                text: shareText
                            });
                            UI.showToast("PDF compartido con éxito.", "success");
                        } else {
                            pdfObj.download(filename);
                            UI.showToast("PDF generado y descargado con éxito.", "success");
                        }
                    } catch (shareErr) {
                        if (shareErr && (shareErr.name === 'AbortError' || (shareErr.message && shareErr.message.toLowerCase().includes('abort')))) {
                            console.log("WebShare cancelado voluntariamente por el usuario.");
                            return;
                        }
                        console.log("WebShare error técnico, descargando archivo...", shareErr);
                        pdfObj.download(filename);
                        UI.showToast("PDF generado y descargado con éxito.", "success");
                    }
                });
            } else {
                pdfObj.download(filename);
                UI.showToast("PDF generado y descargado con éxito.", "success");
            }
        } catch (e) {
            console.error("Error compilando PDF con pdfmake:", e);
            UI.showToast("Error al procesar el PDF.", "error");
        }
    }
};
