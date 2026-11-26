import { Infrastructure, Equipment, InspectionLog, InfrastructureType } from '../types';

export type ComplianceStatus = 'VALID' | 'WARNING' | 'EXPIRED';

export interface RegulatoryRule {
  normCode: string;
  title: string;
  legalBasis: string;
  visualIntervalDays: number;
  visualLabel: string;
  regulatoryIntervalDays: number;
  regulatoryLabel: string;
  summary: string;
}

/**
 * Moteur de règles réglementaires issu du Dossier SMART MONIT 1.0 (Section 4.3.1)
 */
export const REGULATORY_RULES_DB: Record<string, RegulatoryRule> = {
  MUSCULATION: {
    normCode: 'NF EN ISO 20957',
    title: 'Appareils de musculation et fitness fixes',
    legalBasis: 'Code du Sport Art. L.322-2, R.322-19, R.322-25 & PIA 7.1.1',
    visualIntervalDays: 30,
    visualLabel: 'Visuel mensuel (30j)',
    regulatoryIntervalDays: 90,
    regulatoryLabel: 'Opérationnel trimestriel (90j)',
    summary: 'Contrôle visuel mensuel (câbles, goupilles, sellerie, stabilité) et contrôle opérationnel trimestriel consignés au registre (Art. R.322-25).'
  },
  BUTS: {
    normCode: 'NF S52-409',
    title: 'Buts sportifs (Foot, Hand, Basket, Rugby)',
    legalBasis: 'Code du Sport Art. R.322-22 & R.322-25',
    visualIntervalDays: 180,
    visualLabel: 'Opérationnel (6 mois)',
    regulatoryIntervalDays: 730,
    regulatoryLabel: 'Principal / Charge (24 mois)',
    summary: 'Vérification semestrielle de stabilité/fixation et essai de charge réglementaire tous les 24 mois pour prévenir tout risque de basculement.'
  },
  ESCALADE: {
    normCode: 'NF EN 12572',
    title: 'Structures Artificielles d\'Escalade (SAE)',
    legalBasis: 'Code du Sport Art. L.322-2 & R.322-25',
    visualIntervalDays: 90,
    visualLabel: 'Visuel & EPI (3 mois)',
    regulatoryIntervalDays: 365,
    regulatoryLabel: 'Organisme agréé (1 an)',
    summary: 'Contrôle des points d\'ancrage, panneaux, prises et EPI (baudriers/cordes) selon NF EN 12572 et vérification annuelle complète.'
  },
  STANDARD_INFRA: {
    normCode: 'PIA 7.1.1 (Annexe B)',
    title: 'Installations sportives militaires (Piste, Dojo, PO, Cage)',
    legalBasis: 'Code du Sport Art. L.322-2, R.322-19 & PIA 7.1.1 p.18/253',
    visualIntervalDays: 90,
    visualLabel: 'Visuel (3 mois)',
    regulatoryIntervalDays: 365,
    regulatoryLabel: 'Réglementaire annuel (1 an)',
    summary: 'La sécurité des installations est un préalable impératif à toute activité dirigée. Contrôle visuel trimestriel et audit annuel archivé.'
  }
};

export const getRegulatoryRuleForInfra = (type: InfrastructureType): RegulatoryRule => {
  switch (type) {
    case InfrastructureType.GYM_WEIGHTS:
    case InfrastructureType.GYM_MIXED:
    case InfrastructureType.GYM_CARDIO:
      return REGULATORY_RULES_DB.MUSCULATION;
    case InfrastructureType.SPORTS_GOALS:
    case InfrastructureType.OUTDOOR_FIELD:
      return REGULATORY_RULES_DB.BUTS;
    case InfrastructureType.CLIMBING_WALL:
      return REGULATORY_RULES_DB.ESCALADE;
    default:
      return REGULATORY_RULES_DB.STANDARD_INFRA;
  }
};

