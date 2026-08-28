#!/usr/bin/env node
/* Contrôle des diacritiques françaises manquantes.
 *
 * Deux approches automatiques ont été écartées avant celle-ci :
 *   - comparer chaque mot à un dictionnaire français : noyé sous les faux
 *     positifs, le corpus mêlant français et anglais (« different »,
 *     « complete », « precision » sont des mots anglais légitimes ici) ;
 *   - signaler tout mot dont la variante accentuée existe ailleurs dans le
 *     corpus : noyé sous les couples verbe/participe (« passe »/« passé »,
 *     « analyse »/« analysé »), tous deux valides.
 *
 * Retenu : une liste de mots dont la forme nue n'existe ni en français ni en
 * anglais. Peu de faux positifs, donc exploitable ; la contrepartie est que la
 * liste est incomplète par construction et se complète quand une coquille
 * échappe au contrôle.
 *
 * Les blocs <details> de quiz sont rédigés en anglais : hors périmètre. La
 * prose qui les entoure est contrôlée, y compris dans Practice_Questions.html.
 * Sans dépendance. Requiert Node >= 20.11 (pour import.meta.dirname).
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

const WORDS = `
acces achevee activee adaptee agregation amenee analysee annotee anticipee
anticipe anticipes appelee appliquee apres arretee arriere associee augmentee
automatisee avancee avancees barriere bibliotheque cablee calculee categorie
coherence coherent coherente collee combinee commencee comparee complementaire
completee completude comprehension compressee concue concretement conditionnee
configuree confiee connaitre consequence consideree consommee controle
controlee controler cout couts creee criteres declaree declenchee decoupee
decrite decrites dedie dediee dediees definie deleguer deleguee deleguees
demarrage dependance dependances deploiement deployee derniere dernieres
desactivee detaillee determinee deterministe deterministes developpee
developpeur difficulte donnee donnees ecart ecarts echantillonnage
echantillonnee echec echecs econome economie ecrire ecrit ecrite ecriture
elevee elevees eleves eliminee eloignee emises encadree energie enonce enonces
enrichie enrichies entiere entierement entree entrees enumeree equipe equipes
espere etablie etablir etape etapes etat etats etendue etiquetee etudiee
evaluee evenement evenements evidemment evitee executee executions exigee
expliquee exposee exprimee extremement fenetre fenetres fiabilite fidele figee
fonctionnalite fonctionnalites forcee formatee frequence frequences
generalement generee generer gerable geree gerer guidee heritee heterogene
heterogenes hierarchie homogene homogenes identifiee immediatement implementee
imposee incrementale independante indexee indiquee inferieur inferieure
ingenierie initialisee integralite integree integrer interet intermediaire
intermediaires interrogee introduite irreversible isolee legere legerement
liberee limitee liee liees lisibilite litteralement maitrise maitrisee
mecanisme mecanismes memoire memoires mentionnee mesuree methode methodes
modele modeles modifiee necessaire necessaires necessite necessitent
negligeable nommee normalisee numerotee observee obtenue operationnelle
optimisee ordonnee organisee orientee parallele parallelisme parametre
parametres partagee particuliere penalite pensee periode periodes persistee
piege pieges planifiee ponderation ponderee possibilite precedemment precedent
precedente precis precisement preferee premiere prerequis presentee preservee
prevue priorite priorites privilegiee probabilite problematique programmee
prononcee proposee protegee prouvee publiee qualite quantifiee realisee realite
recente recentes recherchee recommandee reconnue redigee reduite reelle
reellement referencee reformulee regenere regle regles regroupee reguliere
regulierement rejetee relevee remplacee rencontree renforcee renseignee repetee
repetition repliquee reponse reponses representee requete requetes reservee
resolue respectee resultat resultats resumee retenue reussite reutilisable
reutilisation reutilisee revelee revisee schematisee securite selectionnee
separee severite signalee simplifiee specialisee specifie specifiee specifier
specifique specifiques stabilite stockee strategie strategies structuree
superieur superieure supplementaire supplementaires supportee supprimee
surchargee synthetisee systematique systeme systemes telemetrie tentee terminee
testee theorique tracabilite traitee transferee transformee typiquement
ulterieure unifiee utilisee validee variabilite verifiee verifier verite
verites versionnee visee
`
  .split(/\s+/)
  .filter(Boolean)
  .map((word) => [word, new RegExp(`\\b${word}\\b`, 'i')]);

const files = fs.readdirSync(ROOT).filter((f) => /\.(html|md|js|css)$/.test(f)).sort();

let hits = 0;
for (const file of files) {
  const lines = fs.readFileSync(path.join(ROOT, file), 'utf8').split(/\r?\n/);
  // Les blocs quiz sont rédigés en anglais : hors périmètre. On les suit par
  // profondeur d'ouverture plutôt que d'exclure des fichiers entiers, sinon la
  // prose française de Practice_Questions.html — ses titres de section et sa
  // note de fidélité — n'est jamais contrôlée.
  let depth = 0;
  lines.forEach((line, index) => {
    const opens = (line.match(/<details\b/g) || []).length;
    const closes = (line.match(/<\/details>/g) || []).length;
    const insideBefore = depth > 0;
    depth += opens - closes;
    if (insideBefore || opens > 0) return;

    const prose = line
      .replace(/<code>[\s\S]*?<\/code>/g, ' ')
      .replace(/https?:\/\/\S+/g, ' ')
      .replace(/\b[\w./-]+\.(html|js|css|md|json|mjs|py|pdf)\b/g, ' ')
      .replace(/\b(?:id|href)="#?[\w-]*"/g, ' ');
    for (const [word, pattern] of WORDS) {
      if (!pattern.test(prose)) continue;
      console.log(`${file}:${index + 1} — « ${word} » : ${line.trim().replace(/\s+/g, ' ').slice(0, 110)}`);
      hits++;
    }
  });
}

console.log(`Diacritiques : ${hits} occurrence(s) sans accent.`);
process.exit(hits ? 1 : 0);
