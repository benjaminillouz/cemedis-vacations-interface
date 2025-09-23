# Interface de Consultation des Vacations Médicales

## Description

Cette interface web permet aux praticiens de consulter les vacations disponibles dans les différents centres du groupe médical. Elle offre une vue sous forme de cartes avec des possibilités de filtrage par jour de la semaine et par proximité géographique.

## Fonctionnalités

### 🏥 Affichage des Centres
- **Vue cartes** : Affichage des centres sous forme de cartes avec toutes les informations
- **Vue carte** : Vue géographique des centres (simulation)
- **Informations détaillées** : Nom, adresse, téléphone, email, spécialités

### 🔍 Filtres Disponibles
- **Par jour de la semaine** : Filtre les centres selon les vacations disponibles
- **Par proximité géographique** : Saisie d'une adresse pour filtrer par distance
- **Distance maximale** : Choix de la distance (5, 10, 20, 50 km)

### 📅 Vacations
- Affichage des vacations par jour
- Horaires de début et fin
- Nom du praticien
- Spécialité médicale

## Structure des Données

L'interface se connecte au webhook : `https://n8n.cemedis.app/webhook/daaa2ad8-4e83-475b-a6b6-6cb512380c05`

### Format de données attendu

```json
{
  "centers": [
    {
      "id": "center-1",
      "name": "Centre Médical Paris Nord",
      "address": "123 Avenue des Champs-Élysées",
      "city": "Paris",
      "postalCode": "75008",
      "phone": "01 23 45 67 89",
      "email": "contact@paris-nord.fr",
      "latitude": 48.8566,
      "longitude": 2.3522,
      "specialties": ["Médecine générale", "Cardiologie"],
      "vacations": [
        {
          "day": "lundi",
          "startTime": "09:00",
          "endTime": "17:00",
          "practitioner": "Dr. Martin",
          "specialty": "Médecine générale"
        }
      ]
    }
  ]
}
```

## Installation et Utilisation

### 1. Téléchargement
Téléchargez tous les fichiers dans un dossier :
- `index.html`
- `styles.css`
- `script.js`

### 2. Ouverture
Ouvrez le fichier `index.html` dans un navigateur web moderne.

### 3. Utilisation
1. **Consulter les vacations** : Les centres s'affichent automatiquement
2. **Filtrer par jour** : Sélectionnez un jour dans le menu déroulant
3. **Filtrer par proximité** : Saisissez votre adresse et choisissez une distance maximale
4. **Changer de vue** : Utilisez les boutons "Vue cartes" et "Vue carte"

## Compatibilité

- **Navigateurs** : Chrome, Firefox, Safari, Edge (versions récentes)
- **Responsive** : Compatible mobile et tablette
- **JavaScript** : Requis pour le fonctionnement

## Personnalisation

### Couleurs
Modifiez les variables CSS dans `styles.css` :
```css
:root {
    --primary-color: #2563eb;
    --secondary-color: #64748b;
    /* ... autres couleurs */
}
```

### Webhook
Modifiez l'URL du webhook dans `script.js` :
```javascript
const WEBHOOK_URL = 'votre-nouvelle-url';
```

## Données d'Exemple

En cas d'erreur de connexion au webhook, l'interface utilise des données d'exemple pour démonstration :
- 3 centres médicaux (Paris, Lyon, Marseille)
- Vacations générées aléatoirement
- Géolocalisation simulée

## Support Technique

Pour toute question ou problème :
1. Vérifiez la console du navigateur pour les erreurs
2. Assurez-vous que le webhook est accessible
3. Vérifiez la structure des données retournées

## Licence

Interface développée pour l'usage interne des centres médicaux du groupe.
