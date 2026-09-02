const API = {
    API_BASE: window.location.origin.includes('localhost') ? 'http://localhost:8080/api' : '/api',
    
    CATEGORIES: [
        { id: 'technic', name: 'Technic', rebrickableId: 1 },
        { id: 'speed-champions', name: 'Speed Champions', rebrickableId: 601 },
        { id: 'icons', name: 'Icons', rebrickableId: 721 }, 
        { id: 'star-wars', name: 'Star Wars', rebrickableId: 158 },
        { id: 'harry-potter', name: 'Harry Potter', rebrickableId: 246 },
        { id: 'city', name: 'City', rebrickableId: 52 },
        { id: 'botanicals', name: 'Botanicals', rebrickableId: 769 },
        { id: 'marvel', name: 'Marvel', rebrickableId: 696 }, 
        { id: 'nike', name: 'Nike', rebrickableId: 785 },
        { id: 'infinity-saga', name: 'The Infinity Saga', rebrickableId: 781 }
    ],
    
    _themesMap: null,
    _imageCache: new Map(),

    getProxyImageUrl(url) {
        if (!url) return '';
        if (this._imageCache.has(url)) {
            return this._imageCache.get(url);
        }
        const proxyUrl = `${this.API_BASE}/catalog/proxy-image?url=${encodeURIComponent(url)}`;
        this._imageCache.set(url, proxyUrl);
        return proxyUrl;
    },

    async fetchBackend(endpoint, options = {}) {
        try {
            const headers = {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                ...options.headers
            };
            
            const response = await fetch(`${this.API_BASE}${endpoint}`, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Network response was not ok');
            }
            
            // Return empty object if no body
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") !== -1) {
                return await response.json();
            } else {
                return await response.text();
            }
        } catch (error) {
            console.error("Backend API Error:", error);
            throw error;
        }
    },

    async loadAllThemes() {
        try {
            const data = await this.fetchBackend('/catalog/themes');
            if (data) {
                const map = {};
                data.forEach(t => map[t.id] = t.name);
                this._themesMap = map;
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
            const category = this.CATEGORIES.find(c => c.id === categoryId || c.rebrickableId == categoryId);
            if (category && category.rebrickableId) {
                endpoint += `&themeId=${category.rebrickableId}`;
            } else if (!isNaN(categoryId) && categoryId !== '') {
                endpoint += `&themeId=${categoryId}`;
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
    },

    async getStatistics() {
        try {
            return await this.fetchBackend('/statistics');
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getCollectionHistory() {
        try {
            return await this.fetchBackend('/statistics/history');
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async getSetHistory(setId) {
        try {
            return await this.fetchBackend(`/statistics/set/${setId}/history`);
        } catch (e) {
            console.error(e);
            return null;
        }
    }
};
