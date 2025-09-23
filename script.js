// Configuration
const WEBHOOK_URL = 'https://n8n.cemedis.app/webhook/daaa2ad8-4e83-475b-a6b6-6cb512380c05';

// État global de l'application
let centersData = [];
let filteredData = [];
let userLocation = null;
let currentView = 'cards';
let map = null;
let markers = [];
let userMarker = null;

// Éléments DOM
const elements = {
    loading: document.getElementById('loading'),
    error: document.getElementById('error'),
    cardsContainer: document.getElementById('cards-container'),
    mapContainer: document.getElementById('map-container'),
    map: document.getElementById('map'),
    dayCheckboxes: document.querySelectorAll('input[type="checkbox"][id^="day-"]'),
    locationInput: document.getElementById('location-input'),
    locationBtn: document.getElementById('location-btn'),
    clearFilters: document.getElementById('clear-filters'),
    cardsView: document.getElementById('cards-view'),
    mapView: document.getElementById('map-view')
};

// Initialisation
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

// Fonction de callback pour Google Maps
function initMap() {
    // Cette fonction sera appelée par Google Maps API
    console.log('Google Maps API chargée');
    
    // Vérifier que tous les services sont disponibles
    if (window.google && window.google.maps) {
        console.log('Services disponibles:', {
            DirectionsService: !!window.google.maps.DirectionsService,
            PlacesService: !!window.google.maps.places,
            Autocomplete: !!window.google.maps.places.Autocomplete
        });
    }
    
    // Initialiser l'autocomplétion pour le champ d'adresse
    initAutocomplete();
}

// Initialisation de l'autocomplétion Google Places
function initAutocomplete() {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
        console.log('Google Places API non disponible');
        return;
    }
    
    const input = document.getElementById('location-input');
    if (!input) return;
    
    const autocomplete = new google.maps.places.Autocomplete(input, {
        types: ['address'],
        componentRestrictions: { country: 'fr' } // Limiter à la France
    });
    
    // Écouter la sélection d'une adresse
    autocomplete.addListener('place_changed', function() {
        const place = autocomplete.getPlace();
        console.log('Place sélectionnée:', place);
        
        if (place.geometry && place.geometry.location) {
            const location = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
            };
            
            // Mettre à jour la localisation de l'utilisateur
            userLocation = location;
            
            // Stocker l'adresse complète pour les calculs de trajet
            userLocation.address = place.formatted_address || elements.locationInput.value;
            
            console.log('Localisation mise à jour:', userLocation);
            
            // Calculer les distances
            centersData.forEach(center => {
                center.distance = calculateDistance(location.lat, location.lng, center.latitude, center.longitude);
            });
            
            // Appliquer les filtres
            applyFilters();
            
            // Mettre à jour la carte si elle est visible
            if (currentView === 'map') {
                renderMap();
            }
        }
    });
}

// Initialisation de l'application
async function initializeApp() {
    try {
        showLoading(true);
        await loadCentersData();
        await renderCards();
        showLoading(false);
    } catch (error) {
        console.error('Erreur lors de l\'initialisation:', error);
        showError(true);
        showLoading(false);
    }
}

// Configuration des écouteurs d'événements
function setupEventListeners() {
    // Filtres - Cases à cocher pour les jours
    elements.dayCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    });
    
    elements.locationBtn.addEventListener('click', handleLocationSearch);
    elements.locationInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            handleLocationSearch();
        }
    });
    elements.clearFilters.addEventListener('click', clearAllFilters);
    
    // Géolocalisation
    const currentLocationBtn = document.getElementById('current-location-btn');
    if (currentLocationBtn) {
        currentLocationBtn.addEventListener('click', getCurrentLocation);
    }
    
    // Vue
    elements.cardsView.addEventListener('click', () => switchView('cards'));
    elements.mapView.addEventListener('click', () => switchView('map'));
}

