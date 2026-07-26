const Storage = {
    USER_KEY: 'brickcollector_user',
    TOKEN_KEY: 'brickcollector_token',
    COLLECTION_KEY: 'brickcollector_collection',
    WISHLIST_KEY: 'brickcollector_wishlist',

    // User Data
    getUser: () => JSON.parse(localStorage.getItem(Storage.USER_KEY)),
    
    // Auth methods
    async login(email, password) {
        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            if (!response.ok) throw new Error('Credenciales incorrectas');
            
            const data = await response.json();
            localStorage.setItem(Storage.TOKEN_KEY, data.token);
            localStorage.setItem(Storage.USER_KEY, JSON.stringify(data.user));
            
            // Sync after login
            await this.syncFromBackend();
            return data.user;
        } catch (e) {
            console.error("Login Error:", e);
            throw e;
        }
    },
    
    async register(name, lastName, email, password) {
        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, lastName, email, password })
            });
            if (!response.ok) throw new Error('Error al registrar');
            return await response.json();
        } catch (e) {
            throw e;
        }
    },
    
    logout() {
        localStorage.removeItem(Storage.USER_KEY);
        localStorage.removeItem(Storage.TOKEN_KEY);
        localStorage.removeItem(Storage.COLLECTION_KEY);
        localStorage.removeItem(Storage.WISHLIST_KEY);
    },

    // Sync methods
    async syncFromBackend() {
        if (!localStorage.getItem(Storage.TOKEN_KEY)) return;
        try {
            const colResponse = await API.fetchBackend('/collection/?type=COLLECTION');
            const wishResponse = await API.fetchBackend('/collection/?type=WISHLIST');
            
            const fullCol = await Promise.all((colResponse || []).map(async item => {
                const details = await API.getSetDetails(item.setId);
                return { ...details, itemId: item.id, addedAt: item.addedAt, buildTracker: item.buildTracker };
            }));
            
            const fullWish = await Promise.all((wishResponse || []).map(async item => {
                const details = await API.getSetDetails(item.setId);
                return { ...details, itemId: item.id, addedAt: item.addedAt };
            }));
            
            localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(fullCol));
            localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(fullWish));
        } catch (e) {
            console.error("Error sincronizando del backend", e);
        }
    },

    // Collection
    getCollection: () => JSON.parse(localStorage.getItem(Storage.COLLECTION_KEY)) || [],
    
    addToCollection: async (set) => {
        const collection = Storage.getCollection();
        if (!collection.find(s => s.set_num === set.set_num)) {
            // Optimistic update
            set.buildTracker = { active: false, totalBags: 0, currentBag: 0, startDate: null, endDate: null };
            set.addedAt = new Date().toISOString();
            collection.push(set);
            localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(collection));
            
            if (localStorage.getItem(Storage.TOKEN_KEY)) {
                try {
                    const saved = await API.fetchBackend('/collection/add', {
                        method: 'POST',
                        body: JSON.stringify({ setId: set.set_num, type: 'COLLECTION' })
                    });
                    // Update the set with backend's DB itemId
                    set.itemId = saved.id;
                    localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(collection));
                } catch(e) { console.error(e); }
            }
            return true;
        }
        return false;
    },
    
    removeFromCollection: async (setId) => {
        let collection = Storage.getCollection();
        const set = collection.find(s => s.set_num === setId);
        collection = collection.filter(s => s.set_num !== setId);
        localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(collection));
        
        if (localStorage.getItem(Storage.TOKEN_KEY) && set && set.itemId) {
            try {
                await API.fetchBackend(`/collection/remove/${set.itemId}`, { method: 'DELETE' });
            } catch(e) { console.error(e); }
        }
    },

    updateSetInCollection: (updatedSet) => {
        const collection = Storage.getCollection();
        const index = collection.findIndex(s => s.set_num === updatedSet.set_num);
        if (index !== -1) {
            collection[index] = updatedSet;
            localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(collection));
            // TODO: si backend soportara updateBuildTracker, llamaríamos a la API aquí.
        }
    },

    // Wishlist
    getWishlist: () => JSON.parse(localStorage.getItem(Storage.WISHLIST_KEY)) || [],
    
    addToWishlist: async (set) => {
        const wishlist = Storage.getWishlist();
        if (!wishlist.find(s => s.set_num === set.set_num)) {
            set.addedAt = new Date().toISOString();
            wishlist.push(set);
            localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(wishlist));
            
            if (localStorage.getItem(Storage.TOKEN_KEY)) {
                try {
                    const saved = await API.fetchBackend('/collection/add', {
                        method: 'POST',
                        body: JSON.stringify({ setId: set.set_num, type: 'WISHLIST' })
                    });
                    set.itemId = saved.id;
                    localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(wishlist));
                } catch(e) { console.error(e); }
            }
            return true;
        }
        return false;
    },
    
    removeFromWishlist: async (setId) => {
        let wishlist = Storage.getWishlist();
        const set = wishlist.find(s => s.set_num === setId);
        wishlist = wishlist.filter(s => s.set_num !== setId);
        localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(wishlist));
        
        if (localStorage.getItem(Storage.TOKEN_KEY) && set && set.itemId) {
            try {
                await API.fetchBackend(`/collection/remove/${set.itemId}`, { method: 'DELETE' });
            } catch(e) { console.error(e); }
        }
    },
    
    moveToCollection: async (set) => {
        await Storage.removeFromWishlist(set.set_num);
        return await Storage.addToCollection(set);
    },

    // Danger Zone
    clearAll: () => {
        Storage.logout();
    }
};
