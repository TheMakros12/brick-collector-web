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

    // Constructor aislado para el Informe de Colección
    buildCollectionDoc(items, totalPieces, totalValue, logoBase64, dateString) {
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
                        { text: 'Inventario Consolidado de Piezas y Sets', style: 'headerSubtitle' }
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
                            { text: String(items.length), style: 'kpiValueRed' }
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

        // 3. Listado por Set (Colección)
        items.forEach((i) => {
            const setIdShort = i.set_num.split('-')[0];
            const priceVal = (i.retail_price || 0).toFixed(2).replace('.', ',');
            const partsVal = (i.num_parts || 0).toLocaleString('es');
            const imgSource = i.renderImg || placeholder;

            // Salvaguarda: escala de fuente si el nombre es excepcionalmente largo (>50 caracteres), SIN truncar jamás
            const titleFontSize = i.name.length > 70 ? 9.5 : (i.name.length > 50 ? 10.5 : 11.5);

            content.push({
                margin: [0, 0, 0, 8],
                unbreakable: true,
                table: {
                    dontBreakRows: true,
                    widths: [54, '*', 'auto'],
                    body: [[
                        // Columna 1: Imagen del Set (Escalado fit: [50, 50])
                        {
                            margin: [2, 2, 6, 2],
                            alignment: 'center',
                            valign: 'middle',
                            image: imgSource,
                            fit: [50, 50]
                        },
                        // Columna 2: Badge #Set + Nombre oficial completo (text wrap)
                        {
                            margin: [4, 2, 8, 2],
                            stack: [
                                {
                                    text: '#' + setIdShort,
                                    style: 'badgeCollection',
                                    margin: [0, 0, 0, 4]
                                },
                                {
                                    text: i.name,
                                    fontSize: titleFontSize,
                                    bold: true,
                                    color: '#111827',
                                    lineHeight: 1.25
                                }
                            ]
                        },
                        // Columna 3: Piezas + Precio / PVP
                        {
                            margin: [4, 2, 4, 2],
                            alignment: 'right',
                            table: {
                                widths: ['auto', 'auto'],
                                body: [[
                                    {
                                        margin: [0, 0, 12, 0],
                                        alignment: 'right',
                                        stack: [
                                            { text: 'PIEZAS', style: 'itemLabel' },
                                            { text: partsVal + ' pcs', style: 'itemValueParts' }
                                        ]
                                    },
                                    {
                                        alignment: 'right',
                                        stack: [
                                            { text: 'PRECIO / PVP', style: 'itemLabel' },
                                            { text: priceVal + ' €', style: 'itemValuePrice' }
                                        ]
                                    }
                                ]]
                            },
                            layout: 'noBorders'
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

    // Constructor aislado para la Lista de Deseos
    buildWishlistDoc(items, totalValue, logoBase64, dateString) {
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
                        { text: 'Ideas de Regalo y Sets Deseados', style: 'headerSubtitle' }
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
        const setsText = items.length + ' ' + (items.length !== 1 ? 'sets' : 'set');
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

        // 3. Listado por Set (Wishlist)
        items.forEach((i) => {
            const setIdShort = i.set_num.split('-')[0];
            const priceVal = (i.retail_price || 0).toFixed(2).replace('.', ',');
            const imgSource = i.renderImg || placeholder;

            const titleFontSize = i.name.length > 70 ? 9.5 : (i.name.length > 50 ? 10.5 : 11.5);

            content.push({
                margin: [0, 0, 0, 8],
                unbreakable: true,
                table: {
                    dontBreakRows: true,
                    widths: [54, '*', 'auto'],
                    body: [[
                        // Columna 1: Imagen del Set (Escalado fit: [50, 50])
                        {
                            margin: [2, 2, 6, 2],
                            alignment: 'center',
                            valign: 'middle',
                            image: imgSource,
                            fit: [50, 50]
                        },
                        // Columna 2: Badge Rojo #Set + Nombre oficial completo
                        {
                            margin: [4, 2, 8, 2],
                            stack: [
                                {
                                    text: '#' + setIdShort,
                                    style: 'badgeWishlist',
                                    margin: [0, 0, 0, 4]
                                },
                                {
                                    text: i.name,
                                    fontSize: titleFontSize,
                                    bold: true,
                                    color: '#111827',
                                    lineHeight: 1.25
                                }
                            ]
                        },
                        // Columna 3: Recuadro Destacado PVP Recomendado (Verde)
                        {
                            margin: [2, 2, 2, 2],
                            fillColor: '#F0FDF4',
                            alignment: 'right',
                            stack: [
                                { text: 'P.V.P. RECOMENDADO', style: 'wishlistPvpLabel' },
                                { text: priceVal + ' €', style: 'wishlistPvpValue' }
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
                color: '#374151'
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
                fontSize: 10,
                bold: true,
                color: '#374151',
                margin: [0, 1, 0, 0]
            },
            itemValuePrice: {
                fontSize: 11,
                bold: true,
                color: '#10B981',
                margin: [0, 1, 0, 0]
            },
            wishlistPvpLabel: {
                fontSize: 7.5,
                bold: true,
                color: '#166534'
            },
            wishlistPvpValue: {
                fontSize: 11,
                bold: true,
                color: '#15803D',
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
        const items = isCol ? Storage.getCollection() : Storage.getWishlist();
        if (!items || items.length === 0) {
            return UI.showToast("La lista está vacía.", "error");
        }

        UI.showToast("Generando informe PDF en alta definición...", "info");

        // Cálculo exacto de la lógica de datos original
        const totalPieces = isCol ? items.reduce((sum, i) => sum + (i.num_parts || 0), 0) : 0;
        const totalValue = isCol
            ? items.reduce((sum, s) => sum + (s.purchaseDetails?.pricePaid ? parseFloat(s.purchaseDetails.pricePaid) : (s.retail_price || 0)), 0)
            : items.reduce((sum, i) => sum + (i.retail_price || 0), 0);

        const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
        const dateString = new Date().toLocaleDateString('es-ES', dateOptions).toUpperCase();

        const logoUrl = window.location.origin + '/Lego.webp';
        const logoBase64 = (await UI.urlToBase64(logoUrl, 1500)) || logoUrl;

        // Precarga de fotos de sets a Base64 en paralelo (timeout 1800ms por foto)
        const itemsWithImages = await Promise.all(items.map(async (item) => {
            const proxyUrl = API.getProxyImageUrl(item.set_img_url);
            const b64 = await UI.urlToBase64(proxyUrl, 1800);
            return {
                ...item,
                renderImg: b64 || proxyUrl
            };
        }));

        const docDefinition = isCol
            ? this.buildCollectionDoc(itemsWithImages, totalPieces, totalValue, logoBase64, dateString)
            : this.buildWishlistDoc(itemsWithImages, totalValue, logoBase64, dateString);

        const filename = isCol ? 'Lego_Collection_Report.pdf' : 'Lego_Wishlist_Report.pdf';
        const title = isCol ? 'Mi Colección LEGO' : 'Mi Lista de Deseos LEGO';
        const shareText = isCol ? 'Te comparto mi informe de Colección LEGO® en PDF.' : 'Te comparto mi Lista de Deseos LEGO® en PDF.';

        try {
            const pdfObj = pdfMake.createPdf(docDefinition);

            // Intentar compartir vía Web Share API si está disponible en PWA / Móvil
            if (navigator.share && navigator.canShare) {
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
                        console.log("WebShare cancelado o no soportado, descargando archivo...", shareErr);
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