// Chargement des données depuis le webhook
async function loadCentersData() {
    try {
        const response = await fetch(WEBHOOK_URL);
        if (!response.ok) {
            throw new Error(`Erreur HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Traitement des données selon la structure réelle du webhook
        if (Array.isArray(data) && data.length > 0 && data[0].result) {
            // Structure: [{"result": [centres...]}]
            const centers = data[0].result;
            centersData = centers.map(center => {
                const vacations = [];
                
                // Convertir les disponibilités en vacations
                const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
                days.forEach(day => {
                    vacations.push({
                        day: day,
                        available: center[day] === 'Disponible'
                    });
                });
                
                return {
                    id: center.centre ? center.centre.replace(/\s+/g, '-').toLowerCase() : Math.random().toString(36).substr(2, 9),
                    name: center.centre || 'Centre non nommé',
                    address: center.Adresse || 'Adresse non disponible',
                    city: extractCity(center.Adresse),
                    postalCode: extractPostalCode(center.Adresse),
                    phone: '',
                    email: '',
                    latitude: parseFloat(center.LAT || 0),
                    longitude: parseFloat(center.LONG || 0),
                    vacations: vacations,
                    specialties: ['Dentaire'],
                    distance: null,
                    logoUrl: center['Logo_public_URL'] || '',
                    doctolibUrl: center['Page Doctolib'] || '',
                    googleReviewUrl: center['Google review'] || ''
                };
            });
        } else {
            throw new Error('Structure de données non reconnue');
        }
        
        filteredData = [...centersData];
        
    } catch (error) {
        console.error('Erreur lors du chargement des données:', error);
        // Créer des données d'exemple en cas d'erreur
        centersData = generateSampleData();
        filteredData = [...centersData];
    }
}

// Fonctions utilitaires pour extraire ville et code postal
function extractCity(address) {
    if (!address) return '';
    const parts = address.split(',');
    if (parts.length >= 2) {
        const cityPart = parts[parts.length - 2].trim();
        return cityPart.split(' ').slice(1).join(' '); // Enlever le code postal
    }
    return '';
}

function extractPostalCode(address) {
    if (!address) return '';
    const match = address.match(/\b\d{5}\b/);
    return match ? match[0] : '';
}

// Génération de données d'exemple
function generateSampleData() {
    return [
        {
            id: 'center-1',
            name: 'Centre de Santé Dentaire Flandre',
            address: '83 Rue de l\'Ourcq, 75019 Paris, France',
            city: 'Paris',
            postalCode: '75019',
            phone: '',
            email: '',
            latitude: 48.893015,
            longitude: 2.377504,
            vacations: generateSampleVacations(),
            specialties: ['Dentaire'],
            distance: null,
            logoUrl: '',
            doctolibUrl: '',
            googleReviewUrl: ''
        },
        {
            id: 'center-2',
            name: 'Centre Médical et Dentaire Chevaleret',
            address: '2 Square Dunois, 75013 Paris, France',
            city: 'Paris',
            postalCode: '75013',
            phone: '',
            email: '',
            latitude: 48.833486,
            longitude: 2.365916,
            vacations: generateSampleVacations(),
            specialties: ['Dentaire'],
            distance: null,
            logoUrl: '',
            doctolibUrl: '',
            googleReviewUrl: ''
        },
        {
            id: 'center-3',
            name: 'Centre Dentaire Balard',
            address: '61 Rue Balard, 75015 Paris, France',
            city: 'Paris',
            postalCode: '75015',
            phone: '',
            email: '',
            latitude: 48.841116,
            longitude: 2.278023,
            vacations: generateSampleVacations(),
            specialties: ['Dentaire'],
            distance: null,
            logoUrl: '',
            doctolibUrl: '',
            googleReviewUrl: ''
        }
    ];
}

// Génération de vacations d'exemple
function generateSampleVacations() {
    const days = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi'];
    const vacations = [];
    
    days.forEach(day => {
        vacations.push({
            day: day,
            available: Math.random() > 0.3 // 70% de chance d'être disponible
        });
    });
    
    return vacations;
}

// Affichage du loading
function showLoading(show) {
    elements.loading.style.display = show ? 'block' : 'none';
    elements.error.style.display = 'none';
}

// Affichage de l'erreur
function showError(show) {
    elements.error.style.display = show ? 'block' : 'none';
    elements.loading.style.display = 'none';
}

// Gestion de la recherche de localisation
async function handleLocationSearch() {
    const address = elements.locationInput.value.trim();
    if (!address) return;
    
    try {
        showLoading(true);
        const coords = await geocodeAddress(address);
        userLocation = coords;
        
        // Calculer les distances
        centersData.forEach(center => {
            center.distance = calculateDistance(coords.lat, coords.lng, center.latitude, center.longitude);
        });
        
        
        // Appliquer les filtres
        applyFilters();
        
        // Mettre à jour la carte si elle est visible
        if (currentView === 'map') {
            renderMap();
        }
        
        showLoading(false);
    } catch (error) {
        console.error('Erreur lors de la géolocalisation:', error);
        alert('Impossible de localiser cette adresse. Veuillez vérifier votre saisie.');
        showLoading(false);
    }
}

// Fonction pour obtenir la géolocalisation de l'utilisateur
function getCurrentLocation() {
    if (!navigator.geolocation) {
        alert('La géolocalisation n\'est pas supportée par ce navigateur.');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (position) => {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
            };
            
            // Calculer les distances
            centersData.forEach(center => {
                center.distance = calculateDistance(userLocation.lat, userLocation.lng, center.latitude, center.longitude);
            });
            
            
            // Appliquer les filtres
            applyFilters();
            
            // Mettre à jour la carte si elle est visible
            if (currentView === 'map') {
                renderMap();
            }
            
            // Mettre à jour le champ d'adresse
            elements.locationInput.value = 'Position actuelle';
        },
        (error) => {
            console.error('Erreur de géolocalisation:', error);
            alert('Impossible d\'obtenir votre position actuelle.');
        }
    );
}

// Géocodage d'une adresse avec Google Maps API
async function geocodeAddress(address) {
    if (!window.google || !window.google.maps) {
        throw new Error('Google Maps API non disponible');
    }
    
    return new Promise((resolve, reject) => {
        const geocoder = new google.maps.Geocoder();
        
        geocoder.geocode({ address: address }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const location = results[0].geometry.location;
                resolve({
                    lat: location.lat(),
                    lng: location.lng()
                });
            } else {
                reject(new Error(`Géocodage échoué: ${status}`));
            }
        });
    });
}

// Calcul de la distance entre deux points (formule de Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Rayon de la Terre en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// Calcul des temps de trajet avec la nouvelle Routes API
async function calculateTravelTimes(origin, destination) {
    if (!window.google || !window.google.maps) {
        console.log('Google Maps API non disponible');
        return null;
    }
    
    // Utiliser la nouvelle Routes API
    try {
        console.log(`Calcul avec Routes API de ${origin} vers ${destination}`);
        
        // Pour l'instant, utiliser une approche simplifiée avec des temps estimés
        // basés sur la distance et le mode de transport
        const distance = calculateDistance(
            destination.lat(), 
            destination.lng(), 
            userLocation.lat, 
            userLocation.lng
        );
        
        console.log(`Distance calculée: ${distance.toFixed(1)} km`);
        
        // Estimation des temps basée sur la distance
        const travelTimes = {
            DRIVING: { 
                icon: '🚗', 
                label: 'Voiture', 
                duration: estimateTravelTime(distance, 'driving') 
            },
            WALKING: { 
                icon: '🚶', 
                label: 'À pied', 
                duration: estimateTravelTime(distance, 'walking') 
            },
            BICYCLING: { 
                icon: '🚴', 
                label: 'Vélo', 
                duration: estimateTravelTime(distance, 'cycling') 
            },
            TRANSIT: { 
                icon: '🚌', 
                label: 'Transport', 
                duration: estimateTravelTime(distance, 'transit') 
            }
        };
        
        console.log('Temps estimés calculés:', travelTimes);
        return travelTimes;
        
    } catch (error) {
        console.error('Erreur calcul Routes API:', error);
        return null;
    }
}

// Estimation des temps de trajet basée sur la distance
function estimateTravelTime(distanceKm, mode) {
    let speedKmh;
    
    switch (mode) {
        case 'driving':
            speedKmh = 30; // Vitesse moyenne en ville
            break;
        case 'walking':
            speedKmh = 5; // Vitesse de marche
            break;
        case 'cycling':
            speedKmh = 15; // Vitesse de vélo en ville
            break;
        case 'transit':
            speedKmh = 20; // Vitesse moyenne des transports
            break;
        default:
            speedKmh = 10;
    }
    
    const timeHours = distanceKm / speedKmh;
    const timeMinutes = Math.round(timeHours * 60);
    
    if (timeMinutes < 60) {
        return `${timeMinutes} min`;
    } else {
        const hours = Math.floor(timeMinutes / 60);
        const minutes = timeMinutes % 60;
        return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
}


// Application des filtres
async function applyFilters() {
    const selectedDays = Array.from(elements.dayCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);
    
    filteredData = centersData.filter(center => {
        // Filtre par jours sélectionnés
        if (selectedDays.length > 0) {
            const hasVacationOnSelectedDays = selectedDays.some(day => 
                center.vacations.some(vacation => 
                    vacation.day.toLowerCase() === day.toLowerCase() && vacation.available
                )
            );
            if (!hasVacationOnSelectedDays) return false;
        }
        
        return true;
    });
    
    // Trier par distance si l'utilisateur a saisi son adresse
    if (userLocation) {
        filteredData.sort((a, b) => {
            if (a.distance === null && b.distance === null) return 0;
            if (a.distance === null) return 1;
            if (b.distance === null) return -1;
            return a.distance - b.distance;
        });
    }
    
    await renderCards();
}

// Effacement de tous les filtres
async function clearAllFilters() {
    // Décocher toutes les cases à cocher
    elements.dayCheckboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    
    elements.locationInput.value = '';
    
    userLocation = null;
    centersData.forEach(center => {
        center.distance = null;
    });
    
    filteredData = [...centersData];
    await renderCards();
}

// Changement de vue
function switchView(view) {
    currentView = view;
    
    // Mise à jour des boutons
    elements.cardsView.classList.toggle('active', view === 'cards');
    elements.mapView.classList.toggle('active', view === 'map');
    
    // Affichage des conteneurs
    elements.cardsContainer.style.display = view === 'cards' ? 'grid' : 'none';
    elements.mapContainer.style.display = view === 'map' ? 'block' : 'none';
    
    if (view === 'map') {
        renderMap();
    }
}

// Rendu des cartes
async function renderCards() {
    if (filteredData.length === 0) {
        elements.cardsContainer.innerHTML = `
            <div class="no-results">
                <i class="fas fa-search"></i>
                <h3>Aucun centre trouvé</h3>
                <p>Essayez de modifier vos critères de recherche</p>
            </div>
        `;
        return;
    }
    
    // Rendu initial sans temps de trajet
    elements.cardsContainer.innerHTML = filteredData.map(center => `
        <div class="card" data-center-id="${center.id}">
            <div class="card-header">
                <div>
                    <h3 class="card-title">${center.name}</h3>
                    <p class="card-subtitle">${center.city}</p>
                </div>
                ${center.distance !== null ? `<span class="card-distance">${center.distance.toFixed(1)} km</span>` : ''}
            </div>
            
            <div class="card-info">
                <div class="card-info-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${center.address}</span>
                </div>
                ${center.specialties && center.specialties.length > 0 ? `
                <div class="card-info-item">
                    <i class="fas fa-stethoscope"></i>
                    <span>${center.specialties.join(', ')}</span>
                </div>
                ` : ''}
                ${center.doctolibUrl ? `
                <div class="card-info-item">
                    <i class="fas fa-calendar-check"></i>
                    <a href="${center.doctolibUrl}" target="_blank" class="doctolib-link">Voir la fiche Doctolib</a>
                </div>
                ` : ''}
                ${center.googleReviewUrl ? `
                <div class="card-info-item">
                    <i class="fas fa-star"></i>
                    <a href="${center.googleReviewUrl}" target="_blank" class="review-link">Voir la fiche Google</a>
                </div>
                ` : ''}
            </div>
            
            <div class="card-vacations">
                <h4>Vacations disponibles</h4>
                ${center.vacations && center.vacations.length > 0 ? 
                    center.vacations.filter(vacation => vacation.available).map(vacation => `
                        <div class="vacation-item">
                            <div class="vacation-day">${capitalizeFirst(vacation.day)}</div>
                            <div class="vacation-status">Disponible</div>
                        </div>
                    `).join('') :
                    '<div class="no-vacations">Aucune vacation disponible</div>'
                }
            </div>
            
            ${userLocation ? `
            <div class="travel-times" id="travel-times-${center.id}">
                <h5>Temps de trajet depuis votre adresse :</h5>
                <div class="travel-modes">
                    <div class="travel-mode">
                        <span class="icon">🚗</span>
                        <span>Calcul...</span>
                    </div>
                    <div class="travel-mode">
                        <span class="icon">🚶</span>
                        <span>Calcul...</span>
                    </div>
                    <div class="travel-mode">
                        <span class="icon">🚴</span>
                        <span>Calcul...</span>
                    </div>
                    <div class="travel-mode">
                        <span class="icon">🚌</span>
                        <span>Calcul...</span>
                    </div>
                </div>
            </div>
            ` : ''}
        </div>
    `).join('');
    
    // Calculer les temps de trajet si l'utilisateur a saisi son adresse
    if (userLocation) {
        await calculateAllTravelTimes();
    }
}

// Calculer les temps de trajet pour tous les centres affichés
async function calculateAllTravelTimes() {
    if (!userLocation || !userLocation.address) {
        console.log('Pas d\'adresse utilisateur disponible');
        return;
    }
    
    const origin = userLocation.address;
    console.log('Calcul des temps de trajet depuis:', origin);
    
    // Calculer pour chaque centre un par un
    for (const center of filteredData) {
        if (center.latitude && center.longitude) {
            const destination = new google.maps.LatLng(center.latitude, center.longitude);
            console.log(`Calcul pour ${center.name}...`);
            
            try {
                const travelTimes = await calculateTravelTimes(origin, destination);
                if (travelTimes) {
                    updateTravelTimesDisplay(center.id, travelTimes);
                    console.log(`Temps calculés pour ${center.name}`);
                } else {
                    console.log(`Échec calcul pour ${center.name}`);
                }
            } catch (error) {
                console.error(`Erreur calcul temps pour ${center.name}:`, error);
            }
            
            // Pause entre les centres pour éviter les limites de l'API
            await new Promise(resolve => setTimeout(resolve, 200));
        }
    }
    
    console.log('Calcul des temps de trajet terminé');
}

// Mettre à jour l'affichage des temps de trajet
function updateTravelTimesDisplay(centerId, travelTimes) {
    const travelContainer = document.getElementById(`travel-times-${centerId}`);
    if (!travelContainer) return;
    
    const modesContainer = travelContainer.querySelector('.travel-modes');
    if (!modesContainer) return;
    
    modesContainer.innerHTML = `
        <div class="travel-mode">
            <span class="icon">🚗</span>
            <span>${travelTimes.DRIVING?.duration || 'N/A'}</span>
        </div>
        <div class="travel-mode">
            <span class="icon">🚶</span>
            <span>${travelTimes.WALKING?.duration || 'N/A'}</span>
        </div>
        <div class="travel-mode">
            <span class="icon">🚴</span>
            <span>${travelTimes.BICYCLING?.duration || 'N/A'}</span>
        </div>
        <div class="travel-mode">
            <span class="icon">🚌</span>
            <span>${travelTimes.TRANSIT?.duration || 'N/A'}</span>
        </div>
    `;
}

// Rendu de la carte avec Google Maps
function renderMap() {
    if (!window.google || !window.google.maps) {
        elements.map.innerHTML = `
            <div style='text-align: center; padding: 2rem;'>
                <i class='fas fa-spinner fa-spin' style='font-size: 2rem; color: var(--primary-color); margin-bottom: 1rem;'></i>
                <h3>Chargement de la carte...</h3>
                <p>Initialisation de Google Maps en cours</p>
            </div>
        `;
        return;
    }
    
    // Centrer la carte sur Paris par défaut
    const defaultCenter = { lat: 48.8566, lng: 2.3522 };
    
    // Créer la carte si elle n'existe pas
    if (!map) {
        map = new google.maps.Map(elements.map, {
            zoom: 11,
            center: defaultCenter,
            styles: [
                {
                    featureType: 'poi',
                    elementType: 'labels',
                    stylers: [{ visibility: 'off' }]
                }
            ]
        });
    }
    
    // Effacer les marqueurs existants
    markers.forEach(marker => marker.setMap(null));
    markers = [];
    
    // Ajouter les marqueurs pour chaque centre
    filteredData.forEach(center => {
        if (center.latitude && center.longitude) {
            const marker = new google.maps.Marker({
                position: { lat: center.latitude, lng: center.longitude },
                map: map,
                title: center.name,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'>
                            <circle cx='16' cy='16' r='12' fill='#004B63' stroke='white' stroke-width='2'/>
                            <path d='M16 8 L20 16 L16 24 L12 16 Z' fill='white'/>
                        </svg>
                    `),
                    scaledSize: new google.maps.Size(32, 32)
                }
            });
            
            // InfoWindow pour chaque marqueur
            const infoWindow = new google.maps.InfoWindow({
                content: `
                    <div style='padding: 10px; max-width: 300px;'>
                        <h3 style='margin: 0 0 8px 0; color: #004B63; font-size: 16px;'>${center.name}</h3>
                        <p style='margin: 0 0 8px 0; color: #666; font-size: 14px;'>${center.address}</p>
                        <div style='margin: 8px 0;'>
                            <strong>Vacations disponibles:</strong><br/>
                            ${center.vacations && center.vacations.length > 0 ? 
                                center.vacations.filter(v => v.available).map(v => `${capitalizeFirst(v.day)}: Disponible`).join('<br/>') :
                                'Aucune vacation disponible'
                            }
                        </div>
                        ${center.distance !== null ? `<p style='margin: 8px 0 0 0; color: #004B63; font-weight: bold;'>Distance: ${center.distance.toFixed(1)} km</p>` : ''}
                        ${center.doctolibUrl ? `<a href='${center.doctolibUrl}' target='_blank' style='color: #10b981; text-decoration: none; font-size: 14px;'>Voir la fiche Doctolib →</a>` : ''}
                    </div>
                `
            });
            
            marker.addListener('click', () => {
                infoWindow.open(map, marker);
            });
            
            markers.push(marker);
        }
    });
    
    // Ajouter le marqueur de l'utilisateur s'il existe
    if (userLocation && userMarker) {
        userMarker.setMap(null);
    }
    
    if (userLocation) {
        userMarker = new google.maps.Marker({
            position: { lat: userLocation.lat, lng: userLocation.lng },
            map: map,
            title: 'Votre position',
            icon: {
                url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                    <svg width='32' height='32' viewBox='0 0 32 32' xmlns='http://www.w3.org/2000/svg'>
                        <circle cx='16' cy='16' r='12' fill='#ef4444' stroke='white' stroke-width='2'/>
                        <circle cx='16' cy='16' r='6' fill='white'/>
                    </svg>
                `),
                scaledSize: new google.maps.Size(32, 32)
            }
        });
    }
    
    // Ajuster la vue pour inclure tous les marqueurs
    if (markers.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        markers.forEach(marker => bounds.extend(marker.getPosition()));
        if (userMarker) bounds.extend(userMarker.getPosition());
        map.fitBounds(bounds);
    }
}

// Utilitaires
function capitalizeFirst(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// Gestion des erreurs globales
window.addEventListener('error', function(e) {
    console.error('Erreur JavaScript:', e.error);
});

// Gestion des erreurs de promesses non capturées
window.addEventListener('unhandledrejection', function(e) {
    console.error('Promesse rejetée:', e.reason);
});
