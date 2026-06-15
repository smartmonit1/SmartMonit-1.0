
import React, { useState } from 'react';
import { UserProfile, JobType, WorkSchedule, Gender, UserRole } from '../types';
import { db } from '../services/mockDatabase';
import { generateNumberOptions, generateTimeOptionsMMSS, generateTimeOptionsHHMMSS } from '../utils/options';
import { AIR_BASES, MILITARY_UNITS } from '../utils/bases';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Login State
  const [loginRole, setLoginRole] = useState<UserRole>(UserRole.USER); // Visual state for login tabs
  const [nid, setNid] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [registrationStep, setRegistrationStep] = useState<'ROLE_SELECTION' | 'FORM'>('ROLE_SELECTION');
  const [regData, setRegData] = useState<Partial<UserProfile>>({
    dailyForms: [],
    tests: {}
  });
  const [nidConfirm, setNidConfirm] = useState('');
  const [ccpmInaptitude, setCcpmInaptitude] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState('lucLeger');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const user = users.find(u => u.nid === nid && u.password === password);
    
    if (user) {
      // Optionnel : Vérifier si le rôle correspond à l'onglet sélectionné pour l'UX
      // Mais on autorise la connexion si les credentials sont bons quoi qu'il arrive
      if (user.role !== loginRole && user.role !== UserRole.ADMINISTRATOR) {
          // Petit warning UX ou redirection silencieuse
          console.warn("Connexion avec un rôle différent de l'onglet sélectionné");
      }
      onLogin(user);
    } else {
      setError('Identifiants invalides.');
    }
  };

  const handlePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const users = db.getUsers();
    const user = users.find(u => u.nid === nid);
    
    if (user) {
      setSuccessMsg(`Un lien de réinitialisation a été envoyé pour le NID ${nid} (Simulation).`);
      setError('');
    } else {
      setError('NID introuvable.');
      setSuccessMsg('');
    }
  };

  const selectRoleAndProceed = (role: UserRole) => {
      setRegData({ ...regData, role });
      setRegistrationStep('FORM');
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (regData.nid !== nidConfirm) {
      setError("Les NID ne correspondent pas.");
      return;
    }
    if (!regData.password || regData.password.length < 4) {
      setError("Mot de passe trop court.");
      return;
    }

    const newUser = regData as UserProfile;
    newUser.tests.ccpmInaptitude = ccpmInaptitude;
    
    db.addUser(newUser);
    onLogin(newUser);
  };

  // --- LOGIN VIEW ---
  if (!isRegistering) {
    return (
      <div className="min-h-screen bg-military-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="bg-military-800 p-8 text-center pb-0">
             <span className="material-icons text-action-500 text-5xl mb-2">verified_user</span>
             <h1 className="text-2xl font-bold text-white tracking-widest mb-6">SMART MONIT</h1>
             
             {/* Onglets de profil connexion */}
             <div className="flex">
                 <button 
                    onClick={() => { setLoginRole(UserRole.USER); setError(''); setSuccessMsg(''); }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-tl-lg ${loginRole === UserRole.USER ? 'bg-white text-military-900' : 'bg-military-700 text-gray-400 hover:text-white'}`}
                 >
                     Utilisateur
                 </button>
                 <button 
                    onClick={() => { setLoginRole(UserRole.MONITOR); setError(''); setSuccessMsg(''); }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors ${loginRole === UserRole.MONITOR ? 'bg-white text-military-900' : 'bg-military-700 text-gray-400 hover:text-white'}`}
                 >
                     Moniteur
                 </button>
                 <button 
                    onClick={() => { setLoginRole(UserRole.ADMINISTRATOR); setError(''); setSuccessMsg(''); }}
                    className={`flex-1 py-3 text-[10px] font-bold uppercase tracking-wider transition-colors rounded-tr-lg ${loginRole === UserRole.ADMINISTRATOR ? 'bg-white text-military-900' : 'bg-military-700 text-gray-400 hover:text-white'}`}
                 >
                     Admin
                 </button>
             </div>
          </div>

          {isRecoveringPassword ? (
            <form onSubmit={handlePasswordRecovery} className="p-8 space-y-6 pt-6">
              <div className="text-center text-sm font-bold text-military-500 uppercase tracking-widest mb-4">
                  Récupération de mot de passe
              </div>

              {error && <div className="text-red-600 text-center text-sm bg-red-50 p-2 rounded">{error}</div>}
              {successMsg && <div className="text-green-600 text-center text-sm bg-green-50 p-2 rounded">{successMsg}</div>}
              
              <div>
                <label className="block text-sm font-medium text-gray-700">NID</label>
                <input type="text" value={nid} onChange={e => setNid(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-action-500 outline-none" placeholder="10 chiffres" />
              </div>
              <button type="submit" className="w-full bg-military-900 text-white font-bold py-3 rounded-lg hover:bg-military-800 transition-colors shadow-lg">
                  RÉINITIALISER
              </button>
              <button type="button" onClick={() => { setIsRecoveringPassword(false); setError(''); setSuccessMsg(''); }} className="w-full text-military-600 text-sm hover:underline font-medium">
                  Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="p-8 space-y-6 pt-6">
              <div className="text-center text-sm font-bold text-military-500 uppercase tracking-widest mb-4">
                  Connexion {loginRole === UserRole.MONITOR ? 'Moniteur' : loginRole === UserRole.ADMINISTRATOR ? 'Admin' : 'Militaire'}
              </div>

              {error && <div className="text-red-600 text-center text-sm bg-red-50 p-2 rounded">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700">NID</label>
                <input type="text" value={nid} onChange={e => setNid(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-action-500 outline-none" placeholder="10 chiffres" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Mot de passe</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-action-500 outline-none" />
              </div>
              <button type="submit" className="w-full bg-action-500 text-white font-bold py-3 rounded-lg hover:bg-action-600 transition-colors shadow-lg">
                  CONNEXION
              </button>
              <div className="flex justify-between">
                <button type="button" onClick={() => { setIsRecoveringPassword(true); setError(''); setSuccessMsg(''); }} className="text-military-600 text-sm hover:underline font-medium">
                    Mot de passe oublié ?
                </button>
                <button type="button" onClick={() => { setIsRegistering(true); setRegistrationStep('ROLE_SELECTION'); }} className="text-military-600 text-sm hover:underline font-medium">
                    Créer un compte
                </button>
              </div>
            </form>
          )}
          <div className="p-4 bg-gray-50 text-xs text-center text-gray-400">
             Démo: Admin (1122334455/password), Monitor (1234567890/password), User (0987654321/password)
          </div>
        </div>
      </div>
    );
  }

  // --- REGISTRATION VIEW ---
  
  // STEP 1: ROLE SELECTION
  if (registrationStep === 'ROLE_SELECTION') {
      return (
        <div className="min-h-screen bg-military-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center animate-[fadeIn_0.3s]">
                <h2 className="text-2xl font-black text-military-900 mb-2 uppercase">Création de compte</h2>
                <p className="text-gray-500 mb-8">Veuillez sélectionner votre profil opérationnel.</p>
                
                <div className="grid gap-4">
                    <button onClick={() => selectRoleAndProceed(UserRole.USER)} className="group relative bg-white border-2 border-military-100 hover:border-action-500 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-military-100 rounded-full flex items-center justify-center group-hover:bg-action-500 transition-colors">
                                <span className="material-icons text-military-600 group-hover:text-white text-2xl">badge</span>
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-military-900 uppercase">Militaire</h3>
                                <p className="text-xs text-gray-500">Utilisateur (Pratiquant, Sportif)</p>
                            </div>
                        </div>
                    </button>

                    <button onClick={() => selectRoleAndProceed(UserRole.MONITOR)} className="group relative bg-white border-2 border-military-100 hover:border-military-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-military-100 rounded-full flex items-center justify-center group-hover:bg-military-800 transition-colors">
                                <span className="material-icons text-military-600 group-hover:text-white text-2xl">sports</span>
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-military-900 uppercase">Moniteur EPMS</h3>
                                <p className="text-xs text-gray-500">Encadrement et Coaching</p>
                            </div>
                        </div>
                    </button>

                    <button onClick={() => selectRoleAndProceed(UserRole.ADMINISTRATOR)} className="group relative bg-white border-2 border-military-100 hover:border-military-800 p-6 rounded-2xl shadow-sm hover:shadow-xl transition-all text-left">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-military-100 rounded-full flex items-center justify-center group-hover:bg-military-800 transition-colors">
                                <span className="material-icons text-military-600 group-hover:text-white text-2xl">admin_panel_settings</span>
                            </div>
                            <div>
                                <h3 className="font-black text-lg text-military-900 uppercase">Administrateur</h3>
                                <p className="text-xs text-gray-500">Gestion de la base et des droits</p>
                            </div>
                        </div>
                    </button>
                </div>

                <button onClick={() => setIsRegistering(false)} className="mt-8 text-gray-400 hover:text-gray-600 text-sm font-bold">Retour à la connexion</button>
            </div>
        </div>
      );
  }

  // STEP 2: FORM
  return (
    <div className="min-h-screen bg-military-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 my-8 animate-[slideUp_0.3s]">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-military-900 uppercase">
                Profil {regData.role === UserRole.ADMINISTRATOR ? 'Admin' : regData.role === UserRole.MONITOR ? 'Moniteur' : 'Militaire'}
            </h2>
            <span className="bg-military-100 text-military-800 text-[10px] font-black px-2 py-1 rounded uppercase">
                {regData.role === UserRole.ADMINISTRATOR ? 'Admin' : regData.role === UserRole.MONITOR ? 'Monitor' : 'User'}
            </span>
        </div>
        
        {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded-lg text-sm font-bold">{error}</div>}
        
        <form onSubmit={handleRegister} className="space-y-6">
          {/* Identity */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">NID (10 chiffres)</label>
                <input required type="text" maxLength={10} className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" 
                       onChange={e => setRegData({...regData, nid: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Confirmer NID</label>
                <input required type="text" maxLength={10} className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" 
                       onChange={e => setNidConfirm(e.target.value)} />
            </div>
            <div className="md:col-span-2">
                <label className="block text-sm font-bold text-gray-500 mb-1">Nom Complet (Grade + Nom)</label>
                <input required type="text" className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" 
                       onChange={e => setRegData({...regData, name: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Mot de passe</label>
                <input required type="password" className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" 
                       onChange={e => setRegData({...regData, password: e.target.value})} />
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Genre</label>
                <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" required
                        onChange={e => setRegData({...regData, gender: e.target.value as Gender})}>
                    <option value="">Sélectionner</option>
                    <option value={Gender.MALE}>Homme</option>
                    <option value={Gender.FEMALE}>Femme</option>
                </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Job Profile */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Affectation (Base)</label>
                <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" required
                        onChange={e => setRegData({...regData, serviceId: e.target.value})}>
                    <option value="">Sélectionner une base</option>
                    {AIR_BASES.map(base => <option key={base.id} value={base.id}>{base.name}</option>)}
                </select>
            </div>
            {regData.serviceId && (
                <div className="animate-[fadeIn_0.3s]">
                    <label className="block text-sm font-bold text-gray-500 mb-1">Unité</label>
                    <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" required
                            onChange={e => setRegData({...regData, unit: e.target.value})}>
                        <option value="">Sélectionner une unité</option>
                        {MILITARY_UNITS.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                    </select>
                </div>
            )}
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Type Métier</label>
                <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" required
                        onChange={e => setRegData({...regData, jobType: e.target.value as JobType})}>
                    <option value="">Sélectionner</option>
                    {Object.values(JobType).map(j => <option key={j} value={j}>{j}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-bold text-gray-500 mb-1">Horaires</label>
                <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold" required
                        onChange={e => setRegData({...regData, workSchedule: e.target.value as WorkSchedule})}>
                    <option value="">Sélectionner</option>
                    {Object.values(WorkSchedule).map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Physical Tests (Displayed for everyone, Monitors also have to stay fit!) */}
          <div>
             <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg text-military-900">Condition Physique (CCPM)</h3>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer bg-gray-100 px-3 py-1 rounded-lg hover:bg-gray-200 transition-colors">
                    <input type="checkbox" checked={ccpmInaptitude} onChange={e => setCcpmInaptitude(e.target.checked)} />
                    Inaptitude CCPM
                </label>
             </div>

             {!ccpmInaptitude && (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-[fadeIn_0.3s]">
                    <div>
                        <label className="block text-sm font-bold text-gray-500 mb-1">Course à pied</label>
                        <select 
                            className="w-full p-2 border border-gray-200 bg-white rounded-lg mb-2 text-xs font-bold text-gray-400"
                            value={selectedTestType}
                            onChange={(e) => setSelectedTestType(e.target.value)}
                        >
                            <option value="lucLeger">Luc Léger (Palier)</option>
                            <option value="vameval">VAMEVAL (Palier)</option>
                            <option value="cooper">Demi-Cooper (6 min - Mètres)</option>
                            <option value="2400m">2400m (MM:SS)</option>
                        </select>
                        {selectedTestType === 'lucLeger' && (
                            <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                onChange={e => setRegData({ ...regData, tests: { ...regData.tests, lucLegerPalier: parseFloat(e.target.value) } })}
                                value={regData.tests?.lucLegerPalier || ''}
                            >
                                <option value="" disabled>Palier (ex: 10.5)</option>
                                {generateNumberOptions(1, 15, 0.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        {selectedTestType === 'vameval' && (
                            <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                onChange={e => setRegData({ ...regData, tests: { ...regData.tests, vamevalPalier: parseFloat(e.target.value) } })}
                                value={regData.tests?.vamevalPalier || ''}
                            >
                                <option value="" disabled>Palier (ex: 14.5)</option>
                                {generateNumberOptions(1, 25, 0.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        {selectedTestType === 'cooper' && (
                            <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                onChange={e => setRegData({ ...regData, tests: { ...regData.tests, cooperDistance: parseFloat(e.target.value) } })}
                                value={regData.tests?.cooperDistance || ''}
                            >
                                <option value="" disabled>Distance parcourue (ex: 1400)</option>
                                {generateNumberOptions(1000, 2500, 50).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                        {selectedTestType === '2400m' && (
                            <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                onChange={e => setRegData({ ...regData, tests: { ...regData.tests, run2400mTime: e.target.value } })}
                                value={regData.tests?.run2400mTime || ''}
                            >
                                <option value="" disabled>Temps (ex: 10:30)</option>
                                {generateTimeOptionsMMSS(8, 20, 15).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                            </select>
                        )}
                    </div>
                    <div className="space-y-2">
                         <label className="block text-sm font-bold text-gray-500 mb-1">Musculation</label>
                         <div className="flex gap-2">
                             <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                    onChange={e => setRegData({
                                    ...regData, 
                                    tests: { ...regData.tests, pushups: parseInt(e.target.value) } 
                                })}
                                value={regData.tests?.pushups ?? ''}
                             >
                                <option value="" disabled>Pompes (Max)</option>
                                {generateNumberOptions(0, 120, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                            <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                                    onChange={e => setRegData({
                                    ...regData, 
                                    tests: { ...regData.tests, pullups: parseInt(e.target.value) } 
                                })}
                                value={regData.tests?.pullups ?? ''}
                             >
                                <option value="" disabled>Tractions (Max)</option>
                                {generateNumberOptions(0, 50, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                             </select>
                         </div>
                    </div>
                 </div>
             )}

             <div className="mt-6">
                <h3 className="font-bold text-lg text-military-900 mb-4">Performances Sportives Supplémentaires (Optionnel)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Max Développé Couché (kg)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, benchPress1RM: parseFloat(e.target.value) } })}
                               value={regData.tests?.benchPress1RM || ''}
                        >
                            <option value="" disabled>Poids (kg)</option>
                            {generateNumberOptions(20, 200, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Max Squat (kg)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, squat1RM: parseFloat(e.target.value) } })}
                               value={regData.tests?.squat1RM || ''}
                        >
                            <option value="" disabled>Poids (kg)</option>
                            {generateNumberOptions(20, 250, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Max Soulevé de Terre (kg)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, deadlift1RM: parseFloat(e.target.value) } })}
                               value={regData.tests?.deadlift1RM || ''}
                        >
                            <option value="" disabled>Poids (kg)</option>
                            {generateNumberOptions(20, 300, 2.5).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Max Tractions</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, maxPullups: parseInt(e.target.value) } })}
                               value={regData.tests?.maxPullups ?? ''}
                        >
                            <option value="" disabled>Répétitions</option>
                            {generateNumberOptions(0, 50, 1).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Chrono 10km (HH:MM:SS)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, run10kmTime: e.target.value } })}
                               value={regData.tests?.run10kmTime || ''}
                        >
                            <option value="" disabled>Temps</option>
                            {generateTimeOptionsHHMMSS(30, 90, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Chrono Semi-marathon (HH:MM:SS)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, runSemiMarathonTime: e.target.value } })}
                               value={regData.tests?.runSemiMarathonTime || ''}
                        >
                            <option value="" disabled>Temps</option>
                            {generateTimeOptionsHHMMSS(60, 180, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Chrono 20km (HH:MM:SS)</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl font-bold"
                               onChange={e => setRegData({ ...regData, tests: { ...regData.tests, run20kmTime: e.target.value } })}
                               value={regData.tests?.run20kmTime || ''}
                        >
                            <option value="" disabled>Temps</option>
                            {generateTimeOptionsHHMMSS(60, 180, 60).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>
                </div>
             </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setRegistrationStep('ROLE_SELECTION')} className="flex-1 py-3 text-gray-500 font-bold hover:text-gray-800">Retour</button>
            <button type="submit" className="flex-[2] bg-military-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-action-500 transition-colors uppercase tracking-widest text-sm">
                VALIDER {regData.role === UserRole.MONITOR ? 'MONITEUR' : 'MILITAIRE'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Auth;
