const firebaseConfig = {
    apiKey: "AIzaSyAvD6-XI9Xx1Rv9NAX2aVxK5eSFxjsNwPc",
    authDomain: "brickcollectorweb.firebaseapp.com",
    projectId: "brickcollectorweb",
    storageBucket: "brickcollectorweb.firebasestorage.app",
    messagingSenderId: "779926840422",
    appId: "1:779926840422:web:b25044c02fb4a0f11eb9a7"
};

let db = null;
try {
    if (firebaseConfig.apiKey && window.firebase) {
        firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        console.log("Firebase activado y listo.");
    } else {
        console.warn("Firebase no está configurado. Usando LocalStorage en modo offline. Abre js/storage.js para poner tus claves.");
    }
} catch (e) {
    console.error("Error iniciando Firebase:", e);
}

function syncToFirebase() {
    if (!db) return;
    const user = Storage.getUser();
    if (!user || !user.email) return;

    const col = Storage.getCollection();
    const wish = Storage.getWishlist();

    // Asincrono sin bloquear la UI
    db.collection('users').doc(user.email).set({
        profile: user,
        collection: col,
        wishlist: wish,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error("Error sincronizando a Firebase:", e));
}

const Storage = {
    USER_KEY: 'brickcollector_user',
    COLLECTION_KEY: 'brickcollector_collection',
    WISHLIST_KEY: 'brickcollector_wishlist',

    // User Data
    getUser: () => JSON.parse(localStorage.getItem(Storage.USER_KEY)),
    saveUser: async (user) => {
        localStorage.setItem(Storage.USER_KEY, JSON.stringify(user));
        // Intentar descargar datos si existen en Firebase
        if (db) {
            try {
                const doc = await db.collection('users').doc(user.email).get();
                if (doc.exists) {
                    const data = doc.data();
                    if (data.collection) localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(data.collection));
                    if (data.wishlist) localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(data.wishlist));
                }
            } catch (e) {
                console.error("Error descargando desde Firebase:", e);
            }
        }
    },
    clearUser: () => localStorage.removeItem(Storage.USER_KEY),

    // Collection
    getCollection: () => JSON.parse(localStorage.getItem(Storage.COLLECTION_KEY)) || [],
    saveCollection: (collection) => {
        localStorage.setItem(Storage.COLLECTION_KEY, JSON.stringify(collection));
        syncToFirebase();
    },
    addToCollection: (set) => {
        const collection = Storage.getCollection();
        if (!collection.find(s => s.set_num === set.set_num)) {
            set.buildTracker = { active: false, totalBags: 0, currentBag: 0, startDate: null, endDate: null };
            set.addedAt = new Date().toISOString();
            collection.push(set);
            Storage.saveCollection(collection);
            return true;
        }
        return false;
    },
    removeFromCollection: (setId) => {
        const collection = Storage.getCollection().filter(s => s.set_num !== setId);
        Storage.saveCollection(collection);
    },
    updateSetInCollection: (updatedSet) => {
        const collection = Storage.getCollection();
        const index = collection.findIndex(s => s.set_num === updatedSet.set_num);
        if (index !== -1) {
            collection[index] = updatedSet;
            Storage.saveCollection(collection);
        }
    },

    // Wishlist
    getWishlist: () => JSON.parse(localStorage.getItem(Storage.WISHLIST_KEY)) || [],
    saveWishlist: (wishlist) => {
        localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(wishlist));
        syncToFirebase();
    },
    addToWishlist: (set) => {
        const wishlist = Storage.getWishlist();
        if (!wishlist.find(s => s.set_num === set.set_num)) {
            set.addedAt = new Date().toISOString();
            wishlist.push(set);
            Storage.saveWishlist(wishlist);
            return true;
        }
        return false;
    },
    removeFromWishlist: (setId) => {
        const wishlist = Storage.getWishlist().filter(s => s.set_num !== setId);
        Storage.saveWishlist(wishlist);
    },
    moveToCollection: (set) => {
        const wishlist = Storage.getWishlist().filter(s => s.set_num !== set.set_num);
        localStorage.setItem(Storage.WISHLIST_KEY, JSON.stringify(wishlist)); // bypass syncToFirebase for atomic save
        const added = Storage.addToCollection(set); // This will trigger sync
        return added;
    },

    // Danger Zone
    clearAll: () => {
        localStorage.removeItem(Storage.COLLECTION_KEY);
        localStorage.removeItem(Storage.WISHLIST_KEY);
        syncToFirebase();
    }
};
