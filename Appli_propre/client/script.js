const btnSearch = document.getElementById('btn-search');
const inputLat = document.getElementById('input-lat');
const inputLng = document.getElementById('input-lng');
const categorySelect = document.getElementById('category-select');
const radiusSelect = document.getElementById('radius-select');
const placesList = document.getElementById('places-list');
const statusMsg = document.getElementById('status-msg');

const API_URL = 'http://localhost:3000/api';

// 1. Au chargement : Remplir la liste des catégories
async function loadCategories() {
    try {
        const response = await fetch(`${API_URL}/categories`);
        const categories = await response.json();
        
        categories.forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat.charAt(0).toUpperCase() + cat.slice(1); // Majuscule
            categorySelect.appendChild(option);
        });
    } catch (error) {
        console.error("Erreur chargement catégories:", error);
    }
}
loadCategories(); // On lance ça tout de suite

// 2. Fonction principale : Rechercher les lieux
async function searchPlaces() {
    // Récupérer les valeurs des inputs
    const lat = inputLat.value;
    const lng = inputLng.value;
    const radius = radiusSelect.value;
    const category = categorySelect.value;

    if (!lat || !lng) {
        statusMsg.textContent = "Veuillez entrer une latitude et une longitude.";
        return;
    }

    statusMsg.textContent = "Chargement des lieux...";
    placesList.innerHTML = ''; // On vide la liste avant de remplir

    try {
        // Construction de l'URL avec tous les paramètres
        let url = `${API_URL}/places/nearby?lat=${lat}&lng=${lng}&radius=${radius}`;
        if (category) {
            url += `&category=${category}`;
        }

        // Appel à ton API Node.js
        const response = await fetch(url);
        const places = await response.json();

        statusMsg.textContent = `${places.length} lieux trouvés autour de vous.`;

        // Affichage de chaque lieu
        places.forEach(place => {
            // 1. Récupération des propriétés
            const p = place.properties;

            // 2. On essaie de trouver l'emplacement
            const street = p["addr:street"] || p.address || "";
            const number = p["addr:housenumber"] || "";
            const zip = p["addr:postcode"] || "";
            const city = p["addr:city"] || "";

            // 3. Construction intelligente (on évite les virgules vides)
            let addressParts = [];

            // Partie Rue : "87 Avenue Gambetta" ou "Avenue Gambetta"
            let streetPart = [number, street].filter(Boolean).join(" ");
            if (streetPart) addressParts.push(streetPart);

            // Partie Ville : "75020 Paris"
            let cityPart = [zip, city].filter(Boolean).join(" ");
            if (cityPart) addressParts.push(cityPart);

            // Résultat final : "87 Avenue Gambetta, 75020 Paris"
            let fullAddress = addressParts.join(", ");

            // Si l'adresse est vide, on affiche les coordonnées GPS
            if (!fullAddress) {
                const lng = place.geometry.coordinates[0]; // Longitude
                const lat = place.geometry.coordinates[1]; // Latitude
                
                // On affiche avec 5 chiffres après la virgule (précision ~1m)
                fullAddress = `GPS : ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
            }


            const li = document.createElement('li');
            li.className = 'place-card';
            li.innerHTML = `
                <div class="place-info">
                    <h3>${p.name || "Lieu sans nom"}</h3>
                    <span class="place-category">${p.amenity || "Divers"}</span>
                    <p style="font-size: 0.85rem; color: #555; margin-top: 5px;">
                        📍 ${fullAddress}
                    </p>
                </div>
            `;
            placesList.appendChild(li);
        });

        if (places.length === 0) {
            statusMsg.textContent = "Aucun lieu trouvé dans ce rayon.";
        }

    } catch (error) {
        console.error(error);
        statusMsg.textContent = "Erreur de connexion à l'API.";
    }
}

// 3. Écouteur sur le bouton
btnSearch.addEventListener('click', searchPlaces);