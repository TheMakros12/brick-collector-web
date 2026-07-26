const API = {
    API_BASE: 'http://localhost:8080/api',
    
    CATEGORIES: [
        { id: 'technic', name: 'Technic', rebrickableId: 1 },
        { id: 'speed-champions', name: 'Speed Champions', rebrickableId: 601 }, // Was 608 (Disney)
        { id: 'icons', name: 'Icons', rebrickableId: 721 }, 
        { id: 'star-wars', name: 'Star Wars', rebrickableId: 158 },
        { id: 'botanicals', name: 'Botanicals', rebrickableId: 769 }, // Was 710
        { id: 'marvel', name: 'Marvel', rebrickableId: 696 }, 
        { id: 'nike', name: 'Nike', rebrickableId: 785 }, // Was null
        { id: 'infinity-saga', name: 'The Infinity Saga', rebrickableId: 781 }, // Was 709
        { id: 'pokemon', name: 'Pokemon', rebrickableId: null } 
    ],
    
    _themesMap: null,

    async fetchBackend(endpoint, options = {}) {
        try {
            const token = localStorage.getItem('brickcollector_token');
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Network response was not ok');
            }
            
            return await response.json();
        } catch (error) {
            console.error("Backend API Error:", error);
            throw error;
        }
    },

    async loadAllThemes() {
        const cached = localStorage.getItem('rebrickable_themes');
        if (cached) {
            this._themesMap = JSON.parse(cached);
            return;
        }
        try {
            const data = await this.fetchBackend('/catalog/themes');
            if (data) {
                const map = {};
                // Asumiendo que el backend devuelve [{id, name}, ...]
                data.forEach(t => map[t.id] = t.name);
                this._themesMap = map;
                localStorage.setItem('rebrickable_themes', JSON.stringify(map));
            }
        } catch(e) {
            console.error(e);
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
        let endpoint = `/catalog/search?q=${encodeURIComponent(query || '')}`;
        
        if (categoryId) {
            const category = this.CATEGORIES.find(c => c.id === categoryId);
            if (category && category.rebrickableId) {
                endpoint += `&themeId=${category.rebrickableId}`;
            }
        }
        
        try {
            return await this.fetchBackend(endpoint);
        } catch (e) {
            console.error(e);
            return [];
        }
    },

    async getSetDetails(setId) {
        try {
            return await this.fetchBackend(`/catalog/details/${setId}`);
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getSetPieces(setId) {
        try {
            return await this.fetchBackend(`/catalog/pieces/${setId}`);
        } catch (e) {
            console.error(e);
            return [];
        }
    }
};
