import { ReactNode, useMemo } from 'react';
import { Plus, Trash2, ArrowUp, ArrowDown, RotateCcw } from 'lucide-react';
import { LegalLayout } from './LegalLayout';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@/context/AuthContext';
import { useLegalInfo } from '@/hooks/useLegalInfo';
import { useVisualEditor } from '@/components/visual-editor/VisualEditorProvider';
import { InlineEditable } from '@/components/visual-editor/InlineEditable';
import {
  DEFAULT_LEGAL_CONTENT,
  LegalPageContent,
  LegalPageKey,
  LegalSection,
} from './defaultLegalContent';

/* ------------------------------------------------------------------ */
/* Variables                                                           */
/* ------------------------------------------------------------------ */

const NC = '[Non configuré]';

function useLegalVars() {
  const info = useLegalInfo();
  return useMemo<Record<string, string>>(
    () => ({
      societe: info.companyName,
      forme_juridique: info.companyForm,
      capital: info.capital === NC ? NC : `${info.capital} €`,
      adresse: info.fullAddress,
      siret: info.siret,
      rcs: info.rcs,
      tva: info.vat,
      directeur: info.director,
      email_contact: info.contactEmail,
      email_rgpd: info.rgpdEmail,
      email_retours: info.returnEmail,
      telephone: info.contactPhone,
      site: info.siteName,
    }),
    [info],
  );
}

function applyVars(text: string, vars: Record<string, string>) {
  return text.replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (_m, key: string) => vars[key.toLowerCase()] ?? _m);
}

/** Splits a line into text / email / url tokens and renders links + "Non configuré" badges. */
function renderInline(line: string, keyPrefix: string): ReactNode[] {
  const parts = line.split(/(\[Non configuré\]|https?:\/\/[^\s)]+|[\w.+-]+@[\w.-]+\.[a-z]{2,})/gi);
  return parts.filter(Boolean).map((part, i) => {
    const k = `${keyPrefix}-${i}`;
    if (part === NC) {
      return (
        <span
          key={k}
          className="inline-flex items-center gap-1 bg-orange-500/15 text-orange-500 border border-orange-500/30 text-[11px] font-mono px-1.5 py-0.5 rounded"
        >
          Non configuré
        </span>
      );
    }
    if (/^https?:\/\//i.test(part)) {
      return (
        <a key={k} href={part} target="_blank" rel="noopener noreferrer">
          {part}
        </a>
      );
    }
    if (/^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i.test(part)) {
      return (
        <a key={k} href={`mailto:${part}`}>
          {part}
        </a>
      );
    }
    return <span key={k}>{part}</span>;
  });
}