export const getRegulatoryRuleForEquipment = (category: Equipment['category']): RegulatoryRule => {
  switch (category) {
    case 'Musculation':
    case 'Cardio':
      return REGULATORY_RULES_DB.MUSCULATION;
    case 'Buts sportifs':
      return REGULATORY_RULES_DB.BUTS;
    case 'Escalade (SAE)':
      return REGULATORY_RULES_DB.ESCALADE;
    default:
      return REGULATORY_RULES_DB.STANDARD_INFRA;
  }
};

const WARNING_THRESHOLD_DAYS = 20;

export const getDaysRemaining = (lastDateStr?: string, intervalDays: number = 365): number => {
  if (!lastDateStr) return -999; // Jamais effectué

  const lastDate = new Date(lastDateStr);
  if (isNaN(lastDate.getTime())) return -999;

  const nextDueDate = new Date(lastDate);
  nextDueDate.setDate(lastDate.getDate() + intervalDays);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  nextDueDate.setHours(0, 0, 0, 0);

  const diffTime = nextDueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getComplianceStatus = (daysRemaining: number): ComplianceStatus => {
  if (daysRemaining < 0) return 'EXPIRED';
  if (daysRemaining <= WARNING_THRESHOLD_DAYS) return 'WARNING';
  return 'VALID';
};

export const formatDateFr = (dateStr?: string): string => {
  if (!dateStr) return 'Jamais';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('fr-FR');
};

export const formatDateTimeFr = (isoStr?: string): string => {
  if (!isoStr) return '-';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Exporte le Registre de Sécurité numérique (Art. R.322-25 du Code du Sport) en CSV
 */
export const exportSecurityRegistryCSV = (
  baseName: string,
  infras: Infrastructure[],
  equipment: Equipment[],
  logs: InspectionLog[]
) => {
  const bom = '\uFEFF';
  const lines: string[] = [
    `"REGISTRE NUMERIQUE DE SECURITE DES INSTALLATIONS SPORTIVES (Art. R.322-25 Code du Sport)"`,
    `"Base / Site";"${baseName}";"Date d'extraction";"${new Date().toLocaleString('fr-FR')}"`,
    '',
    '"--- ETAT DE CONFORMITE ACTUEL ---"',
    '"Catégorie";"Nom";"Type / Localisation";"Norme";"Dernier contrôle visuel";"Prochain visuel";"Dernier contrôle réglementaire";"Statut matériel"'
  ];

  infras.forEach(i => {
    const rule = getRegulatoryRuleForInfra(i.type);
    const vDays = getDaysRemaining(i.lastVisualInspection, i.visualIntervalDays || rule.visualIntervalDays);
    lines.push(
      `"INFRASTRUCTURE";"${i.name}";"${i.type}";"${i.normReference || rule.normCode}";"${formatDateFr(i.lastVisualInspection)}";"${vDays < 0 ? 'EXPIRÉ' : `Dans ${vDays}j`}";"${formatDateFr(i.lastRegulatoryInspection)}";"${i.status || 'Operational'}"`
    );
  });

  equipment.forEach(e => {
    const rule = getRegulatoryRuleForEquipment(e.category);
    const infraName = infras.find(i => i.id === e.infrastructureId)?.name || 'Non affecté';
    const vDays = getDaysRemaining(e.lastVisualInspection, e.visualIntervalDays || rule.visualIntervalDays);
    lines.push(
      `"MATERIEL";"${e.name}";"${e.category} (${infraName})";"${e.normReference || rule.normCode}";"${formatDateFr(e.lastVisualInspection)}";"${vDays < 0 ? 'EXPIRÉ' : `Dans ${vDays}j`}";"${formatDateFr(e.lastRegulatoryInspection)}";"${e.status}"`
    );
  });

  lines.push('', '"--- HISTORIQUE HORODATE DES CONTROLES ---"');
  lines.push('"Horodatage";"Cible";"Type contrôle";"Norme";"Contrôleur (NID)";"Résultat";"Observations"');

  logs.forEach(log => {
    lines.push(
      `"${formatDateTimeFr(log.timestamp)}";"${log.targetName}";"${log.inspectionType}";"${log.normReference || '-'}";"${log.inspectorName} (${log.inspectorNid})";"${log.status}";"${(log.notes || '').replace(/"/g, '""')}"`
    );
  });

  const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Registre_Securite_${baseName.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
