import React, { useMemo, useState } from 'react';
import { Equipment, ExerciseCategory, ExerciseLibraryItem, JobType } from '../../types';
import { db } from '../../services/mockDatabase';
import ExerciseIllustration from '../ExerciseIllustration';

interface ExercisePickerDrawerProps {
  exercises: ExerciseLibraryItem[];
  infraEquipment?: Equipment[];
  onSelect: (item: ExerciseLibraryItem) => void;
  onExerciseCreated?: (item: ExerciseLibraryItem) => void;
  dark?: boolean;
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

/**
 * Recherche tolérante aux fautes de frappe (sous-chaîne normalisée + distance d'édition légère par mot).
 */
const fuzzyMatches = (text: string, query: string): boolean => {
  const t = norm(text);
  const q = norm(query).trim();
  if (!q) return true;
  if (t.includes(q)) return true;

  const qWords = q.split(/\s+/).filter(Boolean);
  const tWords = t.split(/[\s\-/(),]+/).filter(Boolean);

  return qWords.every((qw) => {
    if (t.includes(qw)) return true;
    if (qw.length <= 2) return false;
    return tWords.some((tw) => {
      if (Math.abs(tw.length - qw.length) > 2) return false;
      let diffs = 0;
      let i = 0;
      let j = 0;
      while (i < qw.length && j < tw.length) {
        if (qw[i] === tw[j]) {
          i++;
          j++;
        } else {
          diffs++;
          if (diffs > 2) return false;
          if (qw.length > tw.length) i++;
          else if (tw.length > qw.length) j++;
          else {
            i++;
            j++;
          }
        }
      }
      diffs += qw.length - i + (tw.length - j);
      return diffs <= 2;
    });
  });
};

const ExercisePickerDrawer: React.FC<ExercisePickerDrawerProps> = ({
  exercises,
  infraEquipment = [],
  onSelect,
  onExerciseCreated,
  dark = false
}) => {
  const [tab, setTab] = useState<'all' | 'favorites' | 'recent' | 'create'>('all');
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [muscleFilter, setMuscleFilter] = useState<string>('all');
  const [equipFilter, setEquipFilter] = useState<string>('all');
  const [jobFilter, setJobFilter] = useState<string>('all');
  const [favorites, setFavorites] = useState<string[]>(() => db.getFavoriteExerciseIds());
  const recentIds = useMemo(() => db.getRecentExerciseIds(), [tab]);

  // Création rapide exercice personnalisé (< 30s)
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState<ExerciseCategory>('Musculation');
  const [customMuscle, setCustomMuscle] = useState('Full Body');
  const [customEquip, setCustomEquip] = useState('PDC');
  const [customDiff, setCustomDiff] = useState<ExerciseLibraryItem['difficulty']>('Intermédiaire');

  const operationalEquipTokens = useMemo(
    () => infraEquipment.filter((e) => e.status === 'Operational').map((e) => `${e.name} ${e.category}`.toLowerCase()),
    [infraEquipment]
  );

  const isEquipmentAvailable = (eq: string): boolean => {
    if (operationalEquipTokens.length === 0) return true;
    const low = eq.toLowerCase();
    if (['pdc', 'tapis', 'piste / extérieur', 'piste athlétisme', 'extérieur / parcours', 'terrain / gymnase'].includes(low)) return true;
    return operationalEquipTokens.some(
      (tok) =>
        tok.includes(low) ||
        (low.includes('barre') && (tok.includes('rack') || tok.includes('banc') || tok.includes('barre'))) ||
        (low.includes('halt') && tok.includes('musculation')) ||
        (low.includes('poulie') && tok.includes('musculation')) ||
        (low.includes('vélo') && (tok.includes('vélo') || tok.includes('bike')))
    );
  };

  const muscles = useMemo(
    () => Array.from(new Set<string>(exercises.map((e) => e.muscleGroup))).sort((a, b) => a.localeCompare(b)),
    [exercises]
  );
  const equips = useMemo(
    () => Array.from(new Set<string>(exercises.map((e) => e.equipment))).sort((a, b) => a.localeCompare(b)),
    [exercises]
  );
  const categories = useMemo(
    () => Array.from(new Set<string>(exercises.map((e) => e.category || 'Musculation'))),
    [exercises]
  );

  const filtered = useMemo(() => {
    let base = exercises;
    if (tab === 'favorites') base = exercises.filter((e) => favorites.includes(e.id));
    if (tab === 'recent') {
      base = recentIds.map((id) => exercises.find((e) => e.id === id)).filter(Boolean) as ExerciseLibraryItem[];
    }
    return base.filter((e) => {
      const text = `${e.name} ${e.muscleGroup} ${e.equipment} ${e.description || ''} ${e.category || ''}`;
      if (!fuzzyMatches(text, search)) return false;
      if (catFilter !== 'all' && (e.category || 'Musculation') !== catFilter) return false;
      if (muscleFilter !== 'all' && e.muscleGroup !== muscleFilter) return false;
      if (equipFilter !== 'all' && e.equipment !== equipFilter) return false;
      if (jobFilter !== 'all' && e.adaptedJobProfiles && !e.adaptedJobProfiles.includes(jobFilter as JobType)) return false;
      return true;
    });
  }, [exercises, tab, favorites, recentIds, search, catFilter, muscleFilter, equipFilter, jobFilter]);

  const handleToggleFav = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(db.toggleFavoriteExercise(id));
  };