function renderBody(raw: string, vars: Record<string, string>, keyPrefix: string) {
  const text = applyVars(raw, vars);
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, bi) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) return null;

    if (lines[0].startsWith('### ')) {
      const heading = lines[0].slice(4);
      const rest = lines.slice(1);
      return (
        <div key={`${keyPrefix}-b${bi}`}>
          <h3>{renderInline(heading, `${keyPrefix}-h${bi}`)}</h3>
          {rest.length > 0 && <p>{renderInline(rest.join(' '), `${keyPrefix}-p${bi}`)}</p>}
        </div>
      );
    }

    if (lines.every((l) => l.startsWith('- '))) {
      return (
        <ul key={`${keyPrefix}-b${bi}`}>
          {lines.map((l, li) => (
            <li key={li}>{renderInline(l.slice(2), `${keyPrefix}-l${bi}-${li}`)}</li>
          ))}
        </ul>
      );
    }

    // Mixed block: paragraph lines then bullets
    const bulletStart = lines.findIndex((l) => l.startsWith('- '));
    if (bulletStart > 0) {
      const paras = lines.slice(0, bulletStart);
      const bullets = lines.slice(bulletStart).filter((l) => l.startsWith('- '));
      return (
        <div key={`${keyPrefix}-b${bi}`}>
          <p>{renderInline(paras.join(' '), `${keyPrefix}-p${bi}`)}</p>
          <ul>
            {bullets.map((l, li) => (
              <li key={li}>{renderInline(l.slice(2), `${keyPrefix}-l${bi}-${li}`)}</li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <p key={`${keyPrefix}-b${bi}`}>
        {lines.map((l, li) => (
          <span key={li}>
            {renderInline(l, `${keyPrefix}-p${bi}-${li}`)}
            {li < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

/* ------------------------------------------------------------------ */
/* Renderer                                                           */
/* ------------------------------------------------------------------ */

export function LegalPageRenderer({
  pageKey,
  extraContent,
}: {
  pageKey: LegalPageKey;
  /** Optional interactive content rendered right after the intro (e.g. cookie preferences button). */
  extraContent?: ReactNode;
}) {
  const { designSettings, updateDesignSettings } = useApp();
  const { isAdmin } = useAuth();
  const { isOpen, setIsDirty } = useVisualEditor();
  const vars = useLegalVars();

  const editing = isOpen && isAdmin;
  const all = ((designSettings as any).legalPages || {}) as Partial<Record<LegalPageKey, LegalPageContent>>;
  const fallback = DEFAULT_LEGAL_CONTENT[pageKey];
  const stored = all[pageKey];
  const content: LegalPageContent = {
    title: stored?.title ?? fallback.title,
    lastUpdated: stored?.lastUpdated ?? fallback.lastUpdated,
    sections: stored?.sections?.length ? stored.sections : fallback.sections,
  };

  function persist(next: LegalPageContent) {
    updateDesignSettings({ legalPages: { ...all, [pageKey]: next } } as any);
    setIsDirty(true);
  }

  function updateSection(id: string, patch: Partial<LegalSection>) {
    persist({
      ...content,
      sections: content.sections.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    });
  }

  function addSection(index: number) {
    const section: LegalSection = {
      id: `sec-${Date.now()}`,
      heading: 'Nouveau titre',
      body: 'Cliquez sur ce texte pour le modifier.',
    };
    const sections = [...content.sections];
    sections.splice(index, 0, section);
    persist({ ...content, sections });
  }

  function removeSection(id: string) {
    persist({ ...content, sections: content.sections.filter((s) => s.id !== id) });
  }

  function move(id: string, dir: -1 | 1) {
    const sections = [...content.sections];
    const i = sections.findIndex((s) => s.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= sections.length) return;
    [sections[i], sections[j]] = [sections[j], sections[i]];
    persist({ ...content, sections });
  }

  function resetPage() {
    if (!window.confirm('Réinitialiser cette page au texte d’origine ?')) return;
    persist({ ...DEFAULT_LEGAL_CONTENT[pageKey] });
  }

  const titleNode = editing ? (
    <InlineEditable
      fieldKey={`legal:${pageKey}:title`}
      value={content.title}
      onCommit={(v) => persist({ ...content, title: v })}
      as="span"
    />
  ) : (
    content.title
  );

  return (
    <LegalLayout
      title={titleNode}
      lastUpdated={
        editing ? (
          <InlineEditable
            fieldKey={`legal:${pageKey}:updated`}
            value={content.lastUpdated}
            onCommit={(v) => persist({ ...content, lastUpdated: v })}
            as="span"
          />
        ) : (
          content.lastUpdated
        )
      }
    >
      {editing && (
        <div className="not-prose mb-6 flex flex-wrap items-center gap-2 rounded border border-dashed border-primary/40 bg-primary/5 p-3">
          <span className="text-[11px] font-bold uppercase tracking-widest text-primary">
            Mode édition — cliquez sur un texte pour le modifier
          </span>
          <button
            type="button"
            onClick={() => addSection(content.sections.length)}
            className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-muted"
          >
            <Plus className="h-3 w-3" /> Ajouter un article
          </button>
          <button
            type="button"
            onClick={resetPage}
            className="inline-flex items-center gap-1 rounded border border-border bg-background px-2 py-1 text-[11px] font-semibold hover:bg-muted"
          >
            <RotateCcw className="h-3 w-3" /> Texte d’origine
          </button>
        </div>
      )}

      {extraContent}

      {content.sections.map((section, index) => (
        <section key={section.id} className={editing ? 'relative rounded border border-dashed border-border/60 p-3 mb-4' : undefined}>
          {editing && (
            <div className="not-prose mb-2 flex items-center gap-1">
              <button type="button" onClick={() => move(section.id, -1)} title="Monter" className="p-1 rounded hover:bg-muted disabled:opacity-30" disabled={index === 0}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(section.id, 1)} title="Descendre" className="p-1 rounded hover:bg-muted disabled:opacity-30" disabled={index === content.sections.length - 1}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => addSection(index + 1)} title="Ajouter un article après" className="p-1 rounded hover:bg-muted">
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => removeSection(section.id)} title="Supprimer cet article" className="p-1 rounded text-destructive hover:bg-destructive/10 ml-auto">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {editing ? (
            <>
              <InlineEditable
                fieldKey={`legal:${pageKey}:${section.id}:heading`}
                value={section.heading}
                onCommit={(v) => updateSection(section.id, { heading: v })}
                as="h2"
                placeholder="Titre de l’article (laisser vide pour aucun titre)"
              />
              <InlineEditable
                fieldKey={`legal:${pageKey}:${section.id}:body`}
                value={section.body}
                onCommit={(v) => updateSection(section.id, { body: v })}
                as="div"
                multiline
                className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed"
              >
                {renderBody(section.body, vars, `${pageKey}-${section.id}`)}
              </InlineEditable>
            </>
          ) : (
            <>
              {section.heading ? <h2>{section.heading}</h2> : null}
              {renderBody(section.body, vars, `${pageKey}-${section.id}`)}
            </>
          )}
        </section>
      ))}
    </LegalLayout>
  );
}
