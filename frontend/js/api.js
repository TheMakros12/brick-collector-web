const API = {
    // API_BASE is the URL of our SpringBoot backend (ready for future)
    API_BASE: 'http://localhost:8080/api/catalog',
    
    REBRICKABLE_KEY: 'f138411743940f84bc3cd94fbdc27848',
    
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
    
    _themesMap: null,

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

    async loadAllThemes() {
        const cached = localStorage.getItem('rebrickable_themes');
        if (cached) {
            this._themesMap = JSON.parse(cached);
            return;
        }
        const data = await this.fetchRebrickable('/themes/?page_size=1000');
        if (data && data.results) {
            const map = {};
            data.results.forEach(t => map[t.id] = t.name);
            this._themesMap = map;
            localStorage.setItem('rebrickable_themes', JSON.stringify(map));
        }
    },

    getThemeName(id) {
        if (this._themesMap && this._themesMap[id]) {
            return this._themesMap[id];
        }
        const cat = this.CATEGORIES.find(c => c.rebrickableId == id);
        return cat ? cat.name : `Tema ${id}`;
    },

    async searchSets(query, categoryId = null, page = 1) {
        let setsEndpoint = `/sets/?page_size=30&ordering=-year&page=${page}`;
        let figsEndpoint = `/minifigs/?page_size=30&page=${page}`;
        
        if (query) {
            const enc = encodeURIComponent(query);
            setsEndpoint += `&search=${enc}`;
            figsEndpoint += `&search=${enc}`;
        }
        
        if (categoryId) {
            const category = this.CATEGORIES.find(c => c.id === categoryId);
            if (category && category.rebrickableId) {
                setsEndpoint += `&theme_id=${category.rebrickableId}`;
            }
        }
        
        let allResults = [];
        
        try {
            const setsData = await this.fetchRebrickable(setsEndpoint);
            if (setsData && setsData.results) {
                allResults = allResults.concat(setsData.results);
            }
            
            if (query && !categoryId) {
                const figsData = await this.fetchRebrickable(figsEndpoint);
                if (figsData && figsData.results) {
                    allResults = allResults.concat(figsData.results);
                }
            }
        } catch (e) {
            console.error(e);
        }

        if (allResults.length > 0) {
            const setsWithPrices = await Promise.all(allResults.map(async (set) => {
                const price = await this.getEstimatedPrice(set.set_num, set.num_parts || 4);
                return { ...set, estimated_price: price };
            }));
            
            setsWithPrices.sort((a, b) => (b.year || 9999) - (a.year || 9999));
            return setsWithPrices;
        }
        return [];
    },

    async getSetDetails(setId) {
        let endpoint = `/sets/${setId}/`;
        if (setId.startsWith('fig-')) {
            endpoint = `/minifigs/${setId}/`;
        } else if (!setId.includes('-')) {
            endpoint = `/sets/${setId}-1/`;
        }
        const data = await this.fetchRebrickable(endpoint);
        if (data) {
            data.estimated_price = await this.getEstimatedPrice(data.set_num, data.num_parts);
        }
        return data;
    },

    async getSetPieces(setId) {
        const formattedId = setId.includes('-') ? setId : `${setId}-1`;
        let allPieces = [];
        let endpoint = `/sets/${formattedId}/parts/?page_size=1000`;
        
        while (endpoint) {
            const data = await this.fetchRebrickable(endpoint);
            if (data && data.results) {
                allPieces = allPieces.concat(data.results);
                if (data.next) {
                    endpoint = data.next.replace('https://rebrickable.com/api/v3/lego', '');
                } else {
                    endpoint = null;
                }
            } else {
                endpoint = null;
            }
        }
        return allPieces;
    },

    async getEstimatedPrice(setId, numParts) {
        if (!numParts || numParts === 0) return 0;
        const estimate = numParts * 0.105; 
        return parseFloat(estimate.toFixed(2));
    }
};
