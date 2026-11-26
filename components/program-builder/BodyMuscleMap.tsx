import React from 'react';

interface BodyMuscleMapProps {
  muscleHeat: Record<string, number>; // 0..100
  dark?: boolean;
}

const heatFill = (score: number, dark: boolean) => {
  if (!score || score < 15) return dark ? '#32423a' : '#e3e8e5';
  if (score < 45) return '#facc15';
  if (score < 75) return '#f97316';
  return '#dc2626';
};

/**
 * Carte corporelle SVG Avant / Arrière colorant en temps réel les groupes musculaires sollicités.
 */
const BodyMuscleMap: React.FC<BodyMuscleMapProps> = ({ muscleHeat, dark = false }) => {
  const pecs = muscleHeat['Pectoraux'] || 0;
  const shoulders = muscleHeat['Épaules'] || 0;
  const arms = muscleHeat['Bras'] || 0;
  const core = muscleHeat['Abdos / Core'] || 0;
  const quads = muscleHeat['Quadriceps / Mollets'] || 0;
  const back = muscleHeat['Dos'] || 0;
  const glutes = muscleHeat['Fessiers / Ischios'] || 0;

  const baseStroke = dark ? '#6d8678' : '#95aa9f';
  const headFill = dark ? '#4e695b' : '#c2cec8';

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-2 gap-3 items-center justify-items-center">
        {/* Vue Avant */}
        <div className="text-center">
          <svg viewBox="0 0 110 210" className="w-24 h-44 mx-auto" aria-label="Carte musculaire vue avant">
            <circle cx="55" cy="20" r="12" fill={headFill} />
            {/* Épaules */}
            <circle cx="31" cy="44" r="9" fill={heatFill(shoulders, dark)} stroke={baseStroke} strokeWidth="1" />
            <circle cx="79" cy="44" r="9" fill={heatFill(shoulders, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Pectoraux */}
            <rect x="38" y="38" width="16" height="17" rx="5" fill={heatFill(pecs, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="56" y="38" width="16" height="17" rx="5" fill={heatFill(pecs, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Bras */}
            <rect x="21" y="52" width="11" height="44" rx="5" fill={heatFill(arms, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="78" y="52" width="11" height="44" rx="5" fill={heatFill(arms, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Abdos / Core */}
            <rect x="40" y="58" width="30" height="38" rx="6" fill={heatFill(core, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Quadriceps & Mollets */}
            <rect x="37" y="100" width="16" height="48" rx="7" fill={heatFill(quads, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="57" y="100" width="16" height="48" rx="7" fill={heatFill(quads, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="39" y="152" width="12" height="42" rx="5" fill={heatFill(Math.round(quads * 0.7), dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="59" y="152" width="12" height="42" rx="5" fill={heatFill(Math.round(quads * 0.7), dark)} stroke={baseStroke} strokeWidth="1" />
          </svg>
          <span className={`text-[9px] font-black uppercase ${dark ? 'text-military-300' : 'text-gray-500'}`}>Avant</span>
        </div>

        {/* Vue Arrière */}
        <div className="text-center">
          <svg viewBox="0 0 110 210" className="w-24 h-44 mx-auto" aria-label="Carte musculaire vue arrière">
            <circle cx="55" cy="20" r="12" fill={headFill} />
            {/* Épaules postérieures */}
            <circle cx="31" cy="44" r="9" fill={heatFill(Math.max(shoulders, Math.round(back * 0.6)), dark)} stroke={baseStroke} strokeWidth="1" />
            <circle cx="79" cy="44" r="9" fill={heatFill(Math.max(shoulders, Math.round(back * 0.6)), dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Dos / Dorsaux / Lombaires */}
            <path d="M37 38 L73 38 L68 90 L42 90 Z" fill={heatFill(back, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Triceps */}
            <rect x="21" y="52" width="11" height="44" rx="5" fill={heatFill(arms, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="78" y="52" width="11" height="44" rx="5" fill={heatFill(arms, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Fessiers */}
            <rect x="38" y="92" width="16" height="22" rx="7" fill={heatFill(glutes, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="56" y="92" width="16" height="22" rx="7" fill={heatFill(glutes, dark)} stroke={baseStroke} strokeWidth="1" />
            {/* Ischios & Mollets */}
            <rect x="38" y="116" width="15" height="34" rx="6" fill={heatFill(glutes, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="57" y="116" width="15" height="34" rx="6" fill={heatFill(glutes, dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="39" y="153" width="12" height="41" rx="5" fill={heatFill(Math.round(Math.max(quads, glutes) * 0.7), dark)} stroke={baseStroke} strokeWidth="1" />
            <rect x="59" y="153" width="12" height="41" rx="5" fill={heatFill(Math.round(Math.max(quads, glutes) * 0.7), dark)} stroke={baseStroke} strokeWidth="1" />
          </svg>
          <span className={`text-[9px] font-black uppercase ${dark ? 'text-military-300' : 'text-gray-500'}`}>Arrière</span>
        </div>
      </div>

      {/* Légende compacte */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {(Object.entries(muscleHeat) as [string, number][])
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([muscle, val]) => (
            <span
              key={muscle}
              className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                val >= 75
                  ? 'bg-red-100 text-red-800 border-red-200'
                  : val >= 45
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              {muscle} {val}%
            </span>
          ))}
      </div>
    </div>
  );
};

export default BodyMuscleMap;
