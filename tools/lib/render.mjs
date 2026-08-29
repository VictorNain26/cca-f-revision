/* Conversion des cours Markdown en fragments HTML au format du site.
 * Le défaut que ce module sert à attraper : le corpus (`courses/`) porte des
 * commentaires <!-- src:… --> et <!-- owns:… --> lus par check-courses.mjs
 * pour la traçabilité et l'anti-redite (voir courses.mjs). Un rendu Markdown
 * générique les laisserait fuiter tels quels dans la page publiée — ce
 * module les retire avant le parsing, et découpe le reste par titre de
 * niveau 2 en attribuant les ancres s1, s2… dans l'ordre, comme le fait déjà
 * D0_API_Fundamentals.html à la main.
 */
import MarkdownIt from 'markdown-it';
import container from 'markdown-it-container';

/* [\s\S]*? plutôt que .*? : un <!-- src:… --> replié sur deux lignes (probable
 * dès que les sources s'allongent) doit rester couvert — . ne matche jamais un
 * saut de ligne, avec ou sans le drapeau m, et laisserait fuir le commentaire
 * tel quel dans la page publiée. */
const METADATA_COMMENT = /^[ \t]*<!--\s*(?:ts:[^|>]*\|\s*)?(?:src|owns):[\s\S]*?-->[ \t]*\n?/gm;

const md = new MarkdownIt({ html: true, typographer: false });
for (const name of ['exam-tip', 'key-concept', 'anti-pattern']) md.use(container, name);

/* Retire les commentaires de traçabilité avant tout parsing : laissés en
 * place, `html: true` les recopierait tels quels dans le fragment rendu. */
function stripMetadataComments(markdown) {
  return markdown.replace(METADATA_COMMENT, '');
}

/* po4a traduit chaque puce d'une liste comme un bloc distinct et les réécrit
 * séparées par une ligne vide. Markdown y voit une liste « lâche » là où
 * courses/en/ portait une liste serrée : la page française enveloppe alors
 * chaque puce dans un <p> que sa jumelle anglaise n'a pas, pour un texte
 * identique. Douze puces du corpus étaient dans ce cas, sur D1 et D3.
 *
 * La différence ne porte aucune intention d'auteur — elle naît du découpage
 * du catalogue — donc on la normalise ici, au seul endroit où les deux
 * langues deviennent du HTML, plutôt que d'ajuster chaque cours à la main.
 *
 * Ne sont resserrées que les puces dont le paragraphe est l'unique bloc :
 * une puce qui en porte réellement deux les garde séparés, sinon son texte
 * se retrouverait abouté. C'est exactement la notion de liste serrée de
 * markdown-it, qui rend ces paragraphes « hidden ». */
function tightenListItems(tokens) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type !== 'list_item_open') continue;

    const depth = tokens[i].level;
    const blocks = [];
    for (let j = i + 1; j < tokens.length && !(tokens[j].type === 'list_item_close' && tokens[j].level === depth); j++) {
      if (tokens[j].level === depth + 1 && tokens[j].nesting === 1) blocks.push(j);
    }

    if (blocks.length !== 1) continue;
    const open = tokens[blocks[0]];
    if (open.type !== 'paragraph_open') continue;

    const close = tokens.find((t, k) => k > blocks[0] && t.type === 'paragraph_close' && t.level === open.level);
    open.hidden = true;
    if (close) close.hidden = true;
  }
  return tokens;
}

export function renderCourse(markdown) {
  const tokens = tightenListItems(md.parse(stripMetadataComments(markdown), {}));

  let title = '';
  const sections = [];
  const leadTokens = [];
  let current = null;
  let sectionCount = 0;

  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];

    /* Une paire heading_open/heading_close encadre toujours exactement un
     * token inline (le texte du titre) : on consomme les trois d'un coup
     * pour que ce texte n'atterrisse pas aussi dans le corps de la section. */
    if (token.type === 'heading_open' && token.tag === 'h1' && !title) {
      title = md.renderer.renderInline(tokens[i + 1].children, md.options, {}).trim();
      i += 2;
      continue;
    }

    if (token.type === 'heading_open' && token.tag === 'h2') {
      sectionCount += 1;
      current = {
        id: `s${sectionCount}`,
        heading: md.renderer.renderInline(tokens[i + 1].children, md.options, {}).trim(),
        tokens: [],
      };
      sections.push(current);
      i += 2;
      continue;
    }

    if (current) {
      current.tokens.push(token);
    } else {
      /* Le contenu qui précède le premier ## — l'introduction du cours,
       * quand elle existe — n'a jusqu'ici jamais eu d'endroit où atterrir :
       * ni section, ni titre. Le perdre ici le perd pour de bon, sans que le
       * contrôle de fidélité (qui compare la page à son propre rendu) puisse
       * le voir puisque le rendu est ce qui perd le contenu. */
      leadTokens.push(token);
    }
  }

  return {
    title,
    lead: md.renderer.render(leadTokens, md.options, {}).trim(),
    sections: sections.map(({ id, heading, tokens: sectionTokens }) => ({
      id,
      heading,
      html: md.renderer.render(sectionTokens, md.options, {}).trim(),
    })),
    toc: sections.map(({ id, heading }) => ({ id, heading })),
  };
}
