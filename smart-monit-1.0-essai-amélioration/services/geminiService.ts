
import { GoogleGenAI, Type } from "@google/genai";
import { UserProfile, DailyForm, Infrastructure, Program, ExerciseLibraryItem, Equipment } from "../types";
import { calculateVMA, estimate1RMFromBodyweight, calculate1RM, analyzeDailyForm } from "../utils/biometrics";

const MODEL_FAST = 'gemini-2.5-flash';
const MODEL_SMART = 'gemini-2.5-pro';

// Instruction Système Globale
const SYSTEM_INSTRUCTION = `IDENTITÉ ET MISSION
- Nom de l'entité : Smart Monit
- Rôle : Conseiller du moniteur, Expert en préparation physique opérationnelle (PPO), en préparation physique générale, coaching de sport et ingénieur en biométrie sportive, assistant IA pour l'utilisateur.
- Missions : Optimiser la préparation et le maintien en Condition Opérationnelle de l'Humain (MCO-H) pour le personnel militaire. Faciliter la gestion d'un service des sports et de ses utilisateurs pour le moniteur.
- Philosophie : Les programmes et les séances doivent être construits selon les vérités scientifiques sur la préparation physique, mentale et les principes de base physiologiques. Le mental est une composante essentielle. Le moniteur reste indispensable pour la validation, le suivi et la supervision de l'application. L'humain prime sur l'ia.
- Ton et style : Direct, cordial, motivant. Précision scientifique pour le moniteur, termes simplifiés pour l'utilisateur.`;

const getAiClient = () => {
    return new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
};

const getMetrics = (user: UserProfile) => {
    const vma = calculateVMA(user.tests);
    let rmUpper = 0;
    if (user.tests.benchPress1RM) rmUpper = user.tests.benchPress1RM;
    else if (user.tests.pushups) rmUpper = estimate1RMFromBodyweight(user.tests.pushups, user.gender);

    let rmLower = 0;
    if (user.tests.squat1RM) rmLower = user.tests.squat1RM;
    
    return { 
        vma, 
        rmUpper, 
        rmLower, 
        tests: user.tests 
    };
};

export const parseTrainingFile = async (base64Data: string, mimeType: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `Analyses ce document (PDF ou Image) d'entraînement. 
    Extrais les informations structurées pour intégration système.
    
    Retourne obligatoirement un JSON valide respectant ce schéma :
    {
      "title": "Nom du programme extrait",
      "goal": "Objectif détecté",
      "sessions": [
        {
          "dayNumber": 1,
          "title": "Nom de la séance",
          "type": "Musculation/Cardio/HIIT",
          "description": "Description globale",
          "exercises": [
            { "name": "Nom de l'exercice", "reps": "Prescription", "sets": 3, "rest": "1:30" }
          ]
        }
      ]
    }`;

    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: mimeType } }
            ]
        },
        config: {
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });
    
    try {
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("JSON Parse error in parseTrainingFile", e);
        return { title: "Erreur de parsing", sessions: [] };
    }
};

export const parsePlanningFile = async (base64Data: string, mimeType: string): Promise<any> => {
    const ai = getAiClient();
    const prompt = `Analyse ce document de planning hebdomadaire (Image ou PDF).
    Extrais les séances collectives encadrées.
    
    Règles:
    - Jour de la semaine : 1=Lundi, 2=Mardi ... 5=Vendredi.
    - Si le jour n'est pas explicite, essaie de le déduire de la colonne.
    - Heures au format HH:MM.
    
    Retourne un JSON strictement valide :
    {
      "extractedSessions": [
        {
           "title": "Titre de la séance (ex: Crossfit, Natation)",
           "dayOfWeek": 1,
           "timeStart": "08:00",
           "timeEnd": "09:00",
           "locationName": "Lieu (ex: Gymnase, Piscine)",
           "instructorName": "Nom du moniteur si présent, sinon 'Staff EPMS'"
        }
      ]
    }`;

    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: mimeType } }
            ]
        },
        config: {
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });
    
    try {
        return JSON.parse(response.text || '{ "extractedSessions": [] }');
    } catch (e) {
        console.error("JSON Parse error in parsePlanningFile", e);
        return { extractedSessions: [] };
    }
};

