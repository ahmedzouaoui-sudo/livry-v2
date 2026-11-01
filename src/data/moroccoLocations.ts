/**
 * Liste structurée des Villes et Entrepôts / Magasins Marjane au Maroc
 * pour le picking et la livraison Livry.
 */

export const MOROCCO_WAREHOUSES: Record<string, string[]> = {
  Casablanca: [
    'Marjane Market Emile Zola',
    'Marjane Market Xpress Bouskoura',
    'MARJANE MARINA',
    'Marjane Market Dar Bouazza',
    'Marjane Market 2 Mars',
    'MARJANE AIN SEBAA',
    'MARJANE DERB SULTAN',
    'Marjane Market El Menzeh',
    'Marjane Market Inara',
    'Marjane Market KLK CASA VIEW',
    'Marjane Market Beausejour',
    'Marjane Californie',
    'Marjane Morocco Mall',
    'Marjane Sidi Maarouf',
    'Marjane Market Gauthier',
    'Marjane Market Bourgogne',
    'Non affecté',
  ],
  Rabat: [
    'Marjane Market Zaer',
    'Marjane Market Ocean',
    'Marjane Hay Riad',
    'Marjane Bouregreg',
    'Marjane Market Agdal',
    'Marjane Market Hassan',
    'Marjane Market Souissi',
    'Marjane Market Aviation',
    'Non affecté',
  ],
  Marrakech: [
    'MARJANE MENARA',
    'Marjane Market Gueliz',
    'MARJANE MARRA. MASSIRA',
    'Marjane Square',
    'Marjane Market Targa',
    'Non affecté',
  ],
  Agadir: [
    'MARJANE AGADIR FOUNTY',
    'Marjane Market Dakhla',
    'Marjane Market Talborjt',
    'Non affecté',
  ],
  Fès: [
    'MARJANE FES AGDAL',
    'Marjane Fès Saiss',
    'Marjane Market Route Sefrou',
    'Non affecté',
  ],
  Kénitra: [
    'MARJANE KENITRA',
    'Marjane Market Kénitra',
    'Marjane Market Maamora',
    'Non affecté',
  ],
  Salé: [
    'MARJANE SALE',
    'Marjane Salé Tabriquet',
    'Marjane Market Bettana',
    'Marjane Market Sala Al Jadida',
    'Non affecté',
  ],
  Mohammédia: [
    'MARJANE MOHAMMEDIA',
    'Marjane Market Kasbah',
    'Non affecté',
  ],
  Témara: [
    'Marjane Market Temara',
    'Non affecté',
  ],
  Tétouan: [
    'MARJANE TETOUAN HYPER',
    'Marjane Tétouan',
    'Marjane Market Martil',
    'Non affecté',
  ],
  Tetouan: [
    'MARJANE TETOUAN HYPER',
    'Marjane Tétouan',
    'Marjane Market Martil',
    'Non affecté',
  ],
  Tanger: [
    'Marjane Tanger Madina',
    'Marjane Tanger Idrissia',
    'Marjane Market Malabata',
    'Marjane Market Iberia',
    'Non affecté',
  ],
  Meknès: [
    'Marjane Meknès Hamria',
    'Marjane Market Bassatine',
    'Non affecté',
  ],
  Oujda: [
    'Marjane Oujda',
    'Marjane Market Al Qods',
    'Non affecté',
  ],
  'El Jadida': [
    'Marjane El Jadida',
    'Marjane Market Mazagan',
    'Non affecté',
  ],
};

export const ALL_CITIES = Object.keys(MOROCCO_WAREHOUSES);

export function getStoresByCity(city: string): string[] {
  return MOROCCO_WAREHOUSES[city] || MOROCCO_WAREHOUSES['Casablanca'] || [];
}
