import { PrescriptionMode, ProgramExercise } from '../types';
import { formatDurationSec } from './calculationEngine';

export interface ParsedQuickPrescription {
  valid: boolean;
  mode: PrescriptionMode;
  patch: Partial<ProgramExercise>;
  humanPreview: string;
  tokens: string[];
}

const parseRestToken = (raw: string): { rest: string; restSec: number } | null => {
  // Formats : r2', r1'30, r90s, r1:30, récup 2min, repos 45s
  const mMinSec = raw.match(/(?:r|r[eé]cup|repos)\s*(\d+)\s*['’:]\s*(\d{1,2})/i);
  if (mMinSec) {
    const mins = parseInt(mMinSec[1], 10);
    const secs = parseInt(mMinSec[2], 10);
    return { rest: `${mins}:${String(secs).padStart(2, '0')}`, restSec: mins * 60 + secs };
  }
  const mMin = raw.match(/(?:r|r[eé]cup|repos)\s*(\d+)\s*(?:min|'|’|m(?!\w))/i);
  if (mMin) {
    const mins = parseInt(mMin[1], 10);
    return { rest: `${mins}:00`, restSec: mins * 60 };
  }
  const mSec = raw.match(/(?:r|r[eé]cup|repos)\s*(\d+)\s*(?:sec|s|")/i);
  if (mSec) {
    const secs = parseInt(mSec[1], 10);
    const mm = Math.floor(secs / 60);
    const ss = secs % 60;
    return { rest: `${mm}:${String(ss).padStart(2, '0')}`, restSec: secs };
  }
  return null;
};

/**
 * Interpréteur de saisie rapide au clavier en syntaxe naturelle de préparateur physique :
 * - "4x8 @75%" ou "4x8-10 @75% 1RM r2'"
 * - "4x6 @85kg tempo 3-1-1-0 r2'30"
 * - "3x10' @80% VMA r2'"
 * - "8x400m @95% VMA r1'30"
 * - "30' @65% VMA" ou "10km @85% VMA"
 * - "3x45s r30s" (mobilité / gainage)
 * - "10km 15kg 1h30" (marche chargée)
 * - "3xMAX r1'" (poids de corps échec technique)
 */
export const parseQuickPrescription = (input: string): ParsedQuickPrescription => {
  const raw = (input || '').trim();
  if (!raw) {
    return { valid: false, mode: 'STRENGTH', patch: {}, humanPreview: '', tokens: [] };
  }

  const patch: Partial<ProgramExercise> = {};
  const tokens: string[] = [];
  let mode: PrescriptionMode = 'STRENGTH';

  // 1. Repos
  const restParsed = parseRestToken(raw);
  if (restParsed) {
    patch.rest = restParsed.rest;
    patch.restSec = restParsed.restSec;
    tokens.push(`Récup ${restParsed.rest}`);
  }

  // 2. Tempo (ex: tempo 3-1-1-0 ou 3-1-1-0)
  const tempoMatch = raw.match(/(?:tempo\s*)?(\d-\d-\d-\d)/i);
  if (tempoMatch) {
    patch.tempo = tempoMatch[1];
    tokens.push(`Tempo ${tempoMatch[1]}`);
  }

  // 3. RPE / RIR
  const rpeMatch = raw.match(/RPE\s*(\d+(?:[.,]\d+)?)/i);
  if (rpeMatch) {
    patch.rpe = Math.min(10, Math.max(1, parseFloat(rpeMatch[1].replace(',', '.'))));
    tokens.push(`RPE ${patch.rpe}`);
  }
  const rirMatch = raw.match(/RIR\s*(\d)/i);
  if (rirMatch) {
    patch.rir = Math.min(5, Math.max(0, parseInt(rirMatch[1], 10)));
    tokens.push(`RIR ${patch.rir}`);
  }

  // 4. Pourcentage VMA
  const vmaMatch = raw.match(/@?\s*(\d{2,3})\s*%\s*VMA/i);
  if (vmaMatch) {
    mode = 'RUNNING';
    patch.percentVMA = parseInt(vmaMatch[1], 10);
    tokens.push(`${patch.percentVMA}% VMA`);
  }

  // 5. Distance & Temps marche chargée (ex: "10km 15kg 1h30" ou "8km sac 12kg")
  const kmMatch = raw.match(/(\d+(?:[.,]\d+)?)\s*km/i);
  const kgMatch = raw.match(/@?\s*(\d+(?:[.,]\d+)?)\s*kg/i);
  const hourMinMatch = raw.match(/(\d+)\s*h\s*(\d{1,2})?/i);

  if (kmMatch && kgMatch && !vmaMatch) {
    mode = 'LOADED_MARCH';
    patch.mode = 'LOADED_MARCH';
    patch.distanceMeters = Math.round(parseFloat(kmMatch[1].replace(',', '.')) * 1000);
    patch.carriedLoadKg = parseFloat(kgMatch[1].replace(',', '.'));
    if (hourMinMatch) {
      patch.targetTimeSec = parseInt(hourMinMatch[1], 10) * 3600 + (hourMinMatch[2] ? parseInt(hourMinMatch[2], 10) * 60 : 0);
    }
    const previewParts = [
      `Marche chargée ${(patch.distanceMeters / 1000).toFixed(1).replace('.0', '')} km`,
      `charge ${patch.carriedLoadKg} kg`,
      patch.targetTimeSec ? `objectif ${formatDurationSec(patch.targetTimeSec)}` : ''
    ].filter(Boolean);
    return {
      valid: true,
      mode,
      patch,
      humanPreview: previewParts.join(' • '),
      tokens: previewParts
    };
  }

  // 6. Fractionné distance (ex: "8x400m", "6x1000m")
  const distIntervalMatch = raw.match(/(\d+)\s*[x×]\s*(\d+)\s*(km|m)\b/i);
  if (distIntervalMatch) {
    mode = 'RUNNING';
    patch.sets = parseInt(distIntervalMatch[1], 10);
    const val = parseFloat(distIntervalMatch[2]);
    patch.distanceMeters = distIntervalMatch[3].toLowerCase() === 'km' ? Math.round(val * 1000) : Math.round(val);
    patch.runningSubType = 'INTERVALS';
    tokens.unshift(`${patch.sets} × ${patch.distanceMeters >= 1000 ? `${patch.distanceMeters / 1000} km` : `${patch.distanceMeters} m`}`);
  } else if (kmMatch) {
    mode = 'RUNNING';
    patch.sets = 1;
    patch.distanceMeters = Math.round(parseFloat(kmMatch[1].replace(',', '.')) * 1000);
    patch.runningSubType = 'CONTINUOUS';
    tokens.unshift(`${(patch.distanceMeters / 1000).toFixed(1).replace('.0', '')} km`);
  }

  // 7. Blocs durée (ex: "3x10'", "3x45s", "20'", "3x1'30")
  const durIntervalMinMatch = raw.match(/(\d+)\s*[x×]\s*(\d+)\s*(?:'|’|min\b)/i);
  const durIntervalSecMatch = raw.match(/(\d+)\s*[x×]\s*(\d+)\s*(?:sec\b|s\b|")/i);
  const singleDurMinMatch = !durIntervalMinMatch && !distIntervalMatch ? raw.match(/(?:^|\s)(\d+)\s*(?:'|’|min\b)/i) : null;

  if (durIntervalMinMatch) {
    patch.sets = parseInt(durIntervalMinMatch[1], 10);
    patch.durationSeconds = parseInt(durIntervalMinMatch[2], 10) * 60;
    if (vmaMatch || mode === 'RUNNING') {
      mode = 'RUNNING';
      patch.runningSubType = patch.sets > 1 ? 'INTERVALS' : 'CONTINUOUS';
    } else {
      mode = 'MOBILITY';
      patch.holdSec = patch.durationSeconds;
    }
    tokens.unshift(`${patch.sets} × ${durIntervalMinMatch[2]} min`);
  } else if (durIntervalSecMatch) {
    patch.sets = parseInt(durIntervalSecMatch[1], 10);
    const secs = parseInt(durIntervalSecMatch[2], 10);
    if (vmaMatch) {
      mode = 'RUNNING';
      patch.durationSeconds = secs;
      patch.runningSubType = 'INTERVALS';
    } else {
      mode = 'MOBILITY';
      patch.holdSec = secs;
      patch.durationSeconds = secs;
    }
    tokens.unshift(`${patch.sets} × ${secs} s`);
  } else if (singleDurMinMatch && vmaMatch) {
    mode = 'RUNNING';
    patch.sets = 1;
    patch.durationSeconds = parseInt(singleDurMinMatch[1], 10) * 60;
    patch.runningSubType = 'CONTINUOUS';
    tokens.unshift(`${singleDurMinMatch[1]} min`);
  }

  // 8. Séries × Répétitions (ex: "4x8", "4x8-10", "3xMAX")
  const setsRepsMatch = !distIntervalMatch && !durIntervalMinMatch && !durIntervalSecMatch
    ? raw.match(/(\d+)\s*[x×]\s*(max|\d+(?:\s*-\s*\d+)?)/i)
    : null;

  if (setsRepsMatch) {
    patch.sets = parseInt(setsRepsMatch[1], 10);
    const repRaw = setsRepsMatch[2].toUpperCase().replace(/\s+/g, '');
    patch.reps = repRaw;
    if (repRaw === 'MAX') {
      mode = 'BODYWEIGHT';
      patch.toTechnicalFailure = true;
      tokens.unshift(`${patch.sets} séries × MAX reps`);
    } else {
      tokens.unshift(`${patch.sets} séries × ${repRaw} reps`);
    }
  }

  // 9. % 1RM ou Charge kg (hors VMA)
  if (!vmaMatch) {
    const pct1rmMatch = raw.match(/@?\s*(\d{2,3})\s*%(?:\s*1RM)?/i);
    if (pct1rmMatch) {
      mode = 'STRENGTH';
      patch.percent1RM = parseInt(pct1rmMatch[1], 10);
      patch.load = `[${patch.percent1RM}% 1RM]`;
      tokens.push(`${patch.percent1RM}% 1RM`);
    } else if (kgMatch) {
      mode = 'STRENGTH';
      patch.loadKg = parseFloat(kgMatch[1].replace(',', '.'));
      patch.load = `${patch.loadKg} kg`;
      tokens.push(`${patch.loadKg} kg`);
    }
  }

  if (raw.toLowerCase().includes('côté') || raw.toLowerCase().includes('cote') || raw.toLowerCase().includes('/g/d')) {
    patch.bilateral = true;
    tokens.push('gauche / droite');
  }

  patch.mode = mode;

  const valid = Boolean(
    patch.sets ||
      patch.reps ||
      patch.percent1RM ||
      patch.percentVMA ||
      patch.loadKg ||
      patch.distanceMeters ||
      patch.durationSeconds ||
      patch.holdSec
  );

  // Construction d'une phrase lisible claire pour l'aperçu avant validation
  let humanPreview = '';
  if (valid) {
    if (mode === 'RUNNING') {
      const vol = patch.distanceMeters
        ? `${patch.sets && patch.sets > 1 ? `${patch.sets} fois ` : ''}${patch.distanceMeters >= 1000 ? `${(patch.distanceMeters / 1000).toFixed(1).replace('.0', '')} km` : `${patch.distanceMeters} m`}`
        : patch.durationSeconds
        ? `${patch.sets && patch.sets > 1 ? `${patch.sets} fois ` : ''}${formatDurationSec(patch.durationSeconds)}`
        : '';
      const inten = patch.percentVMA ? ` à ${patch.percentVMA} % de la VMA` : '';
      const rec = patch.rest ? `, récup ${patch.rest}` : '';
      humanPreview = `${vol}${inten}${rec}`.trim();
    } else if (mode === 'STRENGTH') {
      const vol = `${patch.sets || 3} séries de ${patch.reps || '8'}`;
      const inten = patch.percent1RM
        ? ` à ${patch.percent1RM} % du 1RM`
        : patch.loadKg
        ? ` à ${patch.loadKg} kg`
        : patch.rpe
        ? ` à RPE ${patch.rpe}`
        : '';
      const extra = [patch.tempo ? `tempo ${patch.tempo}` : '', patch.rest ? `repos ${patch.rest}` : '']
        .filter(Boolean)
        .join(', ');
      humanPreview = `${vol}${inten}${extra ? ` (${extra})` : ''}`;
    } else if (mode === 'MOBILITY') {
      humanPreview = `${patch.sets || 3} séries de ${formatDurationSec(patch.holdSec || patch.durationSeconds)}${patch.bilateral ? ' par côté' : ''}${patch.rest ? `, repos ${patch.rest}` : ''}`;
    } else {
      humanPreview = tokens.join(' • ');
    }
  }

  return { valid, mode, patch, humanPreview, tokens };
};
