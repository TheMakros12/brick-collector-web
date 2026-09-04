const App = {
    currentView: 'search',
    searchState: {
        results: [],
        query: '',
        category: '',
        page: 1
    },
    collectionState: {
        tab: 'collection',
        searchQuery: '',
        sortBy: 'default',
        themeFilter: 'all',
        yearFilter: 'all',
        retiredFilter: 'all'
    },
    myPiecesState: {
        allPieces: null,
        colorFilter: 'all',
        setFilter: 'all',
        sortBy: 'quantity',
        loading: false
    },
    profileState: {
        mode: 'collection',
        selectedSetId: null,
        activeRankingTab: 'profit',
        themeSort: 'value',
        timeRange: 'all'
    },

    async init() {
        API.loadAllThemes();

        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.currentTarget.dataset.view;
                if (view) App.navigate(view);
            });
        });

        document.addEventListener('themeChanged', () => {
            if (App.currentView === 'profile') {
                setTimeout(() => {
                    App.renderProfile(document.getElementById('main-content'));
                }, 50);
            }
        });

        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then((reg) => {
                console.log('ServiceWorker PWA registrado con éxito:', reg.scope);
            }).catch((err) => {
                console.log('SW registration note:', err);
            });
        }

        await Storage.fetchAll();
        this.initPullToRefresh();
        App.navigate('search');
    },

    initPullToRefresh() {
        if (!('ontouchstart' in window)) return;
        let startY = 0;
        let pulling = false;
        const main = document.getElementById('main-content');
        if (!main) return;

        main.addEventListener('touchstart', (e) => {
            if (window.scrollY === 0) {
                startY = e.touches[0].pageY;
                pulling = true;
            }
        }, { passive: true });

        main.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const currentY = e.touches[0].pageY;
            const diff = currentY - startY;
            if (diff > 100 && window.scrollY === 0) {
                pulling = false;
                UI.hapticFeedback('medium');
                UI.showToast("Refrescando datos desde la nube...", "info");
                Storage.fetchAll().then(() => {
                    App.navigate(App.currentView);
                    UI.showToast("Datos actualizados", "success");
                });
            }
        }, { passive: true });

        main.addEventListener('touchend', () => { pulling = false; }, { passive: true });
    },

    navigate(view) {
        UI.hapticFeedback('light');
        this.currentView = view;
        const main = document.getElementById('main-content');
        const nav = document.getElementById('main-nav');
        const mobileNav = document.getElementById('mobile-bottom-nav');

        document.querySelectorAll('.nav-btn, .mobile-nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        if (nav) nav.classList.remove('hidden');
        if (mobileNav) mobileNav.classList.remove('hidden');

        if (view === 'search') this.renderSearch(main);
        else if (view === 'collection') this.renderCollection(main);
        else if (view === 'pieces') this.renderPieces(main);
        else if (view === 'profile') this.renderProfile(main);

        lucide.createIcons();
    },

    // --- DELEGATION TO VIEW MODULES ---
    renderSearch(container) { SearchView.render(container); },
    quickSearchCategory(catId) { SearchView.quickSearchCategory(catId); },
    performSearch() { SearchView.performSearch(); },
    loadMoreResults() { SearchView.loadMoreResults(); },

    renderCollection(container) { CollectionView.render(container); },
    setCollectionTab(tab) { CollectionView.setCollectionTab(tab); },
    updateCollectionListOnly() { CollectionView.updateCollectionListOnly(); },
    updateCollectionSearch(val) { CollectionView.updateCollectionSearch(val); },
    updateCollectionSort(val) { CollectionView.updateCollectionSort(val); },
    updateCollectionThemeFilter(val) { CollectionView.updateCollectionThemeFilter(val); },
    updateCollectionYearFilter(val) { CollectionView.updateCollectionYearFilter(val); },
    removeFromCollection(setId) { CollectionView.removeFromCollection(setId); },
    removeFromWishlist(setId) { CollectionView.removeFromWishlist(setId); },
    moveWishlistToCollection(setId) { CollectionView.moveWishlistToCollection(setId); },
    shareWishlist() { CollectionView.shareWishlist(); },
    exportPDF() { CollectionView.exportPDF(); },

    renderPieces(container) { PiecesView.render(container); },
    applyMyPiecesFilters() { PiecesView.applyMyPiecesFilters(); },
    resetMyPiecesCache() { PiecesView.resetMyPiecesCache(); },

    renderProfile(container) { StatsView.render(container); },
    setStatsMode(mode) { StatsView.setStatsMode(mode); },
    setRankingTab(tab) { StatsView.setRankingTab(tab); },
    onSelectSetForAnalysis(setId) { StatsView.onSelectSetForAnalysis(setId); },

    // --- ACTIONS FROM CARDS & MODALS ---
    async addFromSearch(setId, target) {
        const set = this.searchState.results.find(s => s.set_num === setId);
        if (set) {
            if (target === 'collection') {
                const exists = Storage.getCollection().find(s => s.set_num === set.set_num);
                if (exists) {
                    UI.showToast('El set ya está en tu colección', 'info');
                } else {
                    this.pendingAddSet = set;
                    App.openSetDetails(setId, true);
                }
            } else {
                const added = await Storage.addToWishlist(set);
                if (added) UI.showToast('Añadido a Lista de Deseos', 'success');
                else UI.showToast('El set ya está en tu lista de deseos', 'info');
            }
        }
    },

    async openSetDetails(setId, forceNewPurchase = false) {
        let set = Storage.getCollection().find(s => s.set_num === setId);
        let inCol = true;

        if (!set) {
            inCol = forceNewPurchase;
            set = Storage.getWishlist().find(s => s.set_num === setId);
            if (!set) {
                set = this.searchState.results.find(s => s.set_num === setId);
            }
            if (!set && this.pendingAddSet && this.pendingAddSet.set_num === setId) {
                set = this.pendingAddSet;
            }
        }

        if (set) {
            UI.renderSetDetails(set, inCol);
        }
    },

    handlePurchaseTypeChange(selectElem, estimatedPrice) {
        const group = document.getElementById('purchase-price-group');
        const priceInput = document.getElementById('purchase-price');
        const locInput = document.getElementById('purchase-location-input');

        if (selectElem.value === 'gift') {
            group.style.display = 'none';
            priceInput.value = 0;
            if (locInput && (!locInput.value || locInput.value.trim() === '')) {
                locInput.value = '🎁 Regalo (Origen Desconocido)';
            }
        } else {
            group.style.display = 'block';
            if (selectElem.value === 'self') {
                priceInput.value = estimatedPrice;
            } else if (selectElem.value === 'partial') {
                priceInput.value = '';
            }
            if (locInput && locInput.value === '🎁 Regalo (Origen Desconocido)') {
                locInput.value = '';
            }
        }
    },

    async savePurchaseDetails(setId) {
        const type = document.getElementById('purchase-type').value;
        const priceInput = document.getElementById('purchase-price');
        const dateInput = document.getElementById('purchase-date');
        const locInput = document.getElementById('purchase-location-input');

        const price = parseFloat(priceInput.value) || 0;
        const acquisitionDate = dateInput.value || new Date().toISOString().split('T')[0];
        const purchaseLocation = locInput ? locInput.value.trim() : '';

        let set = Storage.getCollection().find(s => s.set_num === setId);
        let isNew = false;

        if (!set && this.pendingAddSet && this.pendingAddSet.set_num === setId) {
            set = this.pendingAddSet;
            isNew = true;
        }

        if (isNew) {
            const added = await Storage.addToCollection(set);
            if (added) {
                const freshItem = Storage.getCollection().find(s => s.set_num === setId);
                if (freshItem && freshItem.itemId) {
                    await Storage.updateSetInCollection(freshItem.itemId, type === 'gift' ? 0 : price, acquisitionDate, type, purchaseLocation);
                }
                this.pendingAddSet = null;
                this.myPiecesState.allPieces = null;
                UI.showToast("Añadido a Colección con datos de compra", "success");
            }
        } else if (set && set.itemId) {
            await Storage.updateSetInCollection(set.itemId, type === 'gift' ? 0 : price, acquisitionDate, type, purchaseLocation);
            UI.showToast("Datos de compra actualizados", "success");
        }

        UI.closeModal(null, true);
        if (this.currentView === 'collection') {
            this.navigate('collection');
        }
    },

    async viewPieces(setId) {
        UI.showModal('<div class="text-center p-4"><i data-lucide="loader" class="spin"></i> Cargando piezas...</div>');
        lucide.createIcons();
        const pieces = await API.getSetPieces(setId);
        UI.renderPiecesList(pieces);
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

document.addEventListener('themeChanged', () => {
    if (App.currentView === 'profile') {
        App.navigate('profile');
    }
});
