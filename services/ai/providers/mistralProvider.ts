import { analyzeDailyFormStructured } from '../../../utils/biometrics';
import { SYSTEM_PROMPT_PROGRAM_DRAFT } from '../prompts';
import {
  IAIProvider,
  SYSTEM_INSTRUCTION,
  FlashSessionRequest,
  FullProgramRequest,
  SessionAdaptationRequest
} from '../types';

/** Fournisseur externe optionnel. Ne pas activer avec des données personnelles sans intégration serveur validée. */
export class MistralProvider implements IAIProvider {
  readonly id = 'mistral' as const;
  readonly label = 'Mistral AI — fournisseur externe';
  readonly sovereigntyNote =
    'Service externe optionnel. Cette démonstration ne fournit pas de passerelle serveur sécurisée pour les données personnelles.';

  private getApiKey(): string {
    return process.env.MISTRAL_API_KEY || '';
  }

  private getBaseUrl(): string {
    return (process.env.MISTRAL_BASE_URL || 'https://api.mistral.ai/v1').replace(/\/$/, '');
  }

  private getFastModel(): string {
    return process.env.MISTRAL_MODEL_FAST || 'mistral-small-latest';
  }

  private getSmartModel(): string {
    return process.env.MISTRAL_MODEL_SMART || 'mistral-large-latest';
  }

  private getVisionModel(): string {
    return process.env.MISTRAL_MODEL_VISION || 'pixtral-12b-2409';
  }

  isConfigured(): boolean {
    const key = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    // Si endpoint souverain interne (non api.mistral.ai) configuré, la clé peut être optionnelle (mTLS / réseau privé)
    if (baseUrl && !baseUrl.includes('api.mistral.ai')) return true;
    return Boolean(key && key.length > 10 && !key.includes('your_mistral_api_key'));
  }

  private async callChatCompletion(
    messages: any[],
    options: { model?: string; jsonMode?: boolean; temperature?: number } = {}
  ): Promise<string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    const key = this.getApiKey();
    if (key) {
      headers['Authorization'] = `Bearer ${key}`;
    }

    const body: Record<string, any> = {
      model: options.model || this.getFastModel(),
      messages: [
        { role: 'system', content: `${SYSTEM_INSTRUCTION}\n\n${SYSTEM_PROMPT_PROGRAM_DRAFT}` },
        ...messages
      ],
      temperature: options.temperature ?? 0.3
    };

