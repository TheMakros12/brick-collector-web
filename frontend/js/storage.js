const Storage = {
    _collectionCache: [],
    _wishlistCache: [],



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
                retired: item.legoSet.retired,
                purchaseDetails: {
                    pricePaid: item.purchasePrice,
                    purchaseYear: item.purchaseYear,
                    acquisitionDate: item.acquisitionDate,
                    purchaseLocation: item.purchaseLocation,
                    type: item.acquisitionType ? (item.acquisitionType.toLowerCase() === 'purchased' ? 'self' : item.acquisitionType.toLowerCase()) : 'self'
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
                await API.fetchBackend(`/collection/remove/${item.itemId}?type=COLLECTION`, { method: 'DELETE' });
                await Storage.fetchAll();
            } catch(e) { console.error(e); }
        }
    },

    updateSetInCollection: async (itemId, purchasePrice, acquisitionDate, acquisitionType, purchaseLocation) => {
        try {
            let apiType = 'PURCHASED';
            if (acquisitionType === 'gift' || acquisitionType === 'GIFT') apiType = 'GIFT';
            else if (acquisitionType === 'partial' || acquisitionType === 'PARTIAL') apiType = 'PARTIAL';

            let purchaseYear = null;
            if (acquisitionDate) {
                const parts = acquisitionDate.split('-');
                if (parts.length > 0) purchaseYear = parseInt(parts[0]);
            }

            await API.fetchBackend(`/collection/update/${itemId}`, {
                method: 'PUT',
                body: JSON.stringify({ purchasePrice, acquisitionDate, purchaseYear, acquisitionType: apiType, purchaseLocation })
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
                await API.fetchBackend(`/collection/remove/${item.itemId}?type=WISHLIST`, { method: 'DELETE' });
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
