const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();
const PORT = 3000;

// --- CONFIGURATION ---
app.use(cors());
app.use(express.json());
app.use(express.static('../client'));

// --- 1. CONNEXION MONGODB ---
mongoose.connect('mongodb://127.0.0.1:27020/aroundme')
    .then(async () => {
        console.log('✅ Connecté à MongoDB');
        
        // DIAGNOSTIC : Vérifions si l'API voit les données
        try {
            // On interroge directement la collection "places" brute
            const count = await mongoose.connection.db.collection('places').countDocuments();
            console.log(`📊 DIAGNOSTIC : La collection "places" contient ${count} documents.`);
            
            if (count === 0) {
                console.warn("⚠️ ATTENTION : La base semble vide. Vérifie ton import Docker !");
            }
        } catch (e) {
            console.error("Erreur lecture collection :", e);
        }
    })
    .catch(err => console.error('❌ Erreur de connexion:', err));


// --- 2. SCHÉMA MONGOOSE ---
const PlaceSchema = new mongoose.Schema({
    type: String,
    properties: {
        name: String,
        amenity: String,      // Ex: "cafe", "restaurant"
        shop: String,         // Ex: "bakery"
        address: String,
        phone: String,
        opening_hours: String,
        "addr:housenumber": String,
        "addr:street": String,
        "addr:postcode": String,
        "addr:city": String,
        adress: String,
    },
    geometry: {
        type: { type: String, enum: ['Point'], required: true },
        // CORRECTION ICI : "coordinates" avec deux 'o' !
        coordinates: { type: [Number], required: true } 
    }
});

// Index Géospatial (Vital pour $near)
PlaceSchema.index({ geometry: '2dsphere' });
// Index pour les filtres de catégorie
PlaceSchema.index({ "properties.amenity": 1 });

// CRÉATION DU MODÈLE
// Le 3ème argument 'places' force Mongoose à utiliser TA collection existante
const Place = mongoose.model('Place', PlaceSchema, 'places');


// --- 3. ROUTES API (PARTIE B DU TP) ---

// Route : Recherche "Around Me"
app.get('/api/places/nearby', async (req, res) => {
    try {
        // Paramètres avec valeurs par défaut
        const lat = parseFloat(req.query.lat);
        const lng = parseFloat(req.query.lng);
        const radius = parseInt(req.query.radius) || 1000; // 1km par défaut
        const category = req.query.category;
        const limit = Math.min(parseInt(req.query.limit) || 20, 50); // Max 50 résultats
        const page = parseInt(req.query.page) || 1;

        // Validation
        if (isNaN(lat) || isNaN(lng)) {
            return res.status(400).json({ error: "Latitude (lat) et Longitude (lng) sont obligatoires." });
        }

        // Construction de la requête
        let query = {
            geometry: {
                $near: {
                    $geometry: { type: "Point", coordinates: [lng, lat] }, // Attention : Longitude d'abord !
                    $maxDistance: radius
                }
            }
        };

        // Filtre dynamique : si une catégorie est demandée, on l'ajoute
        if (category) {
            query["properties.amenity"] = category;
        }

        // Exécution avec pagination
        const places = await Place.find(query)
            .skip((page - 1) * limit)
            .limit(limit);

        res.json(places);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Erreur serveur lors de la recherche" });
    }
});

// Route : Liste des catégories
app.get('/api/categories', async (req, res) => {
    try {
        // Récupère toutes les catégories distinctes existantes en base
        const categories = await Place.distinct("properties.amenity");
        // Filtre les résultats vides/nuls et renvoie la liste
        res.json(categories.filter(c => c != null));
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Impossible de récupérer les catégories" });
    }
});

// --- LANCEMENT ---
app.listen(PORT, () => {
    console.log(`🚀 Serveur API démarré sur http://localhost:${PORT}`);
});