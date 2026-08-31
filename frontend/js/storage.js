const Storage = {
    _collectionCache: [],
    _wishlistCache: [],

    async runMigration() {
        const oldCol = localStorage.getItem('brickcollector_collection');
        const oldWish = localStorage.getItem('brickcollector_wishlist');
        
        if (oldCol) {
            console.log("Migrando Colección...");
            const items = JSON.parse(oldCol);
            for (let set of items) {
                try {
                    await API.fetchBackend('/collection/add', {
                        method: 'POST',
                        body: JSON.stringify({ setId: set.set_num, type: 'COLLECTION' })
                    });
                } catch(e) { console.error("Error migrando", set.set_num) }
            }
            localStorage.removeItem('brickcollector_collection');
        }
        
        if (oldWish) {
            console.log("Migrando Wishlist...");
            const items = JSON.parse(oldWish);
            for (let set of items) {
                try {
                    await API.fetchBackend('/collection/add', {
                        method: 'POST',
                        body: JSON.stringify({ setId: set.set_num, type: 'WISHLIST' })
                    });
                } catch(e) { console.error("Error migrando", set.set_num) }
            }
            localStorage.removeItem('brickcollector_wishlist');
        }
    },

    async fetchAll() {
        try {
            const col = await API.fetchBackend('/collection/?type=COLLECTION');
            const wish = await API.fetchBackend('/collection/?type=WISHLIST');
            
            const mapItem = (item) => ({
                itemId: item.id,
                set_num: item.legoSet.set_num,
                name: item.legoSet.name,
                year: item.legoSet.year,
                num_parts: item.legoSet.num_parts,
                set_img_url: item.legoSet.set_img_url,
                retail_price: item.legoSet.retail_price,
                market_value: item.legoSet.market_value,
                theme_id: item.legoSet.theme_id,
                purchaseDetails: {
                    pricePaid: item.purchasePrice,
                    purchaseYear: item.purchaseYear
                }
            });

            Storage._collectionCache = (col || []).map(mapItem);
            Storage._wishlistCache = (wish || []).map(mapItem);
        } catch (e) {
            console.error("Error cargando colección", e);
        }
    },

    getCollection: () => Storage._collectionCache,
    getWishlist: () => Storage._wishlistCache,
    
    addToCollection: async (set) => {
        try {
            await API.fetchBackend('/collection/add', {
                method: 'POST',
                body: JSON.stringify({ setId: set.set_num, type: 'COLLECTION' })
            });
            await Storage.fetchAll();
            return true;
        } catch(e) { 
            console.error(e); 
            return false;
        }
    },
    
    removeFromCollection: async (setId) => {
        const item = Storage.getCollection().find(s => s.set_num === setId);
        if (item && item.itemId) {
            try {
                await API.fetchBackend(`/collection/remove/${item.itemId}`, { method: 'DELETE' });
                await Storage.fetchAll();
            } catch(e) { console.error(e); }
        }
    },

    updateSetInCollection: async (itemId, purchasePrice, purchaseYear) => {
        try {
            await API.fetchBackend(`/collection/update/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ purchasePrice, purchaseYear })
            });
            await Storage.fetchAll();
        } catch (e) {
            console.error(e);
        }
    },

    addToWishlist: async (set) => {
        try {
            await API.fetchBackend('/collection/add', {
                method: 'POST',
                body: JSON.stringify({ setId: set.set_num, type: 'WISHLIST' })
            });
            await Storage.fetchAll();
            return true;
        } catch(e) { 
            console.error(e); 
            return false;
        }
    },
    
    removeFromWishlist: async (setId) => {
        const item = Storage.getWishlist().find(s => s.set_num === setId);
        if (item && item.itemId) {
            try {
                await API.fetchBackend(`/collection/remove/${item.itemId}`, { method: 'DELETE' });
                await Storage.fetchAll();
            } catch(e) { console.error(e); }
        }
    },
    
    moveToCollection: async (setId) => {
        const item = Storage.getWishlist().find(s => s.set_num === setId);
        if (item && item.itemId) {
            try {
                await API.fetchBackend(`/collection/move/${item.itemId}`, {
                    method: 'PUT',
                    body: JSON.stringify({ type: 'COLLECTION' })
                });
                await Storage.fetchAll();
            } catch(e) { console.error(e); }
        }
    }
};
