
export type ComplianceStatus = 'VALID' | 'WARNING' | 'EXPIRED';

// Règles par défaut (peuvent être surchargées par l'IA ou config)
const VISUAL_INTERVAL_DAYS = 90; // 3 mois
const REGULATORY_INTERVAL_DAYS = 365; // 1 an
const WARNING_THRESHOLD_DAYS = 30; // Alerte 1 mois avant

export const getDaysRemaining = (lastDateStr?: string, intervalDays: number = 365): number => {
    if (!lastDateStr) return -1; // Jamais fait
    
    const lastDate = new Date(lastDateStr);
    const nextDueDate = new Date(lastDate);
    nextDueDate.setDate(lastDate.getDate() + intervalDays);
    
    const today = new Date();
    const diffTime = nextDueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    
    return diffDays;
};

export const getComplianceStatus = (daysRemaining: number): ComplianceStatus => {
    if (daysRemaining < 0) return 'EXPIRED';
    if (daysRemaining <= WARNING_THRESHOLD_DAYS) return 'WARNING';
    return 'VALID';
};

export const formatDateFr = (dateStr?: string): string => {
    if (!dateStr) return 'Jamais';
    const d = new Date(dateStr);
    return d.toLocaleDateString('fr-FR');
};
