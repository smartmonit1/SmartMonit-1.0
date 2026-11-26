import React, { useState } from 'react';
import {
  UserProfile,
  JobType,
  WorkSchedule,
  Gender,
  UserRole,
  MonitorPermission,
  AuthorityScope
} from '../types';
import { db, DEFAULT_LOCAL_RULES } from '../services/mockDatabase';
import { calculateVMA } from '../utils/biometrics';
import { generateNumberOptions, generateTimeOptionsMMSS, generateTimeOptionsHHMMSS } from '../utils/options';
import { AIR_BASES, MILITARY_UNITS } from '../utils/bases';
import {
  hashPassword,
  verifyPassword,
  validateCnilPassword,
  checkLoginLockout,
  recordFailedLoginAttempt,
  clearLoginAttempts,
  sanitizeText,
  RGPD_POLICY_VERSION,
  RGPD_INFORMATION_NOTICE
} from '../utils/security';
import InstallPWAButton from './InstallPWAButton';

interface AuthProps {
  onLogin: (user: UserProfile) => void;
}

const DEMO_ACCESS_CODES = {
  [UserRole.MONITOR]: 'COACH2026',
  [UserRole.ADMINISTRATOR]: 'PILOTAGE2026'
};

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Login State
  const [loginRole, setLoginRole] = useState<UserRole>(UserRole.USER);
  const [nid, setNid] = useState('');
  const [password, setPassword] = useState('');

  // Register State
  const [registrationStep, setRegistrationStep] = useState<'ROLE_SELECTION' | 'FORM'>('ROLE_SELECTION');
  const [regData, setRegData] = useState<Partial<UserProfile>>({
    dailyForms: [],
    completedSessions: [],
    sessionLogs: [],
    tests: {}
  });
  const [regPassword, setRegPassword] = useState('');
  const [nidConfirm, setNidConfirm] = useState('');
  const [roleCode, setRoleCode] = useState('');
  const [ccpmInaptitude, setCcpmInaptitude] = useState(false);
  const [selectedTestType, setSelectedTestType] = useState('lucLeger');

  // Consentements RGPD / CNIL & Règlement
  const [acceptedRules, setAcceptedRules] = useState(false);
  const [consentHealth, setConsentHealth] = useState(false);
  const [consentAI, setConsentAI] = useState(true);
  const [consentAnalytics, setConsentAnalytics] = useState(true);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showRgpdModal, setShowRgpdModal] = useState(false);

  const pwdValidation = validateCnilPassword(regPassword);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanNid = nid.trim();
    if (!cleanNid) {
      setError('Veuillez saisir votre identifiant.');
      return;
    }

    // Protection anti force-brute CNIL
    const lock = checkLoginLockout(cleanNid);
    if (lock.locked) {
      setError(`Compte temporairement verrouillé par sécurité. Réessayez dans ${lock.remainingSeconds} s.`);
      return;
    }

    setSubmitting(true);
    try {
      const users = db.getUsers();
      const user = users.find((u) => u.nid === cleanNid);

      if (user && (await verifyPassword(password, user))) {
        if (user.role !== loginRole) {
          setError('Le profil sélectionné ne correspond pas à ce compte. Choisissez le bon profil puis réessayez.');
          return;
        }
        clearLoginAttempts(cleanNid);
        db.logAudit({
          actorNid: user.nid,
          actorName: user.name,
          actorRole: user.role,
          serviceId: user.serviceId,
          action: 'LOGIN_SUCCESS',
          details: 'Authentification réussie (vérification cryptographique PBKDF2).'
        });
        onLogin(user);
      } else {
        const res = recordFailedLoginAttempt(cleanNid);
        db.logAudit({
          actorNid: cleanNid,
          actorName: user?.name || 'Inconnu',
          actorRole: user?.role || UserRole.USER,
          serviceId: user?.serviceId,
          action: res.lockedNow ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
          details: res.lockedNow
            ? 'Verrouillage temporaire (60s) après 5 tentatives échouées.'
            : `Échec d'authentification (${res.attemptsLeft} essai(s) restant(s)).`
        });
        setError(
          res.lockedNow
            ? 'Trop de tentatives infructueuses. Compte verrouillé 60 secondes (sécurité CNIL).'
            : `Identifiants invalides (${res.attemptsLeft} tentative(s) restante(s)).`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const quickLogin = (targetNid: string) => {
    const user = db.getUsers().find((u) => u.nid === targetNid);
    if (user) {
      setLoginRole(user.role);
      clearLoginAttempts(targetNid);
      db.logAudit({
        actorNid: user.nid,
        actorName: user.name,
        actorRole: user.role,
        serviceId: user.serviceId,
        action: 'LOGIN_SUCCESS',
        details: 'Connexion démonstration locale.'
      });
      onLogin(user);
    } else {
      setError('Compte démo introuvable.');
    }
  };

  const handlePasswordRecovery = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNid = nid.trim();
    // Garder un message générique sans confirmer si un compte existe.
    if (!/^\d{10}$/.test(cleanNid)) {
      setError('Veuillez saisir un identifiant valide à 10 chiffres.');
      return;
    }
    setSuccessMsg('La réinitialisation n’est pas disponible dans cette démonstration. Contactez l’administrateur de test.');
    setError('');
  };

  const selectRoleAndProceed = (role: UserRole) => {
    setError('');
    setRoleCode('');
    setRegData({
      ...regData,
      role,
      monitorPermission: role === UserRole.MONITOR ? 'MONITEUR' : undefined,
      authorityScope: role === UserRole.ADMINISTRATOR ? 'UNIT' : undefined
    });
    setRegistrationStep('FORM');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const cleanNid = (regData.nid || '').trim();
    if (!/^\d{10}$/.test(cleanNid)) {
      setError('L’identifiant doit comporter exactement 10 chiffres.');
      return;
    }
    if (cleanNid !== nidConfirm.trim()) {
      setError('Les deux saisies de l’identifiant ne correspondent pas.');
      return;
    }
    if (db.getUsers().some((u) => u.nid === cleanNid)) {
      setError('Un compte existe déjà avec cet identifiant. Utilisez la connexion.');
      return;
    }
    if (!pwdValidation.valid) {
      setError('Le mot de passe doit respecter la recommandation CNIL (12 caractères min., majuscule, minuscule, chiffre et caractère spécial).');
      return;
    }
    if (regData.role === UserRole.MONITOR && roleCode.trim().toUpperCase() !== DEMO_ACCESS_CODES[UserRole.MONITOR]) {
      setError(`Code d’accès Moniteur requis (Démo : ${DEMO_ACCESS_CODES[UserRole.MONITOR]}).`);
      return;
    }
    if (regData.role === UserRole.ADMINISTRATOR && roleCode.trim().toUpperCase() !== DEMO_ACCESS_CODES[UserRole.ADMINISTRATOR]) {
      setError(`Code de postage Autorité requis (Démo : ${DEMO_ACCESS_CODES[UserRole.ADMINISTRATOR]}).`);
      return;
    }
    if (!acceptedRules || !consentHealth) {
      setError('Vous devez accepter le règlement intérieur et le consentement explicite RGPD (Art. 9) pour vos données de forme.');
      return;
    }

    setSubmitting(true);
    try {
      const passwordHash = await hashPassword(regPassword);
      const tests = { ...(regData.tests || {}), ccpmInaptitude };
      tests.calculatedVMA = calculateVMA(tests);
      const nowIso = new Date().toISOString();

      const newUser: UserProfile = {
        nid: cleanNid,
        name: sanitizeText(regData.name || ''),
        role: regData.role || UserRole.USER,
        monitorPermission: regData.monitorPermission,
        authorityScope: regData.authorityScope,
        passwordHash, // Hachage PBKDF2-SHA256 uniquement — jamais en clair
        gender: regData.gender || Gender.MALE,
        jobType: regData.jobType || JobType.ADMIN,
        workSchedule: regData.workSchedule || WorkSchedule.OFFICE,
        serviceId: regData.serviceId || 'ear927',
        unit: regData.unit || 'Autre',
        tests,
        dailyForms: [],
        completedSessions: [],
        sessionLogs: [],
        rulesAcceptedAt: nowIso.split('T')[0],
        rgpdConsent: {
          version: RGPD_POLICY_VERSION,
          acceptedAt: nowIso,
          healthDataConsent: consentHealth,
          aiProcessingConsent: consentAI,
          analyticsConsent: consentAnalytics
        },
        createdAt: nowIso
      };

      db.addUser(newUser);
      db.logAudit({
        actorNid: newUser.nid,
        actorName: newUser.name,
        actorRole: newUser.role,
        serviceId: newUser.serviceId,
        action: 'REGISTER',
        details: `Création compte conforme RGPD (${RGPD_POLICY_VERSION}) — IA: ${consentAI ? 'Activée' : 'Opposition Art. 21'}.`
      });
      onLogin(newUser);
    } finally {
      setSubmitting(false);
    }
  };

  // --- LOGIN VIEW ---
  if (!isRegistering) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-military-950 via-military-900 to-military-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-white/10">
          <div className="bg-military-900 p-7 text-center pb-0">
            <img
              src="/icons/icon-192.png"
              alt="SMART MONIT"
              className="w-16 h-16 mx-auto mb-3 rounded-2xl shadow-lg border border-action-500/40"
            />
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-widest">SMART MONIT</h1>
              <span className="rounded-full bg-action-500 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-military-950">Test</span>
            </div>
            <p className="text-[11px] text-military-300 font-semibold uppercase tracking-widest mt-1 mb-4">
              Sport · coaching · espaces
            </p>
            <div className="mb-5">
              <InstallPWAButton variant="card" />
            </div>

            <div className="flex gap-1">
              {[
                { role: UserRole.USER, label: 'Utilisateur' },
                { role: UserRole.MONITOR, label: 'Moniteur' },
                { role: UserRole.ADMINISTRATOR, label: 'Autorité' }
              ].map((t) => (
                <button
                  key={t.role}
                  type="button"
                  aria-pressed={loginRole === t.role}
                  onClick={() => {
                    setLoginRole(t.role);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className={`flex-1 py-3 text-[10px] font-black uppercase tracking-wider transition-colors rounded-t-xl ${
                    loginRole === t.role
                      ? 'bg-white text-military-900'
                      : 'bg-military-800 text-military-300 hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-military-300 mt-3 mb-4" aria-live="polite">
              {loginRole === UserRole.MONITOR
              ? 'Accès moniteur : coaching, programmes, cours et équipements.'
              : loginRole === UserRole.ADMINISTRATOR
              ? 'Accès autorité : pilotage et indicateurs de votre structure.'
              : 'Accès utilisateur : entraînement, réservations et suivi personnel.'}
            </p>
          </div>

          {isRecoveringPassword ? (
            <form onSubmit={handlePasswordRecovery} className="p-7 space-y-5">
              <div className="text-center text-xs font-black text-military-500 uppercase tracking-widest">
                Récupération du mot de passe
              </div>
              {error && <div role="alert" className="text-red-700 text-center text-xs font-bold bg-red-50 border border-red-100 p-3 rounded-xl">{error}</div>}
              {successMsg && <div className="text-emerald-700 text-center text-xs font-bold bg-emerald-50 border border-emerald-100 p-3 rounded-xl">{successMsg}</div>}
              <div>
                <label htmlFor="recovery-nid" className="block text-xs font-bold uppercase text-gray-500 mb-1">Identifiant (10 chiffres)</label>
                <input
                  id="recovery-nid"
                  type="text"
                  maxLength={10}
                  inputMode="numeric"
                  autoComplete="username"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-action-500 outline-none"
                  placeholder="Ex: 0987654321"
                />
              </div>
              <button type="submit" className="w-full bg-military-900 text-white font-black uppercase tracking-wider text-xs py-3.5 rounded-xl hover:bg-military-800 transition-colors shadow-lg">
                Réinitialiser l'accès
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsRecoveringPassword(false);
                  setError('');
                  setSuccessMsg('');
                }}
                className="w-full text-military-600 text-xs hover:underline font-bold"
              >
                Retour à la connexion
              </button>
            </form>
          ) : (
            <form onSubmit={handleLogin} className="p-7 space-y-5">
              <div className="text-center text-xs font-black text-military-500 uppercase tracking-widest">
                Connexion {loginRole === UserRole.MONITOR ? 'Moniteur' : loginRole === UserRole.ADMINISTRATOR ? 'Autorité' : 'Utilisateur'}
              </div>

              {error && <div role="alert" className="text-red-700 text-center text-xs font-bold bg-red-50 border border-red-100 p-3 rounded-xl">{error}</div>}

              <div>
                <label htmlFor="login-nid" className="block text-xs font-bold uppercase text-gray-500 mb-1">Identifiant du compte</label>
                <input
                  id="login-nid"
                  type="text"
                  maxLength={10}
                  inputMode="numeric"
                  value={nid}
                  onChange={(e) => setNid(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-action-500 outline-none"
                  placeholder="10 chiffres"
                  autoComplete="username"
                />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-bold uppercase text-gray-500 mb-1">Mot de passe</label>
                <input
                  id="login-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:ring-2 focus:ring-action-500 outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-action-500 text-military-950 font-black uppercase tracking-widest text-xs py-4 rounded-xl hover:bg-action-400 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {submitting ? 'Vérification...' : 'Connexion Sécurisée'}
              </button>

              <div className="flex justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsRecoveringPassword(true);
                    setError('');
                    setSuccessMsg('');
                  }}
                  className="text-military-600 text-xs hover:underline font-bold"
                >
                  Mot de passe oublié ?
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegistering(true);
                    setRegistrationStep('ROLE_SELECTION');
                    setError('');
                  }}
                  className="text-military-900 text-xs hover:underline font-black"
                >
                  Créer un compte
                </button>
              </div>
            </form>
          )}

          {/* Badge Conformité RGPD + Accès rapide démo */}
          <div className="p-5 bg-military-50 border-t border-military-100 space-y-3">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1">
                <span className="material-icons text-xs">science</span> Version démo — données fictives uniquement
              </span>
              <button
                type="button"
                onClick={() => setShowRgpdModal(true)}
                className="font-bold text-military-700 underline hover:text-action-700"
              >
                Notice données personnelles
              </button>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-military-500 text-center">
              Accès rapide aux profils de démonstration
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => quickLogin('0987654321')}
                className="p-2.5 bg-white hover:bg-action-50 border border-military-200 hover:border-action-500 rounded-xl text-center transition-all"
              >
                <span className="material-icons text-military-700 text-lg block">directions_run</span>
                <span className="text-[10px] font-black text-military-900 block">Utilisateur</span>
                <span className="text-[9px] text-gray-400 block truncate">Profil de test</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('1234567890')}
                className="p-2.5 bg-white hover:bg-action-50 border border-military-200 hover:border-action-500 rounded-xl text-center transition-all"
              >
                <span className="material-icons text-action-600 text-lg block">sports</span>
                <span className="text-[10px] font-black text-military-900 block">Moniteur</span>
                <span className="text-[9px] text-gray-400 block truncate">Profil de test</span>
              </button>
              <button
                type="button"
                onClick={() => quickLogin('1122334455')}
                className="p-2.5 bg-white hover:bg-action-50 border border-military-200 hover:border-action-500 rounded-xl text-center transition-all"
              >
                <span className="material-icons text-airforce-700 text-lg block">admin_panel_settings</span>
                <span className="text-[10px] font-black text-military-900 block">Autorité</span>
                <span className="text-[9px] text-gray-400 block truncate">Profil de test</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Notice CNIL */}
        {showRgpdModal && <RgpdNoticeModal onClose={() => setShowRgpdModal(false)} />}
      </div>
    );
  }

  // --- STEP 1: ROLE SELECTION ---
  if (registrationStep === 'ROLE_SELECTION') {
    return (
      <div className="min-h-screen bg-military-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl max-w-lg w-full p-8 text-center animate-[fadeIn_0.3s] border border-military-100">
          <h2 className="text-2xl font-black text-military-900 mb-2 uppercase">Création de compte</h2>
          <p className="text-gray-500 text-sm mb-8">
            Choisissez l’espace correspondant à votre rôle. Les accès moniteur et autorité incluent aussi un espace personnel.
          </p>

          <div className="grid gap-4">
            <button
              onClick={() => selectRoleAndProceed(UserRole.USER)}
              className="group bg-white border-2 border-military-100 hover:border-action-500 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-military-100 rounded-xl flex items-center justify-center group-hover:bg-action-500 transition-colors">
                  <span className="material-icons text-military-700 group-hover:text-white text-2xl">badge</span>
                </div>
                <div>
                  <h3 className="font-black text-base text-military-900 uppercase">Utilisateur</h3>
                  <p className="text-xs text-gray-500">Programmes, séances, réservations et suivi personnel</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => selectRoleAndProceed(UserRole.MONITOR)}
              className="group bg-white border-2 border-military-100 hover:border-military-800 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-military-100 rounded-xl flex items-center justify-center group-hover:bg-military-900 transition-colors">
                  <span className="material-icons text-military-700 group-hover:text-white text-2xl">sports</span>
                </div>
                <div>
                  <h3 className="font-black text-base text-military-900 uppercase">Moniteur</h3>
                  <p className="text-xs text-gray-500">Coaching, programmes, planning des cours, installations et matériel</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => selectRoleAndProceed(UserRole.ADMINISTRATOR)}
              className="group bg-white border-2 border-military-100 hover:border-airforce-700 p-5 rounded-2xl shadow-sm hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-military-100 rounded-xl flex items-center justify-center group-hover:bg-airforce-700 transition-colors">
                  <span className="material-icons text-military-700 group-hover:text-white text-2xl">admin_panel_settings</span>
                </div>
                <div>
                  <h3 className="font-black text-base text-military-900 uppercase">Autorité</h3>
                  <p className="text-xs text-gray-500">Pilotage des structures et indicateurs agrégés et anonymisés</p>
                </div>
              </div>
            </button>
          </div>

          <button
            onClick={() => setIsRegistering(false)}
            className="mt-8 text-gray-500 hover:text-military-900 text-xs font-black uppercase tracking-wider"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  // --- STEP 2: REGISTRATION FORM ---
  const serviceRules = db.getServiceById(regData.serviceId)?.localRules || DEFAULT_LOCAL_RULES;

  return (
    <div className="min-h-screen bg-military-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full p-6 md:p-8 my-8 animate-[slideUp_0.3s] border border-military-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl md:text-2xl font-black text-military-900 uppercase">
            Création — {regData.role === UserRole.ADMINISTRATOR ? 'Autorité' : regData.role === UserRole.MONITOR ? 'Moniteur' : 'Utilisateur'}
          </h2>
          <span className="bg-military-900 text-action-400 text-[10px] font-black px-3 py-1 rounded-full uppercase">
            {regData.role}
          </span>
        </div>

        {error && <div className="mb-4 text-red-700 bg-red-50 border border-red-200 p-3 rounded-xl text-xs font-bold">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-6">
          {(regData.role === UserRole.MONITOR || regData.role === UserRole.ADMINISTRATOR) && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-black text-xs uppercase">
                <span className="material-icons text-base">security</span>
                Validation hiérarchique / Habilitation
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-amber-800 mb-1">
                    Code d'habilitation (Démo : {DEMO_ACCESS_CODES[regData.role]})
                  </label>
                  <input
                    required
                    type="text"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    placeholder={DEMO_ACCESS_CODES[regData.role]}
                    className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-sm"
                  />
                </div>
                {regData.role === UserRole.MONITOR ? (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">Responsabilités du moniteur</label>
                    <select
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-sm"
                      value={regData.monitorPermission || 'MONITEUR'}
                      onChange={(e) => setRegData({ ...regData, monitorPermission: e.target.value as MonitorPermission })}
                    >
                      <option value="CHEF_CELLULE">Gestion de l’équipe</option>
                      <option value="RESP_MATERIEL">Gestion des installations et du matériel</option>
                      <option value="MONITEUR">Coaching et programmes</option>
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-amber-800 mb-1">Périmètre de gestion</label>
                    <select
                      className="w-full p-2.5 bg-white border border-amber-300 rounded-xl font-bold text-sm"
                      value={regData.authorityScope || 'UNIT'}
                      onChange={(e) => setRegData({ ...regData, authorityScope: e.target.value as AuthorityScope })}
                    >
                      <option value="UNIT">Équipe</option>
                      <option value="BASE">Structure</option>
                      <option value="AAE">Toutes les structures</option>
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Identité & Mot de passe CNIL */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Identifiant (10 chiffres) *</label>
              <input
                required
                type="text"
                maxLength={10}
                placeholder="Ex: 1029384756"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                onChange={(e) => setRegData({ ...regData, nid: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Confirmer l’identifiant *</label>
              <input
                required
                type="text"
                maxLength={10}
                placeholder="10 chiffres"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                onChange={(e) => setNidConfirm(e.target.value)}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Grade, Nom et Prénom *</label>
              <input
                required
                type="text"
                placeholder="Ex: SGT DUPONT Marie"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                onChange={(e) => setRegData({ ...regData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Mot de passe robuste (CNIL) *</label>
              <input
                required
                type="password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="12+ car. (Maj, min, chiffre, spécial)"
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
              />
              {/* Indicateur CNIL */}
              <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-bold">
                {[
                  { ok: pwdValidation.checks.minLength, txt: '12+ car.' },
                  { ok: pwdValidation.checks.hasUpper, txt: 'Maj' },
                  { ok: pwdValidation.checks.hasLower, txt: 'Min' },
                  { ok: pwdValidation.checks.hasDigit, txt: 'Chiffre' },
                  { ok: pwdValidation.checks.hasSpecial, txt: 'Spécial' }
                ].map((c) => (
                  <span
                    key={c.txt}
                    className={`px-2 py-0.5 rounded ${c.ok ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-400'}`}
                  >
                    {c.ok ? '✓' : '•'} {c.txt}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Genre *</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                required
                onChange={(e) => setRegData({ ...regData, gender: e.target.value as Gender })}
              >
                <option value="">Sélectionner</option>
                <option value={Gender.MALE}>Homme</option>
                <option value={Gender.FEMALE}>Femme</option>
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Affectation & Métier */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Base d'affectation *</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                required
                onChange={(e) => setRegData({ ...regData, serviceId: e.target.value })}
              >
                <option value="">Sélectionner une base</option>
                {AIR_BASES.map((base) => <option key={base.id} value={base.id}>{base.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Unité *</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                required
                onChange={(e) => setRegData({ ...regData, unit: e.target.value })}
              >
                <option value="">Sélectionner une unité</option>
                {MILITARY_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Profil Métier PPO *</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                required
                onChange={(e) => setRegData({ ...regData, jobType: e.target.value as JobType })}
              >
                <option value="">Sélectionner</option>
                {Object.values(JobType).map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Rythme / Horaires *</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold"
                required
                onChange={(e) => setRegData({ ...regData, workSchedule: e.target.value as WorkSchedule })}
              >
                <option value="">Sélectionner</option>
                {Object.values(WorkSchedule).map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Tests Physiques */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-xs uppercase text-military-900">Tests de condition physique</h3>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-600 cursor-pointer bg-gray-100 px-3 py-1.5 rounded-xl">
                <input type="checkbox" checked={ccpmInaptitude} onChange={(e) => setCcpmInaptitude(e.target.checked)} />
                Résultat à réévaluer
              </label>
            </div>
            {!ccpmInaptitude && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <select
                    className="w-full p-2.5 border border-gray-200 bg-white rounded-xl mb-2 text-xs font-bold text-military-700"
                    value={selectedTestType}
                    onChange={(e) => setSelectedTestType(e.target.value)}
                  >
                    <option value="lucLeger">Luc Léger (Palier)</option>
                    <option value="vameval">VAMEVAL (Palier)</option>
                    <option value="cooper">Demi-Cooper (6 min — Mètres)</option>
                    <option value="2400m">Course 2400 m (MM:SS)</option>
                    <option value="10km">10 km (HH:MM:SS)</option>
                  </select>
                  {selectedTestType === 'lucLeger' && (
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, lucLegerPalier: parseFloat(e.target.value) } })} value={regData.tests?.lucLegerPalier || ''}>
                      <option value="">Palier Luc Léger</option>
                      {generateNumberOptions(1, 15, 0.5).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {selectedTestType === 'vameval' && (
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, vamevalPalier: parseFloat(e.target.value) } })} value={regData.tests?.vamevalPalier || ''}>
                      <option value="">Palier VAMEVAL</option>
                      {generateNumberOptions(1, 25, 0.5).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {selectedTestType === 'cooper' && (
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, cooperDistance: parseFloat(e.target.value) } })} value={regData.tests?.cooperDistance || ''}>
                      <option value="">Distance (m)</option>
                      {generateNumberOptions(1000, 2500, 50).map((opt) => <option key={opt} value={opt}>{opt} m</option>)}
                    </select>
                  )}
                  {selectedTestType === '2400m' && (
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, run2400mTime: e.target.value } })} value={regData.tests?.run2400mTime || ''}>
                      <option value="">Temps 2400m</option>
                      {generateTimeOptionsMMSS(8, 20, 15).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {selectedTestType === '10km' && (
                    <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, run10kmTime: e.target.value } })} value={regData.tests?.run10kmTime || ''}>
                      <option value="">Temps 10 km</option>
                      {generateTimeOptionsHHMMSS(30, 90, 60).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, pushups: parseInt(e.target.value, 10) } })} value={regData.tests?.pushups ?? ''}>
                    <option value="">Pompes</option>
                    {generateNumberOptions(0, 120, 1).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, pullups: parseInt(e.target.value, 10) } })} value={regData.tests?.pullups ?? ''}>
                    <option value="">Tractions</option>
                    {generateNumberOptions(0, 50, 1).map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, benchPress1RM: parseFloat(e.target.value) } })} value={regData.tests?.benchPress1RM || ''}>
                    <option value="">1RM DC (kg)</option>
                    {generateNumberOptions(20, 200, 2.5).map((opt) => <option key={opt} value={opt}>{opt} kg</option>)}
                  </select>
                  <select className="p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm" onChange={(e) => setRegData({ ...regData, tests: { ...regData.tests, squat1RM: parseFloat(e.target.value) } })} value={regData.tests?.squat1RM || ''}>
                    <option value="">1RM Squat (kg)</option>
                    {generateNumberOptions(20, 250, 2.5).map((opt) => <option key={opt} value={opt}>{opt} kg</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Consentements RGPD / CNIL Granulaires (Art. 6, 7, 9 & 21) */}
          <div className="bg-military-50 p-4 rounded-2xl border border-military-200 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-black uppercase text-military-900 flex items-center gap-1.5">
                <span className="material-icons text-sm text-emerald-700">verified_user</span>
                Consentements RGPD & CNIL (Version {RGPD_POLICY_VERSION})
              </span>
              <button
                type="button"
                onClick={() => setShowRgpdModal(true)}
                className="text-[11px] font-black text-military-700 underline hover:text-action-700"
              >
                Lire la notice complète
              </button>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-military-800">
              <input type="checkbox" checked={acceptedRules} onChange={(e) => setAcceptedRules(e.target.checked)} className="mt-0.5 w-4 h-4 accent-military-900" />
              <span>
                <strong>(Obligatoire)</strong> J'accepte le{' '}
                <button type="button" onClick={() => setShowRulesModal(true)} className="font-black underline">
                  règlement intérieur des installations sportives
                </button>.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-military-800">
              <input type="checkbox" checked={consentHealth} onChange={(e) => setConsentHealth(e.target.checked)} className="mt-0.5 w-4 h-4 accent-military-900" />
              <span>
                <strong>(Art. 9 RGPD — Obligatoire)</strong> Je consens explicitement au traitement de mes auto-évaluations quotidiennes (sommeil, fatigue, stress, douleurs) pour l'adaptation sécurisée de mes séances (conservation 12 mois glissants).
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-military-700">
              <input type="checkbox" checked={consentAI} onChange={(e) => setConsentAI(e.target.checked)} className="mt-0.5 w-4 h-4 accent-military-900" />
              <span>
                <strong>(Optionnel — Art. 21)</strong> J'autorise l'assistance IA générative sur données pseudonymisées (sans identifiant ni nom). Si décoché, le moteur algorithmique local sera utilisé.
              </span>
            </label>

            <label className="flex items-start gap-2.5 cursor-pointer text-xs text-military-700">
              <input type="checkbox" checked={consentAnalytics} onChange={(e) => setConsentAnalytics(e.target.checked)} className="mt-0.5 w-4 h-4 accent-military-900" />
              <span>
                <strong>(Optionnel)</strong> J'autorise l'intégration de mes indicateurs dans les statistiques collectives anonymisées (k-anonymat CNIL ≥ 5).
              </span>
            </label>
          </div>

          <div className="flex gap-4 pt-2">
            <button type="button" onClick={() => setRegistrationStep('ROLE_SELECTION')} className="flex-1 py-3.5 text-gray-500 font-bold text-xs uppercase hover:text-gray-800">
              Retour
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-[2] bg-military-900 text-white font-black py-4 rounded-xl shadow-lg hover:bg-action-500 hover:text-military-950 transition-colors uppercase tracking-widest text-xs disabled:opacity-50"
            >
              {submitting ? 'Chiffrement & création...' : 'Valider l\'inscription'}
            </button>
          </div>
        </form>
      </div>

      {showRulesModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center pb-3 border-b mb-4">
              <h3 className="font-black uppercase text-military-900">Règlement des Installations</h3>
              <button onClick={() => setShowRulesModal(false)}><span className="material-icons">close</span></button>
            </div>
            <div className="overflow-y-auto text-sm text-gray-700 whitespace-pre-line flex-grow pr-2">
              {serviceRules}
            </div>
            <button
              onClick={() => {
                setAcceptedRules(true);
                setShowRulesModal(false);
              }}
              className="mt-5 w-full py-3 bg-military-900 text-white font-black uppercase text-xs rounded-xl"
            >
              J'ai lu et j'accepte
            </button>
          </div>
        </div>
      )}

      {showRgpdModal && <RgpdNoticeModal onClose={() => setShowRgpdModal(false)} />}
    </div>
  );
};

const RgpdNoticeModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-black/75 z-[80] flex items-center justify-center p-4" onClick={onClose}>
    <div className="bg-white rounded-3xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col shadow-2xl animate-[zoomIn_0.2s]" onClick={(e) => e.stopPropagation()}>
      <div className="flex justify-between items-center pb-3 border-b mb-4">
        <div>
          <h3 className="font-black uppercase text-military-900">Notice d'Information RGPD & CNIL</h3>
          <p className="text-[11px] text-gray-500 font-bold">Version {RGPD_POLICY_VERSION}</p>
        </div>
        <button onClick={onClose}><span className="material-icons">close</span></button>
      </div>
      <div className="overflow-y-auto custom-scrollbar pr-2 space-y-4 text-xs text-gray-700 leading-relaxed">
        <div>
          <h4 className="font-black uppercase text-military-900 mb-1">1. Responsable de traitement & DPO</h4>
          <p><strong>Responsable :</strong> {RGPD_INFORMATION_NOTICE.controller}</p>
          <p><strong>Contact DPO :</strong> {RGPD_INFORMATION_NOTICE.dpo}</p>
        </div>
        <div>
          <h4 className="font-black uppercase text-military-900 mb-1">2. Finalités & Bases légales</h4>
          <ul className="list-disc pl-5 space-y-1">
            {RGPD_INFORMATION_NOTICE.purposes.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
          <ul className="list-disc pl-5 space-y-1 mt-2 text-military-700 font-medium">
            {RGPD_INFORMATION_NOTICE.legalBasis.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-black uppercase text-military-900 mb-1">3. Intelligence Artificielle & Pseudonymisation</h4>
          <p>{RGPD_INFORMATION_NOTICE.aiPrivacy}</p>
        </div>
        <div>
          <h4 className="font-black uppercase text-military-900 mb-1">4. Durées de conservation (Purge automatique)</h4>
          <ul className="list-disc pl-5 space-y-1">
            {RGPD_INFORMATION_NOTICE.retention.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
        <div>
          <h4 className="font-black uppercase text-military-900 mb-1">5. Vos Droits (Art. 15 à 21 RGPD)</h4>
          <p>
            Vous pouvez à tout moment depuis votre onglet <strong>Profil → Confidentialité & RGPD</strong> exercer vos droits d'accès, de rectification, de portabilité (export JSON), d'opposition au traitement IA, et d'effacement de votre compte, ou saisir la CNIL (www.cnil.fr).
          </p>
        </div>
      </div>
      <button onClick={onClose} className="mt-5 w-full py-3 bg-military-900 text-white font-black uppercase text-xs rounded-xl">
        Fermer
      </button>
    </div>
  </div>
);

export default Auth;
