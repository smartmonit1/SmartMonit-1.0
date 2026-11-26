import React, { useState } from 'react';
import { ProgramCycle, ProgramSessionBuilder } from '../../types';
import { parseLocalImportedProgram } from '../../utils/programExport';
import { parseTrainingFile } from '../../services/geminiService';
import { ensureSessionBlocks } from '../../utils/calculationEngine';

interface ImportReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyImport: (data: { title: string; goal: string; structure: ProgramCycle[]; isAIDraft?: boolean }) => void;
}

const ImportReviewModal: React.FC<ImportReviewModalProps> = ({
  isOpen,
  onClose,
  onApplyImport
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [draft, setDraft] = useState<{
    title: string;
    goal: string;
    structure: ProgramCycle[];
    sourceFormat: string;
    isAIDraft?: boolean;
  } | null>(null);

  if (!isOpen) return null;

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setLoading(true);
    try {
      const lower = file.name.toLowerCase();
      if (lower.endsWith('.json') || lower.endsWith('.csv') || lower.endsWith('.txt')) {
        const text = await file.text();
        const parsed = parseLocalImportedProgram(file.name, text);
        setDraft({ ...parsed, isAIDraft: false });
      } else {
        // PDF / Word / Image : tente le parseur du routeur IA (avec repli gracieux si IA désactivée)
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
          reader.onerror = () => reject(new Error('Lecture fichier impossible'));
          reader.readAsDataURL(file);
        });
        const aiRes = await parseTrainingFile(base64, file.type || 'application/pdf');
        if (aiRes && Array.isArray(aiRes.sessions) && aiRes.sessions.length > 0) {
          const mappedSessions: ProgramSessionBuilder[] = aiRes.sessions.map((s: any, idx: number) => ({
            id: `s_imp_${Date.now()}_${idx}`,
            title: s.title || `Séance ${idx + 1}`,
            type: s.type || 'MUSCU',
            blocks: [
              { id: `b_wu_${idx}`, type: 'WARMUP', title: 'Échauffement', rounds: 1, exercises: [] },
              {
                id: `b_main_${idx}`,
                type: 'MAIN',
                title: 'Corps de séance',
                rounds: 1,
                exercises: (s.content?.mainBlock || []).map((ex: any, eIdx: number) => ({
                  id: `ex_imp_${idx}_${eIdx}`,
                  libraryId: 'imported',
                  name: ex.exercise || 'Exercice',
                  sets: 3,
                  reps: ex.prescription || '10',
                  rest: ex.rest || '1:30'
                }))
              },
              { id: `b_cd_${idx}`, type: 'COOLDOWN', title: 'Retour au calme', rounds: 1, exercises: [] }
            ],
            exercises: []
          }));
          setDraft({
            title: aiRes.title || file.name.replace(/\.[^.]+$/, ''),
            goal: aiRes.goal || 'Import document (Brouillon IA à vérifier)',
            sourceFormat: 'PDF / DOC (IA)',
            isAIDraft: true,
            structure: [
              {
                id: `c_imp_${Date.now()}`,
                title: 'Phase 1 — Import document',
                objective: aiRes.goal || 'À valider par le moniteur',
                phaseType: 'PPG',
                weeks: [
                  {
                    id: `w_imp_${Date.now()}`,
                    number: 1,
                    objective: 'Semaine 1',
                    sessions: mappedSessions
                  }
                ]
              }
            ]
          });
        } else {
          setError(
            'Extraction automatique indisponible sans IA active pour ce format binaire. Exportez votre document en CSV/TXT ou collez le texte ci-dessous pour un import 100% local.'
          );
        }
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur lors de la lecture du fichier.');
    } finally {
      setLoading(false);
    }
  };

  const handleParsePasted = () => {
    if (!pasteText.trim()) return;
    setError(null);
    const parsed = parseLocalImportedProgram('Seance_Collee.txt', pasteText);
    setDraft({ ...parsed, isAIDraft: false });
  };

  const updateExerciseName = (sIdx: number, bIdx: number, eIdx: number, newName: string) => {
    if (!draft) return;
    const copy = JSON.parse(JSON.stringify(draft));
    copy.structure[0].weeks[0].sessions[sIdx].blocks[bIdx].exercises[eIdx].name = newName;
    setDraft(copy);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-military-950/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Import et vérification de programme"
    >
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-military-200">
        <div className="bg-military-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-action-400">
              Import structuré + Écran de vérification Human-in-the-Loop
            </span>
            <h3 className="text-lg font-black">Importer un programme (JSON, Excel CSV, TXT, PDF/Word)</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-military-800 hover:bg-military-700 flex items-center justify-center"
            aria-label="Fermer"
          >
            <span className="material-icons text-lg">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {!draft ? (
            <>
              <label className="block p-6 rounded-2xl border-2 border-dashed border-military-300 bg-gray-50 text-center cursor-pointer hover:border-action-500">
                <span className="material-icons text-3xl text-action-500">upload_file</span>
                <div className="font-black text-sm text-military-900 mt-1">
                  Sélectionner un fichier (.json, .csv, .txt, .pdf, .docx)
                </div>
                <div className="text-[11px] text-gray-500 mt-1">
                  JSON, CSV Excel et TXT fonctionnent 100% hors-ligne sans IA.
                </div>
                <input
                  type="file"
                  accept=".json,.csv,.txt,.pdf,.doc,.docx"
                  onChange={handleFile}
                  className="hidden"
                />
              </label>

              <div className="space-y-2">
                <div className="font-black uppercase text-[11px] text-military-800">
                  Ou coller une séance existante (syntaxe naturelle reconnue automatiquement)
                </div>
                <textarea
                  rows={5}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder={`Exemples :\nSquat Barre : 4x8 @75% r2'\nDéveloppé Couché : 4x8 @75% r2'\nFractionné VMA : 3x10' @80% VMA r2'`}
                  className="w-full p-3 rounded-xl border border-gray-300 font-mono text-xs outline-none focus:border-action-500"
                />
                <button
                  type="button"
                  onClick={handleParsePasted}
                  disabled={!pasteText.trim()}
                  className="px-4 py-2 rounded-xl bg-military-900 text-action-400 font-black text-xs uppercase disabled:opacity-40"
                >
                  Analyser le texte collé
                </button>
              </div>

              {loading && (
                <div className="p-3 rounded-xl bg-blue-50 text-blue-800 font-bold">
                  Analyse du document en cours...
                </div>
              )}
              {error && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 font-bold">
                  {error}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div>
                  <span className="font-black text-emerald-900">
                    Extraction réussie ({draft.sourceFormat}) — Vérifiez et corrigez avant import
                  </span>
                  {draft.isAIDraft && (
                    <span className="ml-2 px-2 py-0.5 rounded bg-amber-200 text-amber-950 text-[10px] font-black uppercase">
                      BROUILLON IA — VALIDATION MONITEUR REQUISE
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="text-xs font-bold text-gray-600 underline"
                >
                  Choisir un autre fichier
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="font-bold">
                  Titre du programme
                  <input
                    type="text"
                    value={draft.title}
                    onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                    className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-black"
                  />
                </label>
                <label className="font-bold">
                  Objectif
                  <input
                    type="text"
                    value={draft.goal}
                    onChange={(e) => setDraft({ ...draft, goal: e.target.value })}
                    className="mt-1 w-full p-2 rounded-xl border border-gray-300 font-bold"
                  />
                </label>
              </div>

              {draft.structure[0]?.weeks[0]?.sessions.map((sess, sIdx) => (
                <div key={sess.id} className="p-3 rounded-2xl border border-gray-200 space-y-2">
                  <div className="font-black text-military-900">{sess.title}</div>
                  {ensureSessionBlocks(sess).map((blk, bIdx) =>
                    blk.exercises.length > 0 ? (
                      <div key={blk.id} className="space-y-1.5">
                        <div className="text-[10px] font-black uppercase text-gray-500">
                          {blk.title}
                        </div>
                        {blk.exercises.map((ex, eIdx) => (
                          <div key={ex.id} className="flex flex-wrap items-center gap-2">
                            <input
                              type="text"
                              value={ex.name}
                              onChange={(e) => updateExerciseName(sIdx, bIdx, eIdx, e.target.value)}
                              className="flex-1 min-w-[160px] p-1.5 rounded-lg border border-gray-300 font-bold"
                            />
                            <span className="px-2 py-1 rounded-lg bg-gray-100 font-mono text-[11px]">
                              {ex.sets}×{ex.reps || ex.distanceMeters || ex.durationSeconds}{' '}
                              {ex.percent1RM
                                ? `@${ex.percent1RM}% 1RM`
                                : ex.percentVMA
                                ? `@${ex.percentVMA}% VMA`
                                : ''}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-gray-300 text-xs font-bold"
          >
            Annuler
          </button>
          {draft && (
            <button
              type="button"
              onClick={() => {
                onApplyImport({
                  title: draft.title,
                  goal: draft.goal,
                  structure: draft.structure,
                  isAIDraft: draft.isAIDraft
                });
                onClose();
              }}
              className="px-5 py-2.5 rounded-xl bg-action-500 text-military-950 font-black text-xs uppercase shadow"
            >
              Importer dans l'éditeur
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportReviewModal;
