export interface AirBaseInfo {
  id: string;
  code: string;
  name: string;
  region: string;
}

export const AIR_BASES: AirBaseInfo[] = [
  { id: 'ear927', code: 'EAR 927', name: 'EAR 927 Cinq-Mars-la-Pile', region: 'Centre-Val de Loire' },
  { id: 'ba705', code: 'BA 705', name: 'BA 705 Tours', region: 'Centre-Val de Loire' },
  { id: 'ba105', code: 'BA 105', name: 'BA 105 Évreux-Fauville', region: 'Normandie' },
  { id: 'ba106', code: 'BA 106', name: 'BA 106 Bordeaux-Mérignac', region: 'Nouvelle-Aquitaine' },
  { id: 'ba107', code: 'BA 107', name: 'BA 107 Villacoublay', region: 'Île-de-France' },
  { id: 'ba113', code: 'BA 113', name: 'BA 113 Saint-Dizier-Robinson', region: 'Grand Est' },
  { id: 'ba115', code: 'BA 115', name: 'BA 115 Orange-Caritat', region: 'Provence-Alpes-Côte d\'Azur' },
  { id: 'ba116', code: 'BA 116', name: 'BA 116 Luxeuil-Saint Sauveur', region: 'Bourgogne-Franche-Comté' },
  { id: 'ba118', code: 'BA 118', name: 'BA 118 Mont-de-Marsan', region: 'Nouvelle-Aquitaine' },
  { id: 'ba120', code: 'BA 120', name: 'BA 120 Cazaux', region: 'Nouvelle-Aquitaine' },
  { id: 'ba123', code: 'BA 123', name: 'BA 123 Orléans-Bricy', region: 'Centre-Val de Loire' },
  { id: 'ba125', code: 'BA 125', name: 'BA 125 Istres-Le Tubé', region: 'Provence-Alpes-Côte d\'Azur' },
  { id: 'ba126', code: 'BA 126', name: 'BA 126 Solenzara', region: 'Corse' },
  { id: 'ba133', code: 'BA 133', name: 'BA 133 Nancy-Ochey', region: 'Grand Est' },
  { id: 'ba278', code: 'BA 278', name: 'BA 278 Ambérieu-en-Bugey', region: 'Auvergne-Rhône-Alpes' },
  { id: 'ba701', code: 'BA 701', name: 'BA 701 Salon-de-Provence', region: 'Provence-Alpes-Côte d\'Azur' },
  { id: 'ba702', code: 'BA 702', name: 'BA 702 Avord', region: 'Centre-Val de Loire' },
  { id: 'ba709', code: 'BA 709', name: 'BA 709 Cognac-Châteaubernard', region: 'Nouvelle-Aquitaine' },
  { id: 'ba942', code: 'BA 942', name: 'BA 942 Lyon-Mont Verdun', region: 'Auvergne-Rhône-Alpes' },
  { id: 'cnsd', code: 'CNSD', name: 'CNSD Fontainebleau', region: 'Île-de-France' }
];

export const MILITARY_UNITS: string[] = [
  'CDC / Contrôle Aérien',
  'Escadron de Chasse',
  'Escadron de Transport',
  'Escadron d\'Hélicoptères',
  'Escadron de Protection (EP)',
  'Escadron Sécurité Incendie Sauvetage (ESIS)',
  'Escadron de Soutien Technique Aéronautique (ESTA)',
  'EETIS / SIC',
  'Groupement d\'Appui à l\'Activité (GAA)',
  'État-Major / Commandement',
  'Antenne Médicale',
  'Cellule EPMS',
  'Autre'
];

export const getBaseName = (serviceId?: string): string => {
  if (!serviceId) return 'Non affecté';
  const found = AIR_BASES.find(b => b.id === serviceId);
  return found ? found.name : serviceId.toUpperCase();
};

export const getBaseCode = (serviceId?: string): string => {
  if (!serviceId) return 'N/A';
  const found = AIR_BASES.find(b => b.id === serviceId);
  return found ? found.code : serviceId.toUpperCase();
};
