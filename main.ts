/**
 * Ghost Path Plugin
 * - Writes full path [[folder/subfolder/Note]] into file when you type [[Note]]
 * - Visually hides only the folder-prefix in the editor so you see [[Note]] (normal link styling)
 * - Keeps links clickable, fast, and compatible with autosave/autocomplete
 *
 * Save as main.js in your plugin folder.
 */

'use strict';

const obsidian = require('obsidian');

const DEFAULT_SETTINGS = {
    displayAsShortName: true
};

// Debounce helper
function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
}

// Try to import CodeMirror helpers (may be available in Obsidian runtime)
let ViewPlugin, Decoration, WidgetType, RangeSetBuilder;
try {
    ({ ViewPlugin, Decoration, WidgetType } = require('@codemirror/view'));
    ({ RangeSetBuilder } = require('@codemirror/state'));
} catch (e) {
    // If CodeMirror modules are not available, we'll still run but editor-decoration won't work.
    console.warn('GhostPath: CodeMirror modules unavailable — editor visual hiding disabled.', e);
    ViewPlugin = null;
    Decoration = null;
    WidgetType = null;
    RangeSetBuilder = null;
}

// Widget used to hide the prefix (replaced with an empty zero-width DOM node)
class HiddenPrefixWidget extends WidgetType {
    toDOM() {
        const span = document.createElement('span');
        span.className = 'ghost-path-prefix-hidden';
        span.textContent = ''; // no visible text
        // Ensure it occupies no space and does not intercept pointer events
        span.style.display = 'inline-block';
        span.style.width = '0';
        span.style.height = '0';
        span.style.overflow = 'hidden';
        span.style.pointerEvents = 'none';
        return span;
    }
    ignoreEvent() { return true; }
}

// Settings tab
class GhostPathSettingTab extends obsidian.PluginSettingTab {
    constructor(app, plugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
    display() {
        const { containerEl } = this;
        containerEl.empty();
        containerEl.createEl('h2', { text: 'Ghost Path Settings' });

        new obsidian.Setting(containerEl)
            .setName('Display short name in editor')
            .setDesc('When ON, editor will show only the short note name (e.g. [[Note]]) while the file stores the full path [[folder/subfolder/Note]].')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.displayAsShortName)
                .onChange(async (v) => {
                    this.plugin.settings.displayAsShortName = v;
                    await this.plugin.saveSettings();
                    // Force layout-change so editor decorations update
                    this.app.workspace.trigger('layout-change');
                }));
    }
}

// Main plugin
class GhostPathPlugin extends obsidian.Plugin {
    async onload() {
        console.log('GhostPath: loading');

        await this.loadSettings();

        this.addSettingTab(new GhostPathSettingTab(this.app, this));

        // 1) Register editor-change to write full paths into file
        this.registerEvent(
            this.app.workspace.on(
                'editor-change',
                debounce(this.handleEditorChange.bind(this), 220) // 220ms debounce
            )
        );

        // 2) Reading view postprocessor (replace visible link text to short name)
        this.registerMarkdownPostProcessor((el) => {
            if (!this.settings.displayAsShortName) return;
            const links = el.querySelectorAll('a.internal-link');
            links.forEach(link => {
                const href = link.getAttribute('href');
                if (!href) return;
                if (href.includes('/')) {
                    const last = href.substring(href.lastIndexOf('/') + 1);
                    link.innerText = last;
                }
            });
        });

        // 3) Editor decorations: hide folder prefix only (fast + clickable)
        if (ViewPlugin && Decoration && WidgetType && RangeSetBuilder) {
            const self = this;

            const cmPlugin = ViewPlugin.fromClass(class {
                constructor(view) {
                    this.view = view;
                    this.decorations = this.buildDecorations(view);
                }

                update(update) {
                    // Rebuild on doc/viewport changes or when setting toggles
                    if (update.docChanged || update.viewportChanged || self.settings.displayAsShortName !== this._lastSetting) {
                        this.decorations = this.buildDecorations(update.view);
                    }
                }

                buildDecorations(view) {
                    this._lastSetting = self.settings.displayAsShortName;

                    if (!self.settings.displayAsShortName) {
                        return Decoration.none;
                    }

                    const builder = new RangeSetBuilder();
                    const text = view.state.doc.toString();

                    // Match wikilinks: [[...]]
                    const REGEX = /\[\[([^\]]+?)\]\]/g;

                    for (const { from, to } of view.visibleRanges) {
                        const slice = text.slice(from, to);
                        let match;
                        while ((match = REGEX.exec(slice)) !== null) {
                            const fullMatch = match[0];           // e.g. [[folder/sub/note]]
                            const inner = match[1];              // e.g. folder/sub/note
                            if (!inner.includes('/')) continue;  // only hide prefix for full-path links

                            // compute absolute indices in document
                            const start = from + match.index;    // index of '['
                            const innerStart = start + 2;        // after '[['
                            const lastSlashInInner = inner.lastIndexOf('/');
                            const prefixEnd = innerStart + lastSlashInInner + 1; // include slash

                            // Add a replace decoration for the prefix slice; this hides it visually only
                            builder.add(innerStart, prefixEnd, Decoration.replace({
                                widget: new HiddenPrefixWidget(),
                                inclusive: false
                            }));
                        }
                    }

                    return builder.finish();
                }
            }, {
                decorations: v => v.decorations
            });

            this._cmExtension = cmPlugin;
            this.registerEditorExtension(cmPlugin);
        } else {
            console.warn('GhostPath: CodeMirror decorations unavailable. Editor prefix-hiding disabled.');
        }

