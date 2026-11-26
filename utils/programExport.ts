import {
  ExerciseLibraryItem,
  Program,
  ProgramCycle,
  ProgramExercise,
  ProgramSessionBuilder,
  ProgramStatus,
  UserProfile
} from '../types';
import { ensureSessionBlocks, getFormulaConfig, individualizeProgramForUser } from './calculationEngine';
import { parseQuickPrescription } from './quickEntryParser';

const escapeHtml = (str: string): string =>
  (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const downloadBlob = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const safeFilename = (title: string) =>
  (title || 'programme_epms').replace(/[^a-zA-Z0-9À-ÿ_-]+/g, '_').slice(0, 60);

/**
 * Exporte le programme en JSON structuré (sauvegarde / ré-import sans perte).
 */
export const exportProgramJSON = (program: Partial<Program>) => {
  const payload = {
    schema: 'SMART_MONIT_PROGRAM_V1',
    exportedAt: new Date().toISOString(),
    program
  };
  downloadBlob(
    JSON.stringify(payload, null, 2),
    `${safeFilename(program.title || 'programme')}.json`,
    'application/json;charset=utf-8'
  );
};

/**
 * Exporte le programme au format CSV compatible Microsoft Excel (UTF-8 BOM, séparateur `;`).
 */
export const exportProgramExcelCSV = (program: Partial<Program>) => {
  const rows: string[][] = [
    [
      'Cycle',
      'Semaine',
      'Séance',
      'Type Séance',
      'Bloc',
      'Tours',
      'Exercice',
      'Séries',
      'Reps / Volume',
      'Intensité (%1RM / %VMA / Charge)',
      'Repos',
      'Tempo',
      'Notes'
    ]
  ];

  (program.structure || []).forEach((cycle) => {
    cycle.weeks.forEach((week) => {
      week.sessions.forEach((sess) => {
        ensureSessionBlocks(sess).forEach((blk) => {
          blk.exercises.forEach((ex) => {
            const vol = ex.distanceMeters
              ? `${ex.distanceMeters} m`
              : ex.durationSeconds
              ? `${ex.durationSeconds} s`
              : ex.holdSec
              ? `${ex.holdSec} s`
              : ex.reps || '';
            const inten = ex.percent1RM
              ? `${ex.percent1RM}% 1RM`
              : ex.percentVMA
              ? `${ex.percentVMA}% VMA`
              : ex.loadKg
              ? `${ex.loadKg} kg`
              : ex.carriedLoadKg
              ? `Sac ${ex.carriedLoadKg} kg`
              : ex.load || '';
            rows.push([
              cycle.title,
              `S${week.number}${week.isDeload ? ' (Décharge)' : ''}`,
              sess.title,
              String(sess.type || ''),
              blk.title,
              String(blk.rounds || 1),
              ex.name,
              String(ex.sets ?? ''),
              vol,
              inten,
              ex.rest || '',
              ex.tempo || '',
              ex.note || ''
            ]);
          });
        });
      });
    });
  });

  const csv =
    '\uFEFF' +
    rows
      .map((r) => r.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

  downloadBlob(
    csv,
    `${safeFilename(program.title || 'programme')}_excel.csv`,
    'text/csv;charset=utf-8'
  );
};

/**
 * Génère une fiche PDF imprimable propre (print-ready) — soit en version Directeur,
 * soit individualisée pour un militaire précis.
 */
export const exportProgramPrintPDF = (
  program: Partial<Program>,
  options?: { soldier?: UserProfile; exerciseLibrary?: ExerciseLibraryItem[] }
) => {
  const structure = program.structure || [];
  const latestDaily =
    options?.soldier?.dailyForms && options.soldier.dailyForms.length > 0
      ? options.soldier.dailyForms[options.soldier.dailyForms.length - 1]
      : undefined;
  const fullProgramForCalc: Program = {
    id: program.id || 'export_prog',
    userId: program.userId || '',
    title: program.title || 'Programme EPMS',
    goal: program.goal || '',
    status: program.status || ProgramStatus.VALIDATED,
    startDate: program.startDate || new Date().toISOString().split('T')[0],
    durationWeeks: program.durationWeeks || Math.max(1, structure.reduce((a, c) => a + c.weeks.length, 0)),
    sessionsPerWeek: program.sessionsPerWeek || 3,
    sessions: program.sessions || [],
    structure
  };
  const individualized =
    options?.soldier
      ? individualizeProgramForUser(
          fullProgramForCalc,
          options.soldier,
          latestDaily,
          getFormulaConfig()
        )
      : null;

  let bodyHtml = '';

  if (individualized && options?.soldier) {
    bodyHtml += `<div class="meta-box"><strong>Version individualisée :</strong> ${escapeHtml(
      options.soldier.name
    )} • VMA : ${individualized.vmaKmH ? `${individualized.vmaKmH} km/h` : 'ABSENTE'}</div>`;
    if (individualized.missingReferences.length > 0) {
      bodyHtml += `<div class="warn-box"><strong>Références manquantes :</strong> ${escapeHtml(
        (individualized.warnings.length > 0
          ? individualized.warnings
          : individualized.missingReferences
        ).join(' ; ')
      )}</div>`;
    }
    individualized.sessions.forEach((sess) => {
      bodyHtml += `<div class="session"><h3>S${sess.weekNumber} — ${escapeHtml(sess.title)}</h3>`;
      sess.blocks.forEach((blk) => {
        bodyHtml += `<div class="block-title">${escapeHtml(blk.block.title)}${
          blk.block.rounds && blk.block.rounds > 1 ? ` (${blk.block.rounds} tours)` : ''
        }</div><table><thead><tr><th>Exercice</th><th>Prescription calculée</th><th>Remarque</th></tr></thead><tbody>`;
        blk.exercises.forEach((ex) => {
          bodyHtml += `<tr><td><strong>${escapeHtml(ex.exercise.name)}</strong>${
            ex.substitutedFrom ? ` <em>(remplace ${escapeHtml(ex.substitutedFrom)})</em>` : ''
          }</td><td>${escapeHtml(ex.displayPrescription)}</td><td>${escapeHtml(
            ex.warning || ''
          )}</td></tr>`;
        });
        bodyHtml += `</tbody></table>`;
      });
      bodyHtml += `</div>`;
    });
  } else {
    structure.forEach((cycle) => {
      bodyHtml += `<h2>${escapeHtml(cycle.title)} — ${escapeHtml(cycle.objective || '')}</h2>`;
      cycle.weeks.forEach((wk) => {
        bodyHtml += `<div class="week-header">Semaine ${wk.number} ${
          wk.isDeload ? '• DÉCHARGE PIA 7.1.1' : ''
        } — ${escapeHtml(wk.objective || '')}</div>`;
        wk.sessions.forEach((sess) => {
          bodyHtml += `<div class="session"><h3>${escapeHtml(sess.title)} (${escapeHtml(
            String(sess.type)
          )})</h3>`;
          if (sess.safetyCues) {
            bodyHtml += `<p class="safety">Consignes sécurité : ${escapeHtml(sess.safetyCues)}</p>`;
          }
          ensureSessionBlocks(sess).forEach((blk) => {
            bodyHtml += `<div class="block-title">${escapeHtml(blk.title)}${
              blk.rounds && blk.rounds > 1 ? ` (${blk.rounds} tours)` : ''
            }</div><table><thead><tr><th>Exercice</th><th>Séries / Volume</th><th>Intensité</th><th>Repos</th><th>Notes</th></tr></thead><tbody>`;
            blk.exercises.forEach((ex) => {
              const vol = ex.distanceMeters
                ? `${ex.sets || 1} × ${ex.distanceMeters} m`
                : ex.durationSeconds
                ? `${ex.sets || 1} × ${Math.round(ex.durationSeconds / 60)} min`
                : ex.holdSec
                ? `${ex.sets || 3} × ${ex.holdSec} s`
                : `${ex.sets || 3} × ${ex.reps || ''}`;
              const inten = ex.percent1RM
                ? `${ex.percent1RM}% 1RM`
                : ex.percentVMA
                ? `${ex.percentVMA}% VMA`
                : ex.loadKg
                ? `${ex.loadKg} kg`
                : ex.carriedLoadKg
                ? `Sac ${ex.carriedLoadKg} kg`
                : ex.load || '—';
              bodyHtml += `<tr><td><strong>${escapeHtml(ex.name)}</strong></td><td>${escapeHtml(
                vol
              )}</td><td>${escapeHtml(inten)}</td><td>${escapeHtml(
                ex.rest || '—'
              )}</td><td>${escapeHtml(ex.note || '')}</td></tr>`;
            });
            bodyHtml += `</tbody></table>`;
          });
          bodyHtml += `</div>`;
        });
      });
    });
  }

  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(
    program.title || 'Programme EPMS'
  )}</title><style>
    body{font-family:Arial,Helvetica,sans-serif;color:#111827;margin:24px;font-size:12px;}
    .header{border-bottom:3px solid #16211c;padding-bottom:10px;margin-bottom:16px;display:flex;justify-content:space-between;align-items:flex-end;}
    .brand{font-size:10px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:#475569;}
    h1{margin:4px 0 0;font-size:20px;color:#16211c;}
    h2{font-size:15px;margin:18px 0 8px;color:#16211c;border-left:4px solid #f59e0b;padding-left:8px;}
    h3{font-size:13px;margin:0 0 6px;color:#16211c;}
    .week-header{background:#f1f5f9;padding:6px 10px;font-weight:700;margin-top:10px;border-radius:6px;}
    .session{border:1px solid #cbd5e1;border-radius:8px;padding:10px;margin:8px 0;page-break-inside:avoid;}
    .block-title{font-weight:700;text-transform:uppercase;font-size:10px;color:#334155;margin:8px 0 4px;}
    .meta-box{background:#eff6ff;border:1px solid #bfdbfe;padding:8px;border-radius:6px;margin-bottom:10px;}
    .warn-box{background:#fef3c7;border:1px solid #fcd34d;padding:8px;border-radius:6px;margin-bottom:10px;}
    .safety{font-size:11px;color:#9a3412;margin:2px 0 6px;}
    table{width:100%;border-collapse:collapse;margin-bottom:6px;}
    th,td{border:1px solid #e2e8f0;padding:5px 7px;text-align:left;}
    th{background:#f8fafc;font-size:10px;text-transform:uppercase;}
    @media print { .no-print{display:none;} body{margin:12mm;} }
  </style></head><body>
    <div class="header">
      <div>
        <div class="brand">Armée de l'Air et de l'Espace • SMART MONIT 1.0 • Doctrine PIA 7.1.1</div>
        <h1>${escapeHtml(program.title || 'Programme EPMS')}</h1>
        <div>Objectif : ${escapeHtml(program.goal || '—')} • Type : ${escapeHtml(
    program.type || 'Hybride'
  )} • Auteur : ${escapeHtml(program.createdByName || program.createdByBase || 'EPMS')} • Version ${
    program.version || 1
  }</div>
      </div>
      <button class="no-print" onclick="window.print()" style="padding:8px 14px;background:#16211c;color:#facc15;border:none;border-radius:8px;font-weight:800;cursor:pointer;">Imprimer / PDF</button>
    </div>
    ${bodyHtml}
  </body></html>`;

  const win = window.open('', '_blank', 'width=960,height=800');
  if (win) {
    win.document.open();
    win.document.write(html);
    win.document.close();
    setTimeout(() => {
      try {
        win.print();
      } catch {
        // Fallback utilisateur via bouton imprimer
      }
    }, 300);
  }
};

/**
 * Parseur déterministe local (sans IA) pour importer un programme depuis JSON, CSV Excel ou texte structuré.
 */
export const parseLocalImportedProgram = (
  filename: string,
  textContent: string
): { title: string; goal: string; structure: ProgramCycle[]; sourceFormat: string } => {
  const cleanName = filename.replace(/\.[^.]+$/, '');

  // 1. JSON SMART MONIT
  if (filename.toLowerCase().endsWith('.json')) {
    const parsed = JSON.parse(textContent);
    const prog = parsed.program || parsed;
    if (Array.isArray(prog.structure) && prog.structure.length > 0) {
      return {
        title: prog.title || cleanName,
        goal: prog.goal || 'Programme importé (JSON)',
        structure: prog.structure,
        sourceFormat: 'JSON'
      };
    }
  }

  // 2. CSV (séparateur ; ou ,)
  if (filename.toLowerCase().endsWith('.csv')) {
    const lines = textContent
      .replace(/^\uFEFF/, '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const sep = lines[0]?.includes(';') ? ';' : ',';
    const dataLines = lines.slice(1);
    const sessionsMap = new Map<string, ProgramSessionBuilder>();

    dataLines.forEach((line, idx) => {
      const cols = line.split(sep).map((c) => c.replace(/^"|"$/g, '').trim());
      const sessTitle = cols[2] || cols[0] || 'Séance Importée';
      const exoName = cols[6] || cols[1] || `Exercice ${idx + 1}`;
      const quickRaw = `${cols[7] || '3'}x${cols[8] || '10'} ${cols[9] || ''} ${cols[10] ? `r${cols[10]}` : ''}`;
      const parsed = parseQuickPrescription(quickRaw);

      if (!sessionsMap.has(sessTitle)) {
        sessionsMap.set(sessTitle, {
          id: `s_csv_${Date.now()}_${sessionsMap.size}`,
          title: sessTitle,
          type: 'MUSCU',
          blocks: [
            { id: `b_wu_${idx}`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
            { id: `b_main_${idx}`, type: 'MAIN', title: 'Corps de séance', rounds: 1, exercises: [] },
            { id: `b_cd_${idx}`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
          ],
          exercises: []
        });
      }
      const sess = sessionsMap.get(sessTitle)!;
      const ex: ProgramExercise = {
        id: `ex_csv_${Date.now()}_${idx}`,
        libraryId: 'imported',
        name: exoName,
        sets: parsed.patch.sets || 3,
        reps: parsed.patch.reps || cols[8] || '10',
        ...parsed.patch,
        note: cols[12] || ''
      };
      sess.blocks![1].exercises.push(ex);
    });

    const sessions = Array.from(sessionsMap.values());
    return {
      title: cleanName,
      goal: 'Programme importé (CSV / Excel)',
      sourceFormat: 'CSV',
      structure: [
        {
          id: `c_csv_${Date.now()}`,
          title: 'Phase 1 — Import CSV',
          objective: 'Import tableur',
          phaseType: 'PPG',
          weeks: [
            {
              id: `w_csv_${Date.now()}`,
              number: 1,
              objective: 'Semaine 1',
              sessions: sessions.length > 0 ? sessions : []
            }
          ]
        }
      ]
    };
  }

  // 3. Texte brut ligne par ligne (ex: "Squat Barre : 4x8 @75% r2'")
  const lines = textContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  const exercises: ProgramExercise[] = lines.map((line, idx) => {
    const [namePart, ...restParts] = line.split(/[:—–-](?=\s*\d)/);
    const parsed = parseQuickPrescription(restParts.join(' ') || line);
    return {
      id: `ex_txt_${Date.now()}_${idx}`,
      libraryId: 'imported',
      name: (namePart || line).trim().slice(0, 60),
      sets: parsed.patch.sets || 3,
      reps: parsed.patch.reps || '10',
      ...parsed.patch
    };
  });

  return {
    title: cleanName,
    goal: 'Programme importé (Texte structuré)',
    sourceFormat: 'TXT',
    structure: [
      {
        id: `c_txt_${Date.now()}`,
        title: 'Phase 1 — Import Texte',
        objective: 'Import structuré',
        phaseType: 'PPG',
        weeks: [
          {
            id: `w_txt_${Date.now()}`,
            number: 1,
            objective: 'Semaine 1',
            sessions: [
              {
                id: `s_txt_${Date.now()}`,
                title: cleanName,
                type: 'MUSCU',
                blocks: [
                  { id: `b_wu_txt`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
                  { id: `b_main_txt`, type: 'MAIN', title: 'Corps de séance', rounds: 1, exercises },
                  { id: `b_cd_txt`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
                ],
                exercises
              }
            ]
          }
        ]
      }
    ]
  };
};