  const handleCreateCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customName.trim()) return;
    const item: ExerciseLibraryItem = {
      id: `ex_custom_${Date.now()}`,
      name: customName.trim(),
      category: customCat,
      muscleGroup: customMuscle,
      equipment: customEquip,
      type: customCat === 'Course' || customCat === 'Machine Cardio' ? 'Cardio' : customCat === 'Pilates' ? 'Mobility' : 'Force',
      difficulty: customDiff,
      description: 'Exercice personnalisé créé par le moniteur EPMS.'
    };
    db.addExercise(item);
    onExerciseCreated?.(item);
    db.recordRecentExercise(item.id);
    onSelect(item);
    setCustomName('');
    setTab('all');
  };

  const cardBg = dark ? 'bg-military-900 border-military-700 text-white' : 'bg-white border-gray-200 text-military-900';
  const inputBg = dark ? 'bg-military-800 border-military-700 text-white placeholder-military-400' : 'bg-gray-50 border-gray-200 text-military-900';

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Onglets rapides */}
      <div className="grid grid-cols-4 gap-1 bg-military-950/10 p-1 rounded-xl">
        {[
          { id: 'all', label: `Tous (${exercises.length})` },
          { id: 'favorites', label: `★ (${favorites.length})` },
          { id: 'recent', label: 'Récents' },
          { id: 'create', label: '+ Perso' }
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id as any)}
            className={`py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${
              tab === t.id ? 'bg-military-900 text-action-400 shadow' : dark ? 'text-military-300' : 'text-gray-600'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'create' ? (
        <form onSubmit={handleCreateCustom} className={`p-4 rounded-2xl border space-y-3 ${cardBg}`}>
          <div className="text-xs font-black uppercase text-action-600">Créer un exercice personnalisé (&lt; 30s)</div>
          <input
            required
            type="text"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            placeholder="Nom de l'exercice (ex: Tirage corde franchissement)"
            className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none ${inputBg}`}
          />
          <div className="grid grid-cols-2 gap-2">
            <select value={customCat} onChange={(e) => setCustomCat(e.target.value as ExerciseCategory)} className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}>
              <option value="Musculation">Musculation</option>
              <option value="Renforcement">Renforcement</option>
              <option value="Pilates">Pilates</option>
              <option value="Course">Course</option>
              <option value="Machine Cardio">Machine Cardio</option>
              <option value="Marche / Franchissement">Marche / Franchissement</option>
              <option value="Natation">Natation</option>
              <option value="Sports Collectifs">Sports Collectifs</option>
            </select>
            <select value={customMuscle} onChange={(e) => setCustomMuscle(e.target.value)} className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}>
              {['Pectoraux', 'Dos', 'Épaules', 'Bras', 'Jambes', 'Chaîne Postérieure', 'Fessiers', 'Abdominaux', 'Core / Gainage', 'Cardio', 'Full Body'].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              value={customEquip}
              onChange={(e) => setCustomEquip(e.target.value)}
              placeholder="Matériel (PDC, Barre...)"
              className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}
            />
            <select value={customDiff} onChange={(e) => setCustomDiff(e.target.value as any)} className={`p-2 rounded-xl border text-xs font-bold ${inputBg}`}>
              <option value="Débutant">Débutant</option>
              <option value="Intermédiaire">Intermédiaire</option>
              <option value="Avancé">Avancé</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-action-500 text-military-950 font-black uppercase text-xs rounded-xl shadow hover:bg-action-400">
            Créer & Ajouter à la séance
          </button>
        </form>
      ) : (
        <>
          <div className="relative">
            <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-base">search</span>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Recherche instantanée (tolère les fautes)..."
              className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs font-medium outline-none focus:border-action-500 ${inputBg}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <select aria-label="Filtrer par catégorie" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}>
              <option value="all">Catégorie : Toutes</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select aria-label="Filtrer par muscle" value={muscleFilter} onChange={(e) => setMuscleFilter(e.target.value)} className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}>
              <option value="all">Muscle : Tous</option>
              {muscles.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
            <select aria-label="Filtrer par matériel" value={equipFilter} onChange={(e) => setEquipFilter(e.target.value)} className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}>
              <option value="all">Matériel : Tous</option>
              {equips.map((eq) => <option key={eq} value={eq}>{eq}</option>)}
            </select>
            <select aria-label="Filtrer par profil métier" value={jobFilter} onChange={(e) => setJobFilter(e.target.value)} className={`p-1.5 rounded-lg border text-[11px] font-bold ${inputBg}`}>
              <option value="all">Métier : Tous</option>
              {Object.values(JobType).map((j) => <option key={j} value={j}>{j.split(' ')[0]}</option>)}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-0.5">
            {filtered.map((ex) => {
              const isFav = favorites.includes(ex.id);
              const eqOk = isEquipmentAvailable(ex.equipment);
              return (
                <div
                  key={ex.id}
                  onClick={() => {
                    db.recordRecentExercise(ex.id);
                    onSelect(ex);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      db.recordRecentExercise(ex.id);
                      onSelect(ex);
                    }
                  }}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all hover:border-action-500 ${cardBg}`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ExerciseIllustration exerciseName={ex.name} fallbackType={ex.type} size="xs" dark={dark} />
                    <div className="min-w-0">
                      <div className="font-bold text-xs truncate">{ex.name}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-military-900 text-action-400">
                          {ex.category || 'Muscu'}
                        </span>
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-700">
                          {ex.muscleGroup}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${eqOk ? 'bg-blue-50 text-blue-700' : 'bg-amber-100 text-amber-800'}`}>
                          {eqOk ? ex.equipment : `⚠ ${ex.equipment}`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleToggleFav(ex.id, e)}
                      className={`p-1 rounded-lg ${isFav ? 'text-action-500' : 'text-gray-400 hover:text-action-500'}`}
                      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                    >
                      <span className="material-icons text-base">{isFav ? 'star' : 'star_border'}</span>
                    </button>
                    <span className="w-7 h-7 rounded-lg bg-action-500 text-military-950 flex items-center justify-center">
                      <span className="material-icons text-sm">add</span>
                    </span>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-8 text-xs text-gray-400 italic">
                Aucun exercice trouvé. Utilisez l'onglet « + Perso » pour le créer en 15 secondes.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ExercisePickerDrawer;
