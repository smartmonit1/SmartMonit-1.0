import React from 'react';
import { Program, UserProfile } from '../types';
import ProgramBuilderStudio from './program-builder/ProgramBuilderStudio';

interface Props {
  onClose: () => void;
  existingProgram?: Program;
  defaultTargetUserId?: string;
  user: UserProfile;
}

/**
 * Point d'entrée unique du Module de Création de Programmes EPMS (SMART MONIT 1.0).
 * Conserve la signature exacte utilisée par DashboardMonitor et LibraryMonitor.
 */
const ProgramBuilder: React.FC<Props> = (props) => {
  return <ProgramBuilderStudio {...props} />;
};

export default ProgramBuilder;
