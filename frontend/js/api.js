const API = {
    REBRICKABLE_KEY: 'f138411743940f84bc3cd94fbdc27848',
    BRICKSET_KEY: '3-W4P3-9bW4',
    
    // Categories mappings that the user wants
    CATEGORIES: [
        { id: 'technic', name: 'Technic', rebrickableId: 1 },
        { id: 'speed-champions', name: 'Speed Champions', rebrickableId: 608 },
        { id: 'icons', name: 'Icons', rebrickableId: 721 }, 
        { id: 'star-wars', name: 'Star Wars', rebrickableId: 158 },
        { id: 'botanicals', name: 'Botanicals', rebrickableId: 710 }, 
        { id: 'marvel', name: 'Marvel', rebrickableId: 696 }, 
        { id: 'nike', name: 'Nike', rebrickableId: null }, 
        { id: 'infinity-saga', name: 'The Infinity Saga', rebrickableId: 709 },
        { id: 'pokemon', name: 'Pokemon', rebrickableId: null } 
    ],

    async fetchRebrickable(endpoint) {
        try {
            const response = await fetch(`https://rebrickable.com/api/v3/lego${endpoint}`, {
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `key ${this.REBRICKABLE_KEY}`
                }
            });
            if (!response.ok) throw new Error('Network response was not ok');
            return await response.json();
        } catch (error) {
            console.error("Rebrickable API Error:", error);
            return null;
        }
    },

    async searchSets(query, categoryId = null) {
        // If we have a query, search by it. Otherwise just list from category
        let endpoint = `/sets/?page_size=20&ordering=-year`;
        if (query) {
            endpoint += `&search=${encodeURIComponent(query)}`;
        }
        
        if (categoryId) {
            const category = this.CATEGORIES.find(c => c.id === categoryId);
            if (category && category.rebrickableId) {
                endpoint += `&theme_id=${category.rebrickableId}`;
            }
        }
        
        const data = await this.fetchRebrickable(endpoint);
        if (data && data.results) {
            // Fetch prices for all results asynchronously
            const setsWithPrices = await Promise.all(data.results.map(async (set) => {
                const price = await this.getEstimatedPrice(set.set_num, set.num_parts);
                return { ...set, estimated_price: price };
            }));
            return setsWithPrices;
        }
        return [];
    },

    async getSetDetails(setId) {
        // Allow user to type 42115 without the -1
        const formattedId = setId.includes('-') ? setId : `${setId}-1`;
        const data = await this.fetchRebrickable(`/sets/${formattedId}/`);
        if (data) {
            data.estimated_price = await this.getEstimatedPrice(data.set_num, data.num_parts);
        }
        return data;
    },

    async getSetPieces(setId) {
        const formattedId = setId.includes('-') ? setId : `${setId}-1`;
        const data = await this.fetchRebrickable(`/sets/${formattedId}/parts/?page_size=100`);
        return data ? data.results : [];
    },

    async getEstimatedPrice(setId, numParts) {
        // Brickset API usually requires CORS proxy or server-side.
        // We fallback to the internal algorithm as requested:
        if (!numParts || numParts === 0) return 0;
        const estimate = numParts * 0.105; 
        return parseFloat(estimate.toFixed(2));
    }
};
