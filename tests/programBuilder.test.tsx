import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ProgramBuilderStudio from '../components/program-builder/ProgramBuilderStudio';
import { ToastProvider } from '../components/ToastProvider';
import { Gender, JobType, UserProfile, UserRole, WorkSchedule } from '../types';

const mockMonitor: UserProfile = {
  nid: '9999999999',
  name: 'ADC Martin (EPMS)',
  role: UserRole.MONITOR,
  monitorPermission: 'CHEF_CELLULE',
  serviceId: 'ba118',
  gender: Gender.MALE,
  jobType: JobType.FUSCO,
  workSchedule: WorkSchedule.OFFICE,
  tests: {
    calculatedVMA: 16,
    benchPress1RM: 95,
    squat1RM: 120
  },
  dailyForms: []
};

const renderStudio = () =>
  render(
    <ToastProvider>
      <ProgramBuilderStudio user={mockMonitor} onClose={vi.fn()} />
    </ToastProvider>
  );

describe('ProgramBuilderStudio — Flux complets éditeur EPMS', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('affiche la structure ternaire PIA 7.1.1 par défaut et permet d’ajouter un exercice puis d’appliquer la saisie rapide', () => {
    renderStudio();

    // Structure ternaire PIA présente par défaut
    expect(screen.getAllByText(/Échauffement/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Corps de séance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Retour au calme/i).length).toBeGreaterThan(0);

    // Ajoute un exercice (ex: Développé Couché Barre) depuis le tiroir d'exercices
    const searchInput = screen.getByPlaceholderText(/Recherche instantanée/i);
    fireEvent.change(searchInput, { target: { value: 'Développé Couché' } });

    const exoCard = screen.getByText(/Développé Couché Barre/i);
    fireEvent.click(exoCard);

    // Le champ de saisie rapide pour l'exercice ajouté est visible
    const quickInput = screen.getByLabelText(/Saisie rapide pour Développé Couché Barre/i);
    fireEvent.change(quickInput, { target: { value: "4x8 @75% r2'" } });

    // Aperçu temps réel en français avant validation
    expect(screen.getByText(/4 séries de 8 à 75 % du 1RM/i)).toBeInTheDocument();

    // Validation de la saisie rapide
    fireEvent.click(screen.getByRole('button', { name: /Appliquer/i }));
    expect((quickInput as HTMLInputElement).value).toBe('');
  });

  it('interprète une séance fractionnée VMA "3x10\' @80% VMA r2\'" et gère Undo/Redo après duplication de bloc', () => {
    renderStudio();

    // Ajouter un exercice de course
    const searchInput = screen.getByPlaceholderText(/Recherche instantanée/i);
    fireEvent.change(searchInput, { target: { value: 'Fractionné' } });
    const runExo = screen.getAllByText(/Fractionné/i)[0];
    fireEvent.click(runExo);

    // Saisie rapide fractionné VMA
    const quickInputs = screen.getAllByPlaceholderText(/Saisie rapide/i);
    fireEvent.change(quickInputs[0], { target: { value: "3x10' @80% VMA r2'" } });
    expect(screen.getByText(/3 fois 10 min à 80 % de la VMA, récup 2:00/i)).toBeInTheDocument();

    // Duplication d'un bloc puis Undo
    const dupButtons = screen.getAllByTitle('Dupliquer ce bloc');
    const initialCount = dupButtons.length;
    fireEvent.click(dupButtons[0]);
    expect(screen.getAllByTitle('Dupliquer ce bloc').length).toBe(initialCount + 1);

    const undoBtn = screen.getByRole('button', { name: /Annuler/i });
    fireEvent.click(undoBtn);
    expect(screen.getAllByTitle('Dupliquer ce bloc').length).toBe(initialCount);
  });

  it('signale clairement l’absence de 1RM / VMA dans la Prévisualisation Militaire sans jamais inventer de valeur', () => {
    renderStudio();

    // Ajoute un exercice de musculation (qui a 75% 1RM par défaut)
    const searchInput = screen.getByPlaceholderText(/Recherche instantanée/i);
    fireEvent.change(searchInput, { target: { value: 'Développé Couché' } });
    fireEvent.click(screen.getByText(/Développé Couché Barre/i));

    // Ouvre la prévisualisation en tant que militaire
    fireEvent.click(screen.getByRole('button', { name: /Vue Militaire/i }));
    expect(screen.getByRole('dialog', { name: /Prévisualisation en tant que militaire/i })).toBeInTheDocument();

    // Sélectionne l'archétype sans 1RM ni VMA (NID 0000000003)
    const select = screen.getByLabelText(/Militaire ou profil type/i);
    fireEvent.change(select, { target: { value: '0000000003' } });

    expect(screen.getByText(/Références manquantes — Aucune valeur inventée/i)).toBeInTheDocument();
  });

  it('affiche le panneau Analytique & Contrôle doctrinal PIA 7.1.1', () => {
    renderStudio();

    fireEvent.click(screen.getByRole('button', { name: /Analyse & PIA/i }));
    expect(screen.getByText(/Contrôle doctrinal PIA 7\.1\.1/i)).toBeInTheDocument();
    expect(screen.getByText(/Muscles sollicités/i)).toBeInTheDocument();
  });
});
