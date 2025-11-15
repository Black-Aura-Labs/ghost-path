# Ghost Path for Obsidian

**Ghost Path** plugin automatically converts simple links like `[[Note]]` into its full path `[[folder/subfolder/Note]]` inside the markdown file while visually *hiding* the path in editor, so you only see the clean `[[Note]]` you love.

![Ghost Path](Assets/Ghost%20Path.gif)

This gives you the best of both worlds:  
✨ Human-friendly links for writing  
🔧 Path-accurate links for tools, scripts, and long-term compatibility

---

## Why Ghost Path?

Obsidian resolves links implicitly, which is great for writing but tricky for:

- External scripts and automations

- Static site generators

- Knowledge-graph tools outside Obsidian

- Migrations to other PKM systems

- Machine reading, parsing, or indexing

- Backups that need stable paths

- Users who want to enforce clear vault structure

**Ghost Path makes every link explicit**, so your vault remains portable, predictable, and script-friendly—without compromising your writing flow.

---

# **Key Features**

## **1. Automatic Path Expansion**

When you type `[[Note]]`, Ghost Path resolves and stores the full relative path:

```
text in editor shows:  [[Note]]
file contains:  [[folder/subfolder/Note]]
```

## **2. Hidden path rendering**

It preserves Obsidian’s clean writing experience and visual simplicity while adding:

- True, explicit paths for machines or external tools

- Portable links that don’t rely on Obsidian’s resolver

- Compatibility with other Markdown systems

- Correct paths for notes that has the same name.

writers stay focused; machines get accuracy.

## **3. Works with nested folders**

No matter how deep your structure goes, your note remains clear.

## **4. Great for Exporting & Automation**

Your vault becomes easier to:

- Convert to a website

- Parse with scripts

- Process with AI/LLMs

- Use with external Markdown tools

- Migrate to other note systems

## **5. Setting toggle: Display short name**

By turning this off you will see full paths in editor view as you write.

---

## Current Limitations

- Editing the name of a folder or nested folder would reflect live for active tabs but for inactive tabs the note itself has to be reopened once.

- Disabling the feature will keep the files written with full paths.

---

## How to Use

1. Install the plugin from the Obsidian Community Plugins browser.
2. Enable it in your settings.
3. That's it! Start typing a link like `[[Your Note Name]]`.
4. Once Obsidian's auto-complete suggests a file, press Enter. Ghost Path will convert the link to its full path and immediately hide the prefix.

## Settings

You can configure Ghost Path in the Obsidian settings panel.

* **Display short name in editor**: Toggle Display Short Name on or off. If you turn this ON, the plugin will still convert links to their full path; you will just see note name in the editor.

---

## Compatibility

The core feature of converting links to absolute paths is guaranteed to work. The visual "ghosting" effect relies on CodeMirror 6, which is the editor engine for Obsidian v0.13.8+. This plugin is fully compatible with Live Preview, Source Mode, and Reading View.

If for any reason the CodeMirror modules are unavailable, the plugin will gracefully disable the display short name feature but will continue to ensure your links are absolute and robust.

## For Developers

This plugin uses CodeMirror 6 ViewPlugin and Decorations to achieve the visual hiding effect without modifying the underlying document text directly in the editor state. This approach is fast, safe, and compatible with Obsidian's core features.

---

## Support

If you find this helpful please consider supporting us on ko-fi:

[<img title="" src="https://i.postimg.cc/3RcBywKq/support-me-on-kofi-badge-blue.png" alt="ko-fi" width="221">](https://ko-fi.com/fawziwaly)
