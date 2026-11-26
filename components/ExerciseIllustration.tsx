import React, { useState } from 'react';
import { ExerciseVisualKind, resolveExerciseVisual, ExerciseVisualGuide } from '../utils/exerciseVisuals';

interface ExerciseIllustrationProps {
  exerciseName: string;
  fallbackType?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  animated?: boolean;
  dark?: boolean;
  clickable?: boolean;
  className?: string;
}

/**
 * Schémas SVG biomécaniques animés haute précision (30 mouvements distincts, 100 % hors-ligne).
 * Anatomie rigoureuse : appuis au sol ou à la barre fixes, trajectoires respectant la gravité,
 * surlignage doré/rouge exact des groupes musculaires moteurs.
 */
const AnimatedExerciseSVG: React.FC<{ kind: ExerciseVisualKind; animated: boolean; dark: boolean }> = ({
  kind,
  animated,
  dark
}) => {
  const anim = animated ? '' : '[animation-play-state:paused]';
  const strokeMain = dark ? '#f4f6f5' : '#232d29';
  const strokeMuted = dark ? '#6d8678' : '#95aa9f';
  const gold = '#e1ad01';
  const hot = '#ef4444';
  const teal = '#10b981';
  const blue = '#38bdf8';

  const showFloor = !['pullup', 'swimming', 'rest'].includes(kind);

  return (
    <svg viewBox="0 0 120 120" className="w-full h-full select-none" aria-hidden="true">
      {showFloor && (
        <line x1="12" y1="104" x2="108" y2="104" stroke={strokeMuted} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="3 4" />
      )}

      {/* 1. SQUAT CHARGÉ BARRE (pieds ancrés au sol, barre olympique sur trapèzes) */}
      {kind === 'barbell_squat' && (
        <g>
          <g className={`ex-anim-squat-grounded ${anim}`}>
            {/* Barre olympique + disques */}
            <line x1="18" y1="36" x2="102" y2="36" stroke={gold} strokeWidth="3.5" strokeLinecap="round" />
            <rect x="16" y="28" width="6" height="16" rx="2" fill={gold} />
            <rect x="98" y="28" width="6" height="16" rx="2" fill={gold} />
            <circle cx="60" cy="24" r="7.5" fill={strokeMain} />
            <line x1="60" y1="33" x2="60" y2="62" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M60 38 L40 42 L38 36 M60 38 L80 42 L82 36" fill="none" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            {/* Quadriceps & fessiers moteurs */}
            <circle cx="60" cy="63" r="4.8" fill={hot} />
            <path d="M58 63 L43 82 L49 102" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 63 L77 82 L71 102" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}

      {/* 2. AIR SQUAT / SQUAT POIDS DU CORPS (AUCUNE BARRE, bras tendus devant) */}
      {kind === 'air_squat' && (
        <g>
          <g className={`ex-anim-squat-grounded ${anim}`}>
            <circle cx="52" cy="26" r="7.5" fill={strokeMain} />
            <line x1="52" y1="35" x2="46" y2="64" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            {/* Bras tendus vers l'avant (équilibre Air Squat) */}
            <line x1="51" y1="40" x2="84" y2="42" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            {/* Quadriceps & Fessiers actifs */}
            <circle cx="46" cy="65" r="4.8" fill={hot} />
            <path d="M46 64 L68 78 L58 102" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M44 66 L62 80 L52 102" fill="none" stroke={gold} strokeWidth="4" opacity="0.6" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}

      {/* 3. WALL BALL / THRUSTER (Squat + lancer de ballon vers cible murale) */}
      {kind === 'wall_ball' && (
        <g>
          {/* Mur + cible */}
          <line x1="98" y1="14" x2="98" y2="104" stroke={strokeMuted} strokeWidth="3.5" />
          <line x1="93" y1="26" x2="98" y2="26" stroke={hot} strokeWidth="4" strokeLinecap="round" />
          {/* Athlète en squat / poussée */}
          <g className={`ex-anim-squat-grounded ${anim}`}>
            <circle cx="50" cy="34" r="7" fill={strokeMain} />
            <line x1="50" y1="42" x2="48" y2="68" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M50 47 L66 36" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            <path d="M48 68 L64 82 L56 102" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          {/* Medball en trajectoire verticale */}
          <g className={`ex-anim-ball ${anim}`}>
            <circle cx="76" cy="40" r="8.5" fill={gold} stroke={hot} strokeWidth="2" />
          </g>
        </g>
      )}

      {/* 4. DÉVELOPPÉ COUCHÉ (banc fixe, barre montant/descendant au-dessus de la poitrine) */}
      {kind === 'bench_press' && (
        <g>
          <rect x="22" y="78" width="68" height="7" rx="3" fill={strokeMuted} />
          <line x1="32" y1="85" x2="32" y2="103" stroke={strokeMuted} strokeWidth="4" strokeLinecap="round" />
          <line x1="80" y1="85" x2="80" y2="103" stroke={strokeMuted} strokeWidth="4" strokeLinecap="round" />
          <circle cx="30" cy="70" r="7" fill={strokeMain} />
          <line x1="38" y1="73" x2="76" y2="73" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <path d="M76 73 L92 78 L95 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <ellipse cx="52" cy="71" rx="7" ry="4" fill={hot} opacity="0.9" />
          {/* Bras + Barre animés uniquement entre poitrine (y=62) et bras tendus (y=36) */}
          <g className={`ex-anim-press ${anim}`}>
            <line x1="50" y1="68" x2="50" y2="38" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="34" y1="38" x2="66" y2="38" stroke={gold} strokeWidth="3.5" strokeLinecap="round" />
            <circle cx="50" cy="38" r="9" fill="none" stroke={gold} strokeWidth="3.5" />
          </g>
        </g>
      )}

      {/* 5. DÉVELOPPÉ MILITAIRE / OVERHEAD PRESS (debout poussée verticale) */}
      {kind === 'overhead_press' && (
        <g>
          <path d="M52 102 L55 66 L65 66 L68 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="60" y1="66" x2="60" y2="38" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="29" r="7" fill={strokeMain} />
          {/* Deltoïdes illuminés */}
          <circle cx="52" cy="40" r="4" fill={hot} />
          <circle cx="68" cy="40" r="4" fill={hot} />
          {/* Barre poussée au-dessus de la tête */}
          <g className={`ex-anim-press ${anim}`}>
            <path d="M50 40 L44 22 M70 40 L76 22" stroke={gold} strokeWidth="4" strokeLinecap="round" />
            <line x1="26" y1="20" x2="94" y2="20" stroke={gold} strokeWidth="3.5" strokeLinecap="round" />
            <rect x="24" y="14" width="6" height="12" rx="2" fill={gold} />
            <rect x="90" y="14" width="6" height="12" rx="2" fill={gold} />
          </g>
        </g>
      )}

      {/* 5b. ÉLÉVATIONS LATÉRALES / FRONTALES / OISEAU */}
      {kind === 'lateral_raise' && (
        <g>
          <path d="M52 102 L55 66 L65 66 L68 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="60" y1="66" x2="60" y2="38" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="29" r="7" fill={strokeMain} />
          <circle cx="51" cy="40" r="4.2" fill={hot} />
          <circle cx="69" cy="40" r="4.2" fill={hot} />
          <g className={`ex-anim-press ${anim}`}>
            <line x1="52" y1="40" x2="26" y2="40" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="68" y1="40" x2="94" y2="40" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <rect x="20" y="36" width="8" height="8" rx="2" fill={gold} />
            <rect x="92" y="36" width="8" height="8" rx="2" fill={gold} />
          </g>
        </g>
      )}

      {/* 5c. CURL BICEPS */}
      {kind === 'biceps_curl' && (
        <g>
          <path d="M52 102 L55 66 L65 66 L68 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="60" y1="66" x2="60" y2="38" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="60" cy="29" r="7" fill={strokeMain} />
          {/* Haut de bras fixe le long du corps */}
          <line x1="52" y1="40" x2="50" y2="58" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="68" y1="40" x2="70" y2="58" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="50" cy="49" r="3.8" fill={hot} />
          <circle cx="70" cy="49" r="3.8" fill={hot} />
          {/* Avant-bras + barre en flexion */}
          <g className={`ex-anim-curl ${anim}`}>
            <line x1="50" y1="58" x2="40" y2="44" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="70" y1="58" x2="80" y2="44" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="34" y1="44" x2="86" y2="44" stroke={gold} strokeWidth="3.5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 5d. EXTENSION TRICEPS */}
      {kind === 'triceps_ext' && (
        <g>
          {/* Câble poulie haute */}
          <line x1="78" y1="12" x2="78" y2="52" stroke={strokeMuted} strokeWidth="2.5" strokeDasharray="3 2" />
          <path d="M46 102 L48 66 L58 66 L60 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="53" y1="66" x2="55" y2="38" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="55" cy="29" r="7" fill={strokeMain} />
          {/* Coude fixe près des côtes + triceps actif */}
          <line x1="56" y1="40" x2="60" y2="56" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="59" cy="48" r="4" fill={hot} />
          <g className={`ex-anim-triceps ${anim}`}>
            <line x1="60" y1="56" x2="78" y2="66" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <rect x="74" y="63" width="10" height="6" rx="2" fill={gold} />
          </g>
        </g>
      )}

      {/* 5e. MACHINE JAMBES (LEG EXTENSION / LEG CURL / MOLLETS) */}
      {kind === 'leg_machine' && (
        <g>
          {/* Siège machine */}
          <rect x="28" y="68" width="28" height="7" rx="3" fill={strokeMuted} />
          <line x1="32" y1="42" x2="32" y2="75" stroke={strokeMuted} strokeWidth="5" strokeLinecap="round" />
          <line x1="42" y1="75" x2="42" y2="102" stroke={strokeMuted} strokeWidth="4" />
          {/* Athlète assis */}
          <circle cx="38" cy="34" r="7" fill={strokeMain} />
          <line x1="38" y1="42" x2="40" y2="68" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
          <line x1="40" y1="68" x2="62" y2="68" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="52" cy="67" r="4.5" fill={hot} />
          {/* Jambe en extension/flexion */}
          <g className={`ex-anim-legext ${anim}`}>
            <line x1="62" y1="68" x2="86" y2="76" stroke={gold} strokeWidth="5.5" strokeLinecap="round" />
            <circle cx="84" cy="76" r="5" fill={gold} />
          </g>
        </g>
      )}

      {/* 6. POMPES CCPM (pivot anatomique autour des pieds au sol, jamais sous le sol !) */}
      {kind === 'pushup' && (
        <g>
          {/* Mains & pieds fixes au sol */}
          <line x1="78" y1="102" x2="88" y2="102" stroke={gold} strokeWidth="4" strokeLinecap="round" />
          <g className={`ex-anim-pushup-pivot ${anim}`}>
            <circle cx="90" cy="60" r="7" fill={strokeMain} />
            <line x1="83" y1="65" x2="22" y2="98" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <circle cx="76" cy="69" r="4.5" fill={hot} />
            <line x1="79" y1="68" x2="83" y2="100" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 7. DIPS SUR BARRES PARALLÈLES (barres fixes, buste qui descend/monte entre les barres) */}
      {kind === 'dips' && (
        <g>
          {/* Station Dips fixe */}
          <line x1="34" y1="54" x2="86" y2="54" stroke={strokeMuted} strokeWidth="4.5" strokeLinecap="round" />
          <line x1="38" y1="54" x2="38" y2="103" stroke={strokeMuted} strokeWidth="3.5" />
          <line x1="82" y1="54" x2="82" y2="103" stroke={strokeMuted} strokeWidth="3.5" />
          <g className={`ex-anim-dips ${anim}`}>
            <circle cx="60" cy="24" r="7" fill={strokeMain} />
            <line x1="60" y1="32" x2="60" y2="62" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            {/* Bras sur barres + Triceps illuminés */}
            <path d="M56 36 L44 46 L46 54 M64 36 L76 46 L74 54" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="48" cy="43" r="3.5" fill={hot} />
            <circle cx="72" cy="43" r="3.5" fill={hot} />
            {/* Jambes repliées */}
            <path d="M60 62 L56 80 L64 88" fill="none" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}

      {/* 8. HANDSTAND PUSH-UPS (corps inversé contre un mur, tête vers le bas) */}
      {kind === 'hspu' && (
        <g>
          {/* Mur à gauche */}
          <line x1="26" y1="12" x2="26" y2="104" stroke={strokeMuted} strokeWidth="4" />
          <g className={`ex-anim-dips ${anim}`}>
            {/* Jambes contre le mur */}
            <line x1="32" y1="22" x2="46" y2="52" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" />
            {/* Buste inversé */}
            <line x1="46" y1="52" x2="54" y2="80" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            {/* Tête en bas */}
            <circle cx="56" cy="90" r="6.5" fill={strokeMain} />
            {/* Épaules / Triceps */}
            <circle cx="53" cy="78" r="4.5" fill={hot} />
            <path d="M54 78 L66 88 L64 102" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}

      {/* 9. TRACTIONS VERTICALES / PULL-UPS (barre fixe, mains accrochées, menton passe au-dessus) */}
      {kind === 'pullup' && (
        <g>
          <line x1="16" y1="22" x2="104" y2="22" stroke={strokeMuted} strokeWidth="5" strokeLinecap="round" />
          <line x1="22" y1="22" x2="22" y2="108" stroke={strokeMuted} strokeWidth="3" opacity="0.4" />
          <line x1="98" y1="22" x2="98" y2="108" stroke={strokeMuted} strokeWidth="3" opacity="0.4" />
          {/* Mains fixes sur la barre */}
          <circle cx="44" cy="22" r="3.5" fill={gold} />
          <circle cx="76" cy="22" r="3.5" fill={gold} />
          <g className={`ex-anim-pullup ${anim}`}>
            <path d="M44 24 L42 42 L56 46 M76 24 L78 42 L64 46" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="60" cy="34" r="7" fill={strokeMain} />
            <line x1="60" y1="43" x2="60" y2="74" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <ellipse cx="60" cy="53" rx="8" ry="5" fill={hot} opacity="0.9" />
            <path d="M58 74 L55 96 M62 74 L65 96" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 10. ROWING / TIRAGE HORIZONTAL / TRACTIONS AUSTRALIENNES */}
      {kind === 'rowing' && (
        <g>
          <path d="M34 102 L42 74 L54 64" fill="none" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="54" y1="64" x2="82" y2="46" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="90" cy="40" r="7" fill={strokeMain} />
          <ellipse cx="70" cy="52" rx="7" ry="4.5" fill={hot} opacity="0.9" />
          <g className={`ex-anim-rowpull ${anim}`}>
            <path d="M76 50 L68 70 L74 84" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="64" y="82" width="20" height="7" rx="3" fill={gold} />
          </g>
        </g>
      )}

      {/* 11. SOULEVÉ DE TERRE / DEADLIFT (charnière hanche, barre au-dessus du sol) */}
      {kind === 'deadlift' && (
        <g>
          <path d="M44 102 L48 76 L54 64" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M56 102 L58 76 L55 64" fill="none" stroke={gold} strokeWidth="5" opacity="0.7" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="53" cy="65" r="5" fill={hot} />
          <g className={`ex-anim-hinge ${anim}`}>
            <line x1="54" y1="64" x2="72" y2="36" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <circle cx="77" cy="26" r="7" fill={strokeMain} />
            <line x1="68" y1="42" x2="70" y2="78" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="70" cy="82" r="10" fill="none" stroke={gold} strokeWidth="4" />
            <circle cx="70" cy="82" r="2.8" fill={gold} />
          </g>
        </g>
      )}

      {/* 12. PONT FESSIER (allongé sur le dos, hanches qui montent vers l'alignement) */}
      {kind === 'glute_bridge' && (
        <g>
          <circle cx="24" cy="95" r="6.5" fill={strokeMain} />
          {/* Pieds ancrés au sol */}
          <line x1="90" y1="102" x2="98" y2="102" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
          <g className={`ex-anim-bridge ${anim}`}>
            <path d="M32 98 L62 72 L86 74 L92 101" fill="none" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M60 72 L86 74" stroke={gold} strokeWidth="6" strokeLinecap="round" />
            <circle cx="62" cy="73" r="5" fill={hot} />
          </g>
        </g>
      )}

      {/* 13. FENTES (pieds ancrés, genou arrière qui descend sans traverser le sol) */}
      {kind === 'lunge' && (
        <g>
          <g className={`ex-anim-squat-grounded ${anim}`}>
            <circle cx="58" cy="24" r="7" fill={strokeMain} />
            <line x1="58" y1="33" x2="58" y2="62" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <line x1="58" y1="40" x2="49" y2="58" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />
            <line x1="58" y1="40" x2="67" y2="58" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M58 62 L82 72 L82 102" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M58 62 L44 86 L26 100" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="72" cy="68" r="4.5" fill={hot} />
          </g>
        </g>
      )}

      {/* 14. GAINAGE PLANCHE / ANTI-ROTATION (face au sol sur avant-bras, alignement parfait) */}
      {kind === 'plank' && (
        <g>
          <rect x="14" y="99" width="92" height="4" rx="2" fill={strokeMuted} opacity="0.45" />
          <g className={`ex-anim-breathe ${anim}`}>
            <circle cx="92" cy="68" r="7" fill={strokeMain} />
            <line x1="84" y1="73" x2="22" y2="88" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <path d="M80 75 L78 97 L92 97" fill="none" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="46" y="74" width="22" height="8" rx="4" fill={gold} transform="rotate(-13 57 78)" />
            <circle cx="57" cy="78" r="3" fill={hot} />
            <line x1="22" y1="88" x2="22" y2="99" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          </g>
          <path d="M44 58 Q58 50 72 58" fill="none" stroke={blue} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
        </g>
      )}

      {/* 15. SIT-UPS / ABDOS / V-UPS / HOLLOW / RELEVÉS DE JAMBES (allongé sur le DOS !) */}
      {kind === 'situps' && (
        <g>
          <rect x="14" y="99" width="92" height="4" rx="2" fill={strokeMuted} opacity="0.45" />
          {/* Jambes fléchies ancrées au sol */}
          <path d="M58 94 L78 74 L94 98" fill="none" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          {/* Buste qui s'enroule depuis le bassin (58, 94) */}
          <g className={`ex-anim-situp ${anim}`}>
            <line x1="58" y1="94" x2="30" y2="70" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <circle cx="24" cy="62" r="7" fill={strokeMain} />
            <line x1="36" y1="74" x2="54" y2="68" stroke={gold} strokeWidth="4" strokeLinecap="round" />
            {/* Grand droit illuminé */}
            <circle cx="48" cy="85" r="4.5" fill={hot} />
          </g>
          <path d="M36 46 A 26 26 0 0 1 60 44" fill="none" stroke={gold} strokeWidth="2.2" strokeDasharray="3 3" />
        </g>
      )}

      {/* 16. COURSE À PIED / VMA */}
      {kind === 'running' && (
        <g>
          <line x1="12" y1="36" x2="28" y2="36" stroke={teal} strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
          <line x1="8" y1="50" x2="22" y2="50" stroke={gold} strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
          <line x1="14" y1="64" x2="26" y2="64" stroke={teal} strokeWidth="2" strokeLinecap="round" opacity="0.6" />
          <g className={`ex-anim-run ${anim}`}>
            <circle cx="68" cy="24" r="7" fill={strokeMain} />
            <line x1="65" y1="33" x2="57" y2="62" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M63 39 L78 46 L86 38" fill="none" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M62 41 L46 48 L40 58" fill="none" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M57 62 L76 74 L72 98" fill="none" stroke={teal} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M57 62 L40 78 L28 90" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="62" cy="43" r="4" fill={hot} />
          </g>
        </g>
      )}

      {/* 17. BIKEERG / VÉLO (cadre + roue avant + pédalier animé) */}
      {kind === 'bike_erg' && (
        <g>
          {/* Cadre vélo ergomètre */}
          <circle cx="86" cy="82" r="16" fill="none" stroke={teal} strokeWidth="4" />
          <circle cx="86" cy="82" r="4" fill={gold} />
          <path d="M36 74 L56 90 L86 82 M56 90 L74 52 L84 48" fill="none" stroke={strokeMuted} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="30" y1="70" x2="44" y2="70" stroke={strokeMuted} strokeWidth="4" strokeLinecap="round" />
          {/* Cycliste */}
          <circle cx="60" cy="30" r="7" fill={strokeMain} />
          <line x1="56" y1="38" x2="40" y2="66" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
          <line x1="55" y1="42" x2="76" y2="50" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
          <g className={`ex-anim-pedal ${anim}`}>
            <path d="M40 66 L58 76 L56 92" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="52" cy="73" r="4" fill={hot} />
          </g>
        </g>
      )}

      {/* 18. RAMEUR CONCEPT2 (rail horizontal + roue + glisse horizontale) */}
      {kind === 'rowing_erg' && (
        <g>
          <line x1="18" y1="90" x2="94" y2="90" stroke={strokeMuted} strokeWidth="4" strokeLinecap="round" />
          <circle cx="92" cy="76" r="14" fill="none" stroke={teal} strokeWidth="4" />
          <circle cx="92" cy="76" r="4" fill={gold} />
          <g className={`ex-anim-rowerg ${anim}`}>
            <circle cx="42" cy="38" r="7" fill={strokeMain} />
            <line x1="44" y1="46" x2="50" y2="74" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M50 74 L70 72 L78 86" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="47" y1="53" x2="72" y2="66" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            <line x1="72" y1="66" x2="88" y2="74" stroke={gold} strokeWidth="2.5" strokeDasharray="3 2" />
            <circle cx="46" cy="54" r="3.8" fill={hot} />
          </g>
        </g>
      )}

      {/* 19. SKIERG (colonne verticale fixe, athlète debout tirant les deux poignées vers le bas) */}
      {kind === 'ski_erg' && (
        <g>
          {/* Colonne SkiErg */}
          <rect x="86" y="16" width="8" height="86" rx="3" fill={strokeMuted} opacity="0.6" />
          <circle cx="90" cy="84" r="10" fill="none" stroke={teal} strokeWidth="3.5" />
          {/* Athlète debout */}
          <path d="M44 102 L48 76 L52 66" fill="none" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <g className={`ex-anim-hinge ${anim}`}>
            <line x1="52" y1="66" x2="56" y2="38" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <circle cx="56" cy="28" r="7" fill={strokeMain} />
            <line x1="56" y1="42" x2="76" y2="54" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="76" y1="54" x2="88" y2="26" stroke={gold} strokeWidth="2" strokeDasharray="3 2" />
            <circle cx="54" cy="48" r="4" fill={hot} />
          </g>
        </g>
      )}

      {/* 20. NATATION (vagues d'eau + nageur horizontal + mouvement de bras) */}
      {kind === 'swimming' && (
        <g>
          {/* Lignes d'eau */}
          <path d="M10 74 Q24 66 38 74 T66 74 T94 74 T112 74" fill="none" stroke={blue} strokeWidth="3" strokeLinecap="round" />
          <path d="M14 88 Q28 82 42 88 T70 88 T98 88" fill="none" stroke={blue} strokeWidth="2.2" opacity="0.55" strokeLinecap="round" />
          <g className={`ex-anim-swim ${anim}`}>
            <circle cx="88" cy="54" r="7" fill={strokeMain} />
            <line x1="80" y1="58" x2="36" y2="62" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            {/* Bras en crawl/brasse */}
            <path d="M74 58 L86 40 L102 44" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="72" cy="56" r="4" fill={hot} />
            {/* Battements jambes */}
            <path d="M36 62 L18 56 M36 62 L18 68" stroke={teal} strokeWidth="4.5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 21. BURPEE (indicateur cycle sol ↔ saut vertical explosif) */}
      {kind === 'burpee' && (
        <g>
          {/* Silhouette fantôme planche au sol (phase 1) */}
          <line x1="18" y1="98" x2="54" y2="88" stroke={strokeMuted} strokeWidth="4" opacity="0.4" strokeLinecap="round" />
          {/* Athlète en extension sautée (phase 2) */}
          <g className={`ex-anim-jump ${anim}`}>
            <circle cx="72" cy="24" r="7" fill={strokeMain} />
            <path d="M72 35 L58 16 M72 35 L86 16" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <line x1="72" y1="33" x2="72" y2="64" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            <path d="M70 64 L62 90 M74 64 L82 90" stroke={hot} strokeWidth="5" strokeLinecap="round" />
          </g>
          <path d="M34 80 Q44 54 56 58" fill="none" stroke={gold} strokeWidth="2.2" strokeDasharray="3 3" />
        </g>
      )}

      {/* 22. MOUNTAIN CLIMBERS / MARCHE DE L'OURS (mains au sol, genou qui monte vers poitrine) */}
      {kind === 'mountain_climber' && (
        <g>
          {/* Mains fixes au sol */}
          <circle cx="88" cy="56" r="7" fill={strokeMain} />
          <line x1="81" y1="62" x2="34" y2="84" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <line x1="79" y1="64" x2="82" y2="102" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          {/* Jambe arrière tendue */}
          <line x1="34" y1="84" x2="18" y2="101" stroke={strokeMain} strokeWidth="4.5" strokeLinecap="round" />
          {/* Genou dynamique qui monte vers la poitrine */}
          <g className={`ex-anim-climber ${anim}`}>
            <path d="M40 81 L62 76 L58 98" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="58" cy="76" r="4" fill={hot} />
          </g>
        </g>
      )}

      {/* 23. CORDE À SAUTER / DOUBLE UNDERS (poignets près des hanches + arc de corde) */}
      {kind === 'jump_rope' && (
        <g>
          <g className={`ex-anim-ropejump ${anim}`}>
            {/* Arc de corde */}
            <ellipse cx="60" cy="58" rx="34" ry="42" fill="none" stroke={teal} strokeWidth="2.5" strokeDasharray="5 4" />
            <circle cx="60" cy="26" r="7" fill={strokeMain} />
            <line x1="60" y1="34" x2="60" y2="66" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M60 40 L44 56 L36 58 M60 40 L76 56 L84 58" fill="none" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M57 66 L54 94 M63 66 L66 94" stroke={gold} strokeWidth="5" strokeLinecap="round" />
            <circle cx="55" cy="86" r="3.5" fill={hot} />
            <circle cx="65" cy="86" r="3.5" fill={hot} />
          </g>
        </g>
      )}

      {/* 24. JUMPING JACKS (ouverture symétrique bras & jambes) */}
      {kind === 'jumping_jacks' && (
        <g>
          <g className={`ex-anim-ropejump ${anim}`}>
            <circle cx="60" cy="24" r="7" fill={strokeMain} />
            <line x1="60" y1="33" x2="60" y2="64" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            {/* Bras levés en V */}
            <path d="M60 39 L34 18 M60 39 L86 18" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            {/* Jambes écartées */}
            <path d="M60 64 L38 96 M60 64 L82 96" stroke={teal} strokeWidth="5" strokeLinecap="round" />
            <circle cx="60" cy="40" r="4" fill={hot} />
          </g>
        </g>
      )}

      {/* 25. BOX JUMP / BOX STEP-UP */}
      {kind === 'box_jump' && (
        <g>
          <rect x="66" y="64" width="36" height="38" rx="4" fill={strokeMuted} opacity="0.35" stroke={strokeMuted} strokeWidth="2.5" />
          <g className={`ex-anim-jump ${anim}`}>
            <circle cx="42" cy="26" r="7" fill={strokeMain} />
            <line x1="42" y1="35" x2="40" y2="62" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M42 40 L58 28" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            <path d="M40 62 L52 74 L44 92" fill="none" stroke={gold} strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="47" cy="68" r="4" fill={hot} />
          </g>
          <path d="M50 52 Q64 36 82 54" fill="none" stroke={gold} strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3" />
        </g>
      )}

      {/* 26. KETTLEBELL SWING / ARRACHÉ HALTÈRE */}
      {kind === 'kettlebell' && (
        <g>
          <path d="M46 102 L50 76 L58 64 L66 76 L70 102" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="58" y1="64" x2="58" y2="34" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
          <circle cx="58" cy="24" r="7" fill={strokeMain} />
          <circle cx="58" cy="63" r="4.5" fill={hot} />
          <g className={`ex-anim-swing ${anim}`}>
            <line x1="58" y1="40" x2="86" y2="48" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="92" cy="52" r="7.5" fill={gold} />
            <path d="M87 45 Q92 38 97 45" fill="none" stroke={gold} strokeWidth="2.5" />
          </g>
        </g>
      )}

      {/* 27. FARMER WALK / PORT DE CHARGE (debout, deux lourdes charges le long des cuisses) */}
      {kind === 'farmer_walk' && (
        <g>
          <g className={`ex-anim-walk ${anim}`}>
            <circle cx="60" cy="22" r="7" fill={strokeMain} />
            <line x1="60" y1="30" x2="60" y2="62" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
            {/* Bras tendus tenant 2 lourdes charges */}
            <line x1="54" y1="36" x2="42" y2="66" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            <line x1="66" y1="36" x2="78" y2="66" stroke={strokeMain} strokeWidth="4" strokeLinecap="round" />
            <rect x="34" y="66" width="16" height="14" rx="4" fill={gold} />
            <rect x="70" y="66" width="16" height="14" rx="4" fill={gold} />
            <circle cx="54" cy="36" r="3.5" fill={hot} />
            <circle cx="66" cy="36" r="3.5" fill={hot} />
            {/* Pas dynamique */}
            <path d="M58 62 L50 84 L46 102 M62 62 L70 84 L74 102" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" />
          </g>
        </g>
      )}

      {/* 28. COMBAT / DIRECTS BOXE / MONTÉES DE GENOUX */}
      {kind === 'combat' && (
        <g>
          <path d="M46 102 L50 74 L56 64" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="56" y1="64" x2="58" y2="34" stroke={strokeMain} strokeWidth="6" strokeLinecap="round" />
          <circle cx="58" cy="24" r="7" fill={strokeMain} />
          {/* Direct bras avant + montée de genou dynamique */}
          <g className={`ex-anim-punch ${anim}`}>
            <line x1="58" y1="39" x2="94" y2="37" stroke={gold} strokeWidth="4.5" strokeLinecap="round" />
            <circle cx="96" cy="37" r="5" fill={hot} />
            <path d="M56 64 L76 68 L72 92" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
          <path d="M58 41 L46 48 L52 40" fill="none" stroke={strokeMain} strokeWidth="3.5" strokeLinecap="round" />
        </g>
      )}

      {/* 29. MOBILITÉ / POSTURE / ORFA / PRÉVENTION */}
      {kind === 'mobility' && (
        <g>
          <rect x="18" y="99" width="84" height="4" rx="2" fill={strokeMuted} opacity="0.45" />
          <g className={`ex-anim-breathe ${anim}`}>
            <path d="M36 54 A 26 26 0 0 1 86 50" fill="none" stroke="#818cf8" strokeWidth="2.5" strokeDasharray="4 3" />
            <circle cx="60" cy="36" r="7" fill={strokeMain} />
            <line x1="60" y1="44" x2="54" y2="74" stroke={strokeMain} strokeWidth="5.5" strokeLinecap="round" />
            <path d="M34 46 L60 52 L88 34" fill="none" stroke={gold} strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M54 74 L76 76 L78 98" fill="none" stroke={strokeMain} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M54 74 L34 94 L22 96" fill="none" stroke="#818cf8" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}

      {/* 30. RÉCUPÉRATION ACTIVE / PAUSE / COHÉRENCE CARDIAQUE */}
      {kind === 'rest' && (
        <g>
          <g className={`ex-anim-breathe ${anim}`}>
            <circle cx="60" cy="60" r="36" fill="none" stroke={blue} strokeWidth="3" opacity="0.3" />
            <circle cx="60" cy="60" r="24" fill="none" stroke={teal} strokeWidth="3.5" strokeDasharray="6 4" />
            <path d="M38 60 L48 60 L54 44 L62 74 L68 54 L74 60 L84 60" fill="none" stroke={gold} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </g>
      )}
    </svg>
  );
};

export const ExerciseDetailModal: React.FC<{
  exerciseName: string;
  guide: ExerciseVisualGuide;
  onClose: () => void;
}> = ({ exerciseName, guide, onClose }) => {
  const [playing, setPlaying] = useState(true);

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-[fadeIn_0.2s]"
      onClick={onClose}
    >
      <div
        className="bg-white text-military-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl max-h-[90vh] flex flex-col animate-[zoomIn_0.2s]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-military-950 via-military-900 to-military-800 p-6 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            aria-label="Fermer la fiche technique"
          >
            <span className="material-icons text-lg">close</span>
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-36 h-36 rounded-2xl bg-white/10 border border-action-500/40 p-2 relative shrink-0">
              <AnimatedExerciseSVG kind={guide.kind} animated={playing} dark />
              <button
                type="button"
                onClick={() => setPlaying(!playing)}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-lg bg-action-500 text-military-950 flex items-center justify-center shadow"
                title={playing ? 'Mettre en pause' : 'Animer'}
              >
                <span className="material-icons text-sm">{playing ? 'pause' : 'play_arrow'}</span>
              </button>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-action-500 text-military-950">
                {guide.categoryLabel}
              </span>
              <h3 className="text-xl font-black mt-2 leading-tight">{exerciseName}</h3>
              <div className="flex flex-wrap justify-center sm:justify-start gap-1.5 mt-2.5">
                {guide.primaryMuscles.map((m) => (
                  <span key={m} className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-500/25 text-red-200 border border-red-400/30">
                    ● {m}
                  </span>
                ))}
                {guide.secondaryMuscles.slice(0, 2).map((m) => (
                  <span key={m} className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-military-200">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 text-xs">
          <div>
            <h4 className="font-black uppercase text-military-900 mb-2 flex items-center gap-1.5">
              <span className="material-icons text-sm text-emerald-600">check_circle</span>
              Points clés d'exécution (Biomécanique EPMS)
            </h4>
            <ol className="space-y-2">
              {guide.cues.map((cue, idx) => (
                <li key={idx} className="flex items-start gap-2.5 bg-military-50 p-2.5 rounded-xl">
                  <span className="w-5 h-5 rounded-full bg-military-900 text-action-400 font-black text-[10px] flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-gray-700 leading-relaxed">{cue}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-100">
              <div className="font-black uppercase text-[10px] text-blue-900 mb-1 flex items-center gap-1">
                <span className="material-icons text-xs">air</span> Respiration
              </div>
              <p className="text-blue-900/80 leading-relaxed">{guide.breathing}</p>
            </div>
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-100">
              <div className="font-black uppercase text-[10px] text-emerald-900 mb-1 flex items-center gap-1">
                <span className="material-icons text-xs">tune</span> Option Adaptée (Scaled)
              </div>
              <p className="text-emerald-900/80 leading-relaxed">{guide.scaledOption}</p>
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-red-50 border border-red-100">
            <div className="font-black uppercase text-[10px] text-red-900 mb-1.5 flex items-center gap-1">
              <span className="material-icons text-xs">warning</span> Erreurs fréquentes à éviter
            </div>
            <ul className="space-y-1 text-red-900/80">
              {guide.commonMistakes.map((m, i) => (
                <li key={i}>• {m}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

const ExerciseIllustration: React.FC<ExerciseIllustrationProps> = ({
  exerciseName,
  fallbackType,
  size = 'sm',
  animated = true,
  dark = false,
  clickable = true,
  className = ''
}) => {
  const [openModal, setOpenModal] = useState(false);
  const guide = resolveExerciseVisual(exerciseName, fallbackType);

  const dimClass =
    size === 'xs'
      ? 'w-11 h-11 rounded-xl p-1'
      : size === 'sm'
      ? 'w-16 h-16 rounded-2xl p-1.5'
      : size === 'md'
      ? 'w-24 h-24 rounded-2xl p-2'
      : 'w-40 h-40 rounded-3xl p-3';

  return (
    <>
      <div
        onClick={(e) => {
          if (!clickable) return;
          e.stopPropagation();
          setOpenModal(true);
        }}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={(e) => {
          if (clickable && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            e.stopPropagation();
            setOpenModal(true);
          }
        }}
        title={clickable ? `Voir la fiche technique animée : ${exerciseName}` : exerciseName}
        className={`relative shrink-0 border flex items-center justify-center transition-transform ${
          clickable ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
        } ${
          dark
            ? 'bg-white/10 border-white/15 hover:border-action-400'
            : 'bg-military-50 border-military-200 hover:border-action-500'
        } ${dimClass} ${className}`}
      >
        <AnimatedExerciseSVG kind={guide.kind} animated={animated} dark={dark} />
        {clickable && size !== 'xs' && (
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-action-500 text-military-950 flex items-center justify-center shadow text-[11px]">
            <span className="material-icons text-[12px]">info</span>
          </span>
        )}
      </div>

      {openModal && (
        <ExerciseDetailModal
          exerciseName={exerciseName}
          guide={guide}
          onClose={() => setOpenModal(false)}
        />
      )}
    </>
  );
};

export default ExerciseIllustration;