    if (options.jsonMode) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch(`${this.getBaseUrl()}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Mistral API HTTP ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content || '';
  }

  async generateFlashSession(req: FlashSessionRequest): Promise<any> {
    const { anonUser, dailyForm, locationLabel, sessionType, durationMinutes, exerciseLibrary, availableEquipment } = req;
    const analysis = analyzeDailyFormStructured(dailyForm);
    const equipmentList = availableEquipment.slice(0, 30).map((e) => `- ${e.name} (${e.category})`).join('\n');
    const libraryList = exerciseLibrary.slice(0, 35).map((e) => `- ${e.name} (${e.type}, ${e.equipment})`).join('\n');

    const prompt = `
PROFIL BIOMÉTRIQUE ANONYMISÉ (RGPD):
- Genre: ${anonUser.gender === 'H' ? 'Homme' : 'Femme'} | Métier: ${anonUser.jobType} (${anonUser.jobDirective}) | Horaires: ${anonUser.workSchedule}
- VMA: ${anonUser.vmaKmH} km/h | 1RM Haut: ${anonUser.rmUpperKg} kg | 1RM Bas: ${anonUser.rmLowerKg} kg
- Bilan forme (${analysis.zone}): Sommeil ${dailyForm.sleepQuality}/10, Fatigue ${dailyForm.fatigueLevel}/10, Stress ${dailyForm.stressLevel}/10, Douleur ${dailyForm.painLevel}/10${dailyForm.painZone ? ` (${dailyForm.painZone})` : ''}.
- Consignes Santé: ${analysis.instructions.join(' ')}

LIEU (${locationLabel}) & MATÉRIEL DISPONIBLE:
${equipmentList || 'AUCUN (Poids du corps uniquement)'}

BIBLIOTHÈQUE D'EXERCICES:
${libraryList}

Génère une séance "${sessionType}" de ${durationMinutes} minutes. Prescris TOUJOURS en % relatifs ("[75% 1RM]" ou "[85% VMA]").
Réponds STRICTEMENT en JSON avec cette structure exacte :
{
  "title": "string",
  "description": "string",
  "equipmentNeeded": ["string"],
  "warmup": "string",
  "mainBlock": [{ "exercise": "string", "prescription": "string", "tempo": "string", "rest": "string" }],
  "cooldown": "string",
  "advice": "string"
}`;

    const text = await this.callChatCompletion([{ role: 'user', content: prompt }], {
      model: this.getFastModel(),
      jsonMode: true
    });
    return JSON.parse(text);
  }

  async generateFullProgram(req: FullProgramRequest): Promise<any> {
    const { anonUser, goal, sessionsPerWeek, weeks, allowedLocations } = req;
    const prompt = `
PROFIL ANONYMISÉ: ${anonUser.jobType} (${anonUser.jobDirective}), VMA ${anonUser.vmaKmH} km/h, 1RM Haut ${anonUser.rmUpperKg} kg, 1RM Bas ${anonUser.rmLowerKg} kg.
DEMANDE: Programme PPO de ${weeks} semaines, ${sessionsPerWeek} séances/semaine. Objectif: ${goal}. Lieux: ${allowedLocations.join(', ') || 'Base'}.
Propose une progression individualisée et cohérente avec l'objectif, le niveau et la récupération. Les intensités chiffrées doivent reposer sur des références réellement renseignées.
Réponds STRICTEMENT en JSON :
{
  "programTitle": "string",
  "sessions": [{
    "weekNumber": 1, "dayNumber": 1, "title": "string", "type": "MUSCU", "locationName": "string",
    "description": "string", "durationMinutes": 45,
    "content": {
      "warmup": "string",
      "mainBlock": [{ "exercise": "string", "prescription": "string", "tempo": "string", "rest": "string" }],
      "cooldown": "string", "advice": "string"
    }
  }]
}`;

    const text = await this.callChatCompletion([{ role: 'user', content: prompt }], {
      model: this.getFastModel(),
      jsonMode: true
    });
    return JSON.parse(text);
  }

  async suggestSessionModifications(req: SessionAdaptationRequest): Promise<any> {
    const { anonUser, dailyForm, session } = req;
    const analysis = analyzeDailyFormStructured(dailyForm);
    const prompt = `
PROFIL ANONYMISÉ: ${anonUser.jobType}, VMA ${anonUser.vmaKmH} km/h, 1RM Haut ${anonUser.rmUpperKg} kg, 1RM Bas ${anonUser.rmLowerKg} kg.
BILAN DU JOUR (${analysis.zone}): Sommeil ${dailyForm.sleepQuality}/10, Fatigue ${dailyForm.fatigueLevel}/10, Stress ${dailyForm.stressLevel}/10, Douleur ${dailyForm.painLevel}/10 (${dailyForm.painZone || 'aucune'}).
Consignes: ${analysis.instructions.join(' ')}
SÉANCE PRÉVUE: ${session.title} (${session.type}) — ${JSON.stringify(session.content)}
Retourne la séance adaptée STRICTEMENT en JSON :
{ "title": "string", "description": "string", "equipmentNeeded": ["string"], "warmup": "string", "mainBlock": [{ "exercise": "string", "prescription": "string", "tempo": "string", "rest": "string" }], "cooldown": "string", "advice": "string" }`;

    const text = await this.callChatCompletion([{ role: 'user', content: prompt }], {
      model: this.getFastModel(),
      jsonMode: true
    });
    return JSON.parse(text);
  }

  async parseTrainingFile(base64Data: string, mimeType: string): Promise<any> {
    const isImage = mimeType.startsWith('image/');
    const content = isImage
      ? [
          {
            type: 'text',
            text: `Extrais le programme d'entraînement de cette image en JSON strict :
{ "title": "string", "goal": "string", "sessions": [{ "dayNumber": 1, "title": "string", "type": "MUSCU", "description": "string", "exercises": [{ "name": "string", "reps": "string", "sets": 3, "rest": "1:30" }] }] }`
          },
          { type: 'image_url', image_url: `data:${mimeType};base64,${base64Data}` }
        ]
      : `Document base64 (${mimeType}) non-image : génère une trame de programme JSON structurée standard.`;

    const text = await this.callChatCompletion([{ role: 'user', content }], {
      model: isImage ? this.getVisionModel() : this.getFastModel(),
      jsonMode: true
    });
    return JSON.parse(text);
  }

  async parsePlanningFile(base64Data: string, mimeType: string): Promise<any> {
    const isImage = mimeType.startsWith('image/');
    const content = isImage
      ? [
          {
            type: 'text',
            text: `Extrais les créneaux de ce planning de cours (dayOfWeek 1=Lundi..7=Dimanche, HH:MM) en JSON strict :
{ "extractedSessions": [{ "title": "string", "dayOfWeek": 1, "timeStart": "08:30", "timeEnd": "09:45", "locationName": "string", "instructorName": "Coach" }] }`
          },
          { type: 'image_url', image_url: `data:${mimeType};base64,${base64Data}` }
        ]
      : `Retourne { "extractedSessions": [] }`;

    const text = await this.callChatCompletion([{ role: 'user', content }], {
      model: isImage ? this.getVisionModel() : this.getFastModel(),
      jsonMode: true
    });
    return JSON.parse(text);
  }

  async getRegulatoryInfo(itemName: string, itemType: string, localReference: string): Promise<string> {
    const text = await this.callChatCompletion(
      [
        {
          role: 'user',
          content: `Aide à la recherche documentaire sur les installations sportives françaises. À partir uniquement des références fournies, résume les points à vérifier pour ${itemName} (${itemType}) : ${localReference}. N'affirme pas qu'une installation est conforme, n'invente aucune obligation ni référence et recommande de vérifier les textes en vigueur avec le responsable compétent.`
        }
      ],
      { model: this.getFastModel() }
    );
    return text || localReference;
  }

  async chatWithCoach(history: { role: 'user' | 'assistant'; content: string }[], message: string): Promise<string> {
    return this.callChatCompletion([...history, { role: 'user', content: message }], {
      model: this.getSmartModel()
    });
  }
}