        // 4) Inject necessary CSS to ensure replaced prefix is zero-width and the shown text uses link styling
        this._style = document.createElement('style');
        this._style.id = 'ghost-path-style';
        this._style.textContent = `
/* Hidden prefix widget (should be zero-width and non-interactive) */
.ghost-path-prefix-hidden {
    display: inline-block;
    width: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    pointer-events: none !important;
    vertical-align: baseline;
}

/* Ensure underlying remaining text uses normal link styling (we don't change that) */
/* No extra rules needed for the visible filename; CodeMirror/Obsidian handles link style */
`;
        document.head.appendChild(this._style);

        console.log('GhostPath: loaded');
    }

    onunload() {
        console.log('GhostPath: unloading');
        if (this._style && this._style.parentNode) {
            this._style.parentNode.removeChild(this._style);
            this._style = null;
        }
        // trigger layout-change to clear decorations
        this.app.workspace.trigger('layout-change');
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }
    async saveSettings() {
        await this.saveData(this.settings);
    }

    /**
     * handleEditorChange
     * - Runs on editor-change events (debounced)
     * - Finds wikilinks like [[Note]] (no slash)
     * - Resolves link destination using Obsidian metadataCache
     * - Replaces the raw text in the editor with the full path [[folder/sub/Note]]
     *
     * This avoids aliases; the file will contain the full path exactly.
     */
    async handleEditorChange(editor) {
        try {
            const activeFile = this.app.workspace.getActiveFile();
            if (!activeFile) return;

            const original = editor.getValue();

            // We will scan for [[...]] matches that don't contain a slash.
            const REGEX = /\[\[([^\]]+?)\]\]/g;
            let match;
            let newContent = original;
            let changed = false;

            // To preserve cursor position better, remember current cursor offset(s)
            const primaryCursor = editor.getCursor();
            const primaryOffset = editor.posToOffset(primaryCursor);

            // We'll collect replacements and apply them once to avoid messing with indices while scanning.
            // But simplest approach: create newContent via replace with a function using exec on original.
            // Use loop and replace on newContent based on original positions.
            // We'll keep track to avoid replacing already-replaced content again.

            // Walk through matches in original
            const replacements = []; // {start, end, replacement}
            while ((match = REGEX.exec(original)) !== null) {
                const fullMatch = match[0];
                const inner = match[1];

                // If it already contains a slash, it's already a full path — skip
                if (inner.includes('/')) continue;

                // Try to resolve to an actual file
                const dest = this.app.metadataCache.getFirstLinkpathDest(inner, activeFile.path);
                if (!dest || !(dest instanceof obsidian.TFile)) continue;

                const fullPathNoExt = dest.path.replace(/\.md$/, '');
                const replacement = `[[${fullPathNoExt}]]`;

                // Only replace if different
                if (replacement !== fullMatch) {
                    const startIndex = match.index;
                    const endIndex = match.index + fullMatch.length;
                    replacements.push({ start: startIndex, end: endIndex, replacement });
                }
            }

            // Apply replacements from end to start so indices remain valid
            if (replacements.length > 0) {
                // Sort descending by start
                replacements.sort((a, b) => b.start - a.start);
                for (const r of replacements) {
                    newContent = newContent.slice(0, r.start) + r.replacement + newContent.slice(r.end);
                    changed = true;
                }
            }

            if (changed && newContent !== original) {
                // Apply new content while preserving cursor location as best we can.
                // Strategy: compute offset difference and map cursor.
                const oldLen = original.length;
                const newLen = newContent.length;
                const offsetDiff = newLen - oldLen;

                // Attempt to set value then map cursor by offset (best-effort).
                editor.setValue(newContent);

                // If primary cursor was after any replaced region, adjust; otherwise keep same
                // Simpler: try to set same offset (clamped)
                let newOffset = primaryOffset;
                // If there were replacements before cursor, compute their total delta
                let deltaBefore = 0;
                for (const r of replacements) {
                    if (r.start < primaryOffset) {
                        deltaBefore += (r.replacement.length - (r.end - r.start));
                    }
                }
                newOffset = primaryOffset + deltaBefore;
                if (newOffset < 0) newOffset = 0;
                if (newOffset > newContent.length) newOffset = newContent.length;

                try {
                    editor.setCursor(editor.offsetToPos(newOffset));
                } catch (e) {
                    // fallback: set to end
                    editor.setCursor(editor.offsetToPos(newContent.length));
                }
            }
        } catch (err) {
            console.error('GhostPath: handleEditorChange failed', err);
        }
    }
}

module.exports = GhostPathPlugin;