export const getRegulatoryInfo = async (itemName: string, itemType: string): Promise<string> => {
    const ai = getAiClient();
    const context = `Tu es expert en réglementation des infrastructures sportives et du matériel de sport (Code du sport, Normes AFNOR).
    Donne les obligations de contrôle pour : ${itemName} (Type: ${itemType}).
    Précise la fréquence des contrôles visuels et des contrôles par organisme agréé.
    Sois concis et précis.`;

    const response = await ai.models.generateContent({
        model: MODEL_SMART,
        contents: context,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });
    return response.text || "Information non disponible.";
};

export const generateFlashSession = async (
    user: UserProfile, 
    lastDaily: DailyForm, 
    locationName: string, 
    sessionType: string, 
    duration: number,
    availableInfras: Infrastructure[],
    exerciseLibrary: ExerciseLibraryItem[] = [],
    availableEquipment: Equipment[] = []
): Promise<any> => {
    const ai = getAiClient();
    const { vma, rmUpper, rmLower, tests } = getMetrics(user);
    const formAnalysis = analyzeDailyForm(lastDaily);
    let adaptationInstructions = typeof formAnalysis === 'string' ? formAnalysis : formAnalysis.join('\n');
    
    // Formatage des données contextuelles pour accélérer la génération (Limitation du contexte)
    const filteredEquip = availableEquipment.slice(0, 30);
    const equipmentList = filteredEquip.map(e => `- ${e.name} (${e.category})`).join('\n');
    
    // Filtrer la bibliothèque pour ne garder que le pertinent
    const relevantLibrary = exerciseLibrary.filter(e => 
      e.type === sessionType || e.equipment === 'Aucun' || sessionType.includes('Cardio')
    ).slice(0, 40);
    const libraryList = relevantLibrary.map(e => `- ${e.name} (Type: ${e.type}, Equip: ${e.equipment})`).join('\n');
    
    // Enrichissement du contexte avec Profil Métier et Règles de prescription
    const context = `
    CONTEXTE UTILISATEUR:
    - Genre: ${user.gender === 'H' ? 'Homme' : 'Femme'}
    - Métier: ${user.jobType}
    - VMA: ${vma} km/h
    - 1RM Haut du corps estimé: ${rmUpper} kg
    - 1RM Bas du corps estimé: ${rmLower} kg
    - Chronos: 10km: ${tests.run10kmTime || 'N/A'}, Semi: ${tests.runSemiMarathonTime || 'N/A'}, 20km: ${tests.run20kmTime || 'N/A'}
    - Max Tractions: ${tests.maxPullups || tests.pullups || 'N/A'}
    - État du jour: Fatigue ${lastDaily.fatigueLevel}/10, Stress ${lastDaily.stressLevel}/10.
    - Consignes Santé impératives: ${adaptationInstructions}

    CONTEXTE LIEU (${locationName}):
    - Matériel DISPONIBLE sur place (Liste stricte) :
    ${equipmentList.length > 0 ? equipmentList : "AUCUN (Poids du corps uniquement ou système D)"}

    BIBLIOTHÈQUE D'EXERCICES DU MONITEUR (Référence prioritaire) :
    ${libraryList}

    DEMANDE :
    Génère une séance "${sessionType}" de ${duration} minutes.

    RÈGLES DE GÉNÉRATION ET LOGIQUE MÉTIER :
    1. PRIORITÉ EXERCICES : Pioche prioritairement dans la bibliothèque fournie si compatible avec le matériel. Si nécessaire, tu peux créer des exercices classiques manquants (ex: gainage).
    2. COMPATIBILITÉ MATÉRIEL : N'utilise QUE le matériel listé dans "Matériel DISPONIBLE". Si la liste est vide, fais du poids du corps.
    3. AFFECTATION MATÉRIEL : Précise le matériel nécessaire pour chaque exercice dans la description ou le nom de l'exercice.
    4. PROFIL MÉTIER : 
       - Si PN (Personnel Navigant / Pilotes): Stabilisation segmentaire, renforcement profond cervical (trapèze/rhomboïdes). Bannir la force maximale post-vol.
       - Si Personnel Logistique et Technique (Mécaniciens, Armuriers): Rééquilibrage musculaire, protocole excentrique (TMS), éducation gestuelle (soulevé de terre).
       - Si Pompier ou Fusilier Commando (Fusco): HIIT, fractionné, renforcement lourd sangle abdominale et lombaires (Farmer walk, pallof press).
       - Si Poste Assis / Administratif / Gestionnaire: Réactivation musculaire (fessiers, psoas), régulation par le cardio (stress), ouverture thoracique (mobilité).
    5. PRESCRIPTION :
       - Ne donne JAMAIS de charges fixes (ex: "80kg"). Utilise TOUJOURS des % relatifs : "[75% 1RM]" ou "[60% VMA]".
       - Utilise les performances de l'utilisateur pour calculer les charges (ex: Squat 1RM = 100kg -> 75% = 75kg). 
       - Pour la course, utilise les chronos (10km, semi, 20km) et la VMA pour déduire l'allure (min/km).
       - ATTENTION CRITIQUE: Ne donne JAMAIS d'indication d'allure (min/km), de vitesse ou de VMA pour des exercices au poids du corps (ex: Burpees, Pompes, Tractions) ou de musculation. L'allure est STRICTEMENT réservée à la course à pied, au vélo ou à la natation.
       - Tempo des mouvements : Indique la vitesse d'exécution (ex: "Descente en 4T / Poussée en 1T", "Mouvement lent", "Vitesse max").
       - Précise les temps de récupération entre les exercices et entre les séries, cohérents avec l'objectif de la séance.
    6. FATIGUE : Si Fatigue > 4, baisse les % recommandés de 10-15%.
    7. FORMAT : Échauffement progressif (notion de sport santé) -> Corps de séance cohérent (préciser le fonctionnement: circuit, séries, EMOM, etc.) -> Retour au calme (redescente progressive).

    Génère la séance en JSON.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: context,
        config: {
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_INSTRUCTION,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                    warmup: { type: Type.STRING },
                    mainBlock: { 
                        type: Type.ARRAY, 
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                exercise: { type: Type.STRING },
                                prescription: { type: Type.STRING, description: "Utiliser format [XX% VMA] ou [XX% 1RM]" },
                                tempo: { type: Type.STRING },
                                rest: { type: Type.STRING }
                            }
                        }
                    },
                    cooldown: { type: Type.STRING },
                    advice: { type: Type.STRING }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("JSON Parse error in generateFlashSession", e);
        return { warmup: "Erreur de génération", mainBlock: [], cooldown: "", advice: "" };
    }
};

export const generateFullProgram = async (
    user: UserProfile,
    goal: string,
    sessionsPerWeek: number,
    weeks: number,
    allowedLocations: string[] = []
): Promise<any> => {
    const ai = getAiClient();
    const { vma, rmUpper, rmLower, tests } = getMetrics(user);
    
    const context = `
    CONTEXTE UTILISATEUR:
    - Genre: ${user.gender === 'H' ? 'Homme' : 'Femme'}
    - Métier: ${user.jobType}
    - VMA: ${vma} km/h
    - 1RM Haut du corps estimé: ${rmUpper} kg
    - 1RM Bas du corps estimé: ${rmLower} kg
    - Chronos: 10km: ${tests.run10kmTime || 'N/A'}, Semi: ${tests.runSemiMarathonTime || 'N/A'}, 20km: ${tests.run20kmTime || 'N/A'}
    - Max Tractions: ${tests.maxPullups || tests.pullups || 'N/A'}

    DEMANDE :
    Génère un programme d'entraînement COMPLET et DÉTAILLÉ.
    - Objectif: ${goal}
    - Durée: ${weeks} semaines
    - Fréquence: ${sessionsPerWeek} séances par semaine
    - Lieux possibles: ${allowedLocations.length > 0 ? allowedLocations.join(', ') : 'Chez moi'}

    RÈGLES DE GÉNÉRATION (DOCTRINE PPO) :
    - PROFIL MÉTIER : 
       - Si PN (Personnel Navigant / Pilotes): Stabilisation segmentaire, renforcement profond cervical (trapèze/rhomboïdes). Bannir la force maximale post-vol.
       - Si Personnel Logistique et Technique (Mécaniciens, Armuriers): Rééquilibrage musculaire, protocole excentrique (TMS), éducation gestuelle (soulevé de terre).
       - Si Pompier ou Fusilier Commando (Fusco): HIIT, fractionné, renforcement lourd sangle abdominale et lombaires (Farmer walk, pallof press).
       - Si Poste Assis / Administratif / Gestionnaire: Réactivation musculaire (fessiers, psoas), régulation par le cardio (stress), ouverture thoracique (mobilité).
    1. MACROCYCLE : Vision globale orientée vers l'objectif.
    2. MÉSOCYCLE (Règle du 3:1) :
       - Semaines 1 à 3 (ou équivalent) : Charge progressive (augmentation du volume et de l'intensité).
       - Semaine 4 (ou chaque 4ème semaine) : Décharge (Deload). Réduction du volume de 40%, maintien de l'intensité pour favoriser la surcompensation.
    3. MICROCYCLE : Alterner séances intensives avec séances à intensité modérée ou alterner les sollicitations musculaires.
    4. SÉANCES : Chaque séance doit être complète avec Échauffement, Corps de séance et Retour au calme.
    5. LIEUX : Affecter un lieu parmi les "Lieux possibles" pour chaque séance.
    6. PRESCRIPTION : Utilise TOUJOURS des % relatifs ([XX% VMA] ou [XX% 1RM]). Calcule les allures de course (min/km) à partir de la VMA.
    7. FORMAT : Réponds avec un JSON structuré.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: context,
        config: {
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_INSTRUCTION,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    programTitle: { type: Type.STRING },
                    sessions: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                weekNumber: { type: Type.NUMBER },
                                dayNumber: { type: Type.NUMBER },
                                title: { type: Type.STRING },
                                type: { type: Type.STRING },
                                locationName: { type: Type.STRING },
                                description: { type: Type.STRING },
                                durationMinutes: { type: Type.NUMBER },
                                content: {
                                    type: Type.OBJECT,
                                    properties: {
                                        warmup: { type: Type.STRING },
                                        mainBlock: {
                                            type: Type.ARRAY,
                                            items: {
                                                type: Type.OBJECT,
                                                properties: {
                                                    exercise: { type: Type.STRING },
                                                    prescription: { type: Type.STRING },
                                                    tempo: { type: Type.STRING },
                                                    rest: { type: Type.STRING }
                                                }
                                            }
                                        },
                                        cooldown: { type: Type.STRING },
                                        advice: { type: Type.STRING }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    try {
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("JSON Parse error in generateFullProgram", e);
        return { programTitle: "Erreur de génération", sessions: [] };
    }
};

export const suggestSessionModifications = async (
    session: any,
    user: UserProfile,
    lastDaily: DailyForm
): Promise<any> => {
    const ai = getAiClient();
    const { vma, rmUpper, rmLower, tests } = getMetrics(user);
    const formAnalysis = analyzeDailyForm(lastDaily);
    let adaptationInstructions = typeof formAnalysis === 'string' ? formAnalysis : formAnalysis.join('\n');

    const context = `
    CONTEXTE UTILISATEUR:
    - Genre: ${user.gender === 'H' ? 'Homme' : 'Femme'}
    - Métier: ${user.jobType}
    - VMA: ${vma} km/h
    - 1RM Haut du corps estimé: ${rmUpper} kg
    - 1RM Bas du corps estimé: ${rmLower} kg
    - Chronos: 10km: ${tests.run10kmTime || 'N/A'}, Semi: ${tests.runSemiMarathonTime || 'N/A'}, 20km: ${tests.run20kmTime || 'N/A'}
    - Max Tractions: ${tests.maxPullups || tests.pullups || 'N/A'}
    - État du jour: Fatigue ${lastDaily.fatigueLevel}/10, Stress ${lastDaily.stressLevel}/10.
    - Consignes Santé impératives: ${adaptationInstructions}

    SÉANCE SÉLECTIONNÉE:
    - Titre: ${session.title}
    - Type: ${session.type}
    - Description: ${session.description}
    - Contenu actuel: ${JSON.stringify(session.content)}

    DEMANDE :
    Suggère des modifications pour cette séance afin qu'elle soit parfaitement adaptée à l'état de forme du jour de l'utilisateur et à son profil métier.
    Si la séance est déjà adaptée, retourne le contenu tel quel, mais tu peux ajouter des conseils.

    RÈGLES DE PRESCRIPTION :
    - PROFIL MÉTIER : 
       - Si PN (Personnel Navigant / Pilotes): Stabilisation segmentaire, renforcement profond cervical (trapèze/rhomboïdes). Bannir la force maximale post-vol.
       - Si Personnel Logistique et Technique (Mécaniciens, Armuriers): Rééquilibrage musculaire, protocole excentrique (TMS), éducation gestuelle (soulevé de terre).
       - Si Pompier ou Fusilier Commando (Fusco): HIIT, fractionné, renforcement lourd sangle abdominale et lombaires (Farmer walk, pallof press).
       - Si Poste Assis / Administratif / Gestionnaire: Réactivation musculaire (fessiers, psoas), régulation par le cardio (stress), ouverture thoracique (mobilité).
    - Ne donne JAMAIS de charges fixes (ex: "80kg"). Utilise TOUJOURS des % relatifs : "[75% 1RM]" ou "[60% VMA]".
    - Utilise les performances de l'utilisateur pour calculer les charges (ex: Squat 1RM = 100kg -> 75% = 75kg). 
    - Pour la course, utilise les chronos (10km, semi, 20km) et la VMA pour déduire l'allure (min/km).
    - ATTENTION CRITIQUE: Ne donne JAMAIS d'indication d'allure (min/km), de vitesse ou de VMA pour des exercices au poids du corps (ex: Burpees, Pompes, Tractions) ou de musculation. L'allure est STRICTEMENT réservée à la course à pied, au vélo ou à la natation.
    - Tempo des mouvements : Indique la vitesse d'exécution (ex: "Descente en 4T / Poussée en 1T", "Mouvement lent", "Vitesse max").
    - Précise les temps de récupération entre les exercices et entre les séries, cohérents avec l'objectif de la séance.
    - FORMAT : Échauffement progressif (notion de sport santé) -> Corps de séance cohérent (préciser le fonctionnement: circuit, séries, EMOM, etc.) -> Retour au calme (redescente progressive).

    Retourne la séance modifiée en JSON avec les modifications appliquées.
    `;

    const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: context,
        config: {
            responseMimeType: "application/json",
            systemInstruction: SYSTEM_INSTRUCTION,
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    equipmentNeeded: { type: Type.ARRAY, items: { type: Type.STRING } },
                    warmup: { type: Type.STRING },
                    mainBlock: { 
                        type: Type.ARRAY, 
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                exercise: { type: Type.STRING },
                                prescription: { type: Type.STRING },
                                tempo: { type: Type.STRING },
                                rest: { type: Type.STRING }
                            }
                        }
                    },
                    cooldown: { type: Type.STRING },
                    advice: { type: Type.STRING }
                }
            }
        }
    });

    try {
        return JSON.parse(response.text || '{}');
    } catch (e) {
        console.error("JSON Parse error in suggestSessionModifications", e);
        return session.content;
    }
};

export const chatWithCoach = async (history: any[], message: string) => {
    const ai = getAiClient();
    const chat = ai.chats.create({ 
        model: MODEL_SMART, 
        history,
        config: {
            systemInstruction: SYSTEM_INSTRUCTION
        }
    });
    const result = await chat.sendMessage({ message });
    return result.text;
};
