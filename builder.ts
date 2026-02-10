// Import required modules
import fs from 'fs';
import path from 'path';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';
import callouts from 'markdown-it-obsidian-callouts';
import mark from 'markdown-it-mark';
import ins from 'markdown-it-ins';
import crypto from 'crypto';
import LZString from 'lz-string';
import { excaliDrawBundle, excalidraw } from './excalidraw-constants';


interface MediaFile {
  type: 'video' | 'svg' | 'excalidraw' | 'image';
  path: string;
  title?: string;
  originalName: string;
}

interface Lesson {
  title: string;
  content: string; // HTML content
  media: MediaFile[];
  id: string;
}

class MicroeconWebsiteBuilder {
  private basePath: string;
  private outputPath: string;
  private lessons: Lesson[] = [];
  private mediaFiles: Set<string> = new Set(); // Store all available filenames (relative paths)
  private hasExcalidraw: boolean = false;


  constructor(basePath: string, outputPath: string) {
    this.basePath = basePath;
    this.outputPath = outputPath;
  }

  async build(): Promise<void> {
    console.log('Building Microecon website...');

    // Index all media files first
    await this.indexMediaFiles();

    // Read and parse the main markdown file
    const mainContent = await this.readMarkdownFile('MAIN.md');

    // Parse lessons from markdown
    await this.parseLessons(mainContent);

    // Generate HTML for each lesson
    const htmlContent = await this.generateHTML();

    // Write the final HTML file
    await this.writeOutputFile(htmlContent);

    // Copy media files
    await this.copyMediaFiles();

    // Copy styles.css
    await this.copyStyleSheet();

    console.log('Website built successfully!');
    console.log(`Output: ${path.join(this.outputPath, 'index.html')}`);
  }

  private async indexMediaFiles(): Promise<void> {
    const attachmentsDir = path.join(this.basePath, 'attachments');
    const excalidrawDir = path.join(this.basePath, 'Excalidraw');

    try {
      if (await this.dirExists(attachmentsDir)) {
        const files = await fs.promises.readdir(attachmentsDir);
        for (const file of files) {
          this.mediaFiles.add(`attachments/${file}`);
        }
      }

      if (await this.dirExists(excalidrawDir)) {
        const files = await fs.promises.readdir(excalidrawDir);
        for (const file of files) {
          this.mediaFiles.add(`Excalidraw/${file}`);
        }
      }
      console.log(`Indexed ${this.mediaFiles.size} media files.`);
    } catch (e) {
      console.error("Error indexing media files:", e);
    }
  }

  private async dirExists(dir: string): Promise<boolean> {
    try {
      await fs.promises.access(dir);
      return true;
    } catch {
      return false;
    }
  }

  private async readMarkdownFile(filename: string): Promise<string> {
    const filePath = path.join(this.basePath, filename);
    return fs.promises.readFile(filePath, 'utf8');
  }

  private async parseLessons(content: string): Promise<void> {
    const lines = content.split('\n');
    let currentLesson: Lesson | null = null;
    let currentContent: string[] = [];

    for (const line of lines) {
      // Check for lesson headers (h1)
      const lessonMatch = line.match(/^#\s+(.*)/);
      if (lessonMatch) {
        // Save previous lesson
        if (currentLesson) {
          currentLesson.content = await this.processContent(currentContent.join('\n'));
          this.lessons.push(currentLesson);
        }

        // Start new lesson
        currentContent = [];
        const title = lessonMatch[1].trim();
        currentLesson = {
          title: title,
          content: '',
          media: [],
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        };
        continue;
      }

      if (currentLesson) {
        currentContent.push(line);
      }
    }

    // Add the last lesson
    if (currentLesson) {
      currentLesson.content = await this.processContent(currentContent.join('\n'));
      this.lessons.push(currentLesson);
    }
  }

  private createMarkdownParser(): MarkdownIt {
    const md = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
      breaks: false,
    });

    // Add plugins for Obsidian features
    md.use(callouts);
    md.use(mark);  // Support ==highlighted text==
    md.use(ins);   // Support ++inserted text++

    // Configure anchor plugin with custom rendering for copy button
    md.use(anchor, {
      permalink: anchor.permalink.linkInsideHeader({
        symbol: `<button class="copy-anchor" onclick="copyAnchor(this)" title="Copy link to this section">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>`,
        placement: 'after',
      }),
      slugify: (str: string) => str.toLowerCase().replace(/[^\w]+/g, '-'),
    });

    // Add Obsidian wiki links support
    md.inline.ruler.before('link', 'wikilink', (state) => {
      const src = state.src;
      const pos = state.pos;

      // Check for [[
      if (src.charCodeAt(pos) !== 0x5B || src.charCodeAt(pos + 1) !== 0x5B) {
        return false;
      }

      // Find ]]
      const endPos = src.indexOf(']]', pos + 2);
      if (endPos === -1) {
        return false;
      }

      const content = src.slice(pos + 2, endPos);
      
      // Create token
      const token = state.push('wikilink_open', 'a', 1);
      token.attrs = [['href', `#${content.toLowerCase().replace(/[^\w]+/g, '-')}`]];
      token.markup = '[[';

      const textToken = state.push('text', '', 0);
      textToken.content = content;

      state.push('wikilink_close', 'a', -1);

      state.pos = endPos + 2;
      return true;
    });

    // Add strikethrough support (~~text~~)
    md.inline.ruler.before('strikethrough', 'obsidian_strikethrough', (state) => {
      const src = state.src;
      const pos = state.pos;

      if (src.charCodeAt(pos) !== 0x7E || src.charCodeAt(pos + 1) !== 0x7E) {
        return false;
      }

      const endPos = src.indexOf('~~', pos + 2);
      if (endPos === -1) {
        return false;
      }

      const content = src.slice(pos + 2, endPos);

      state.push('s_open', 's', 1);
      const textToken = state.push('text', '', 0);
      textToken.content = content;
      state.push('s_close', 's', -1);

      state.pos = endPos + 2;
      return true;
    });

    // Add comment support (%%text%%)
    md.inline.ruler.before('text', 'obsidian_comment', (state) => {
      const src = state.src;
      const pos = state.pos;

      if (src.charCodeAt(pos) !== 0x25 || src.charCodeAt(pos + 1) !== 0x25) {
        return false;
      }

      const endPos = src.indexOf('%%', pos + 2);
      if (endPos === -1) {
        return false;
      }

      // Just skip the content - don't render anything
      state.pos = endPos + 2;
      return true;
    });

    return md;
  }

  private async processContent(content: string): Promise<string> {
    // 1. Identify embeds and replace with placeholders (before markdown parsing)
    const embedRegex = /!\[\[(.*?)\]\]/g;
    const placeholders: Map<string, string> = new Map();
    let processedContent = content;

    processedContent = processedContent.replace(embedRegex, (_, filename) => {
      filename = filename.trim();
      const id = crypto.randomUUID();
      // Use a DIV placeholder that markdown-it will preserve
      const placeholder = `<div data-embed-id="${id}"></div>\n`;
      placeholders.set(placeholder, filename);
      return placeholder;
    });

    // 2. Create markdown parser with all Obsidian features
    const md = this.createMarkdownParser();

    // 3. Convert Markdown to HTML
    let htmlContent = md.render(processedContent);
    
    // 4. Replace placeholders with generated HTML
    for (const [placeholder, filename] of placeholders.entries()) {
      const mediaHtml = await this.generateEmbedHtml(filename);
      htmlContent = htmlContent.replace(placeholder, mediaHtml);
    }

    return htmlContent;
  }

  private resolveMediaFile(filename: string): string | null {
    // If filename has extension, look for exact match
    const ext = path.extname(filename);
    if (ext) {
      if (this.mediaFiles.has(`attachments/${filename}`)) return `attachments/${filename}`;
      if (this.mediaFiles.has(`Excalidraw/${filename}`)) return `Excalidraw/${filename}`;
      // Special case: Excalidraw files often use .excalidraw.md naming
      // If the extension is not .md, also try appending .md
      if (ext !== '.md') {
        if (this.mediaFiles.has(`attachments/${filename}.md`)) {
          console.log(`Resolved ${filename} to attachments/${filename}.md`);
          return `attachments/${filename}.md`;
        }
        if (this.mediaFiles.has(`Excalidraw/${filename}.md`)) {
          console.log(`Resolved ${filename} to Excalidraw/${filename}.md`);
          return `Excalidraw/${filename}.md`;
        }
      }
    } else {
      // Try Extensions: .md (for Excalidraw), .svg, .mkv, .png, .jpg
      const extensions = ['.md', '.svg', '.mkv', '.mp4', '.webm', '.png', '.jpg'];

      // Check attachments folder first for .md (Excalidraw plugin stores as markdown)
      if (this.mediaFiles.has(`attachments/${filename}.md`)) {
        console.log(`Resolved ${filename} to attachments/${filename}.md`);
        return `attachments/${filename}.md`;
      }

      // Check Excalidraw folder for .md
      if (this.mediaFiles.has(`Excalidraw/${filename}.md`)) {
        console.log(`Resolved ${filename} to Excalidraw/${filename}.md`);
        return `Excalidraw/${filename}.md`;
      }

      // Check attachments for other extensions
      for (const exc of extensions) {
        if (this.mediaFiles.has(`attachments/${filename}${exc}`)) {
          console.log(`Resolved ${filename} to attachments/${filename}${exc}`);
          return `attachments/${filename}${exc}`;
        }
        // Also check Excalidraw folder for .svg if exported there
        if (this.mediaFiles.has(`Excalidraw/${filename}${exc}`)) {
          console.log(`Resolved ${filename} to Excalidraw/${filename}${exc}`);
          return `Excalidraw/${filename}${exc}`;
        }
      }
    }
    console.warn(`Failed to resolve media file: ${filename}`);
    return null;
  }

  private async generateEmbedHtml(filename: string): Promise<string> {
    const relativePath = this.resolveMediaFile(filename);

    if (!relativePath) {
      return `<div class="error-embed">Missing: ${filename}</div>`;
    }

    const lowerPath = relativePath.toLowerCase();
    // Use original filename for title, strip extension if present
    const title = path.basename(filename, path.extname(filename));

    if (lowerPath.endsWith('.mkv') || lowerPath.endsWith('.mp4') || lowerPath.endsWith('.webm')) {
      return `
            <div class="media-embed video-embed">
              <video controls class="lesson-video">
                <source src="${relativePath}" type="video/webm">
                <source src="${relativePath}" type="video/mp4">
                Your browser does not support the video tag.
              </video>
              <div class="media-caption">${title}</div>
            </div>`;
    } else if (lowerPath.endsWith('.svg')) {
      return `
            <div class="media-embed svg-embed">
              <object type="image/svg+xml" data="${relativePath}" class="lesson-svg"></object>
              <div class="media-caption">${title}</div>
            </div>`;
    } else if (lowerPath.endsWith('.md')) {
      // Excalidraw Markdown file - CUSTOM HANDLING PRESERVED
      try {
        const fileText = await fs.promises.readFile(path.join(this.basePath, relativePath), 'utf8');
        const isCompressed = fileText.includes("```compressed-json");
        const startString = isCompressed ? "```compressed-json" : "```json";
        const start = fileText.indexOf(startString) + startString.length;
        const end = fileText.lastIndexOf("```");

        const jsonContent = isCompressed
          ? LZString.decompressFromBase64(fileText.slice(start, end).replace(/[\n\r]/g, ""))
          : fileText.slice(start, end);

        if (!jsonContent) throw new Error("Failed to extract JSON from Excalidraw file");

        const excaliDrawJson = JSON.parse(jsonContent);

        // Sanitize font families: Obsidian Excalidraw often uses index 5 (Assistant) 
        // which is not supported by the core Excalidraw library (1-4).
        // Map 5 (and anything else unknown) to 1 (Virgil/Hand-drawn) for the hand-drawn look.
        if (excaliDrawJson.elements) {
          excaliDrawJson.elements.forEach((el: any) => {
            if (el.fontFamily > 4) {
              el.fontFamily = 1;
            }
          });
        }

        const drawingId = title.split(" ").join("_").replace(/\./g, "") + "_" + crypto.randomBytes(4).toString('hex');

        this.hasExcalidraw = true;
        return `
              <div class="media-embed excalidraw-embed">
                ${excalidraw(JSON.stringify(excaliDrawJson), drawingId)}
                <div class="media-caption">${title}</div>
              </div>`;
      } catch (e) {
        console.error(`Error processing Excalidraw file ${relativePath}:`, e);
        return `<div class="error-embed">Error rendering: ${filename}</div>`;
      }
    } else if (lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
      return `
            <div class="media-embed image-embed">
              <img src="${relativePath}" alt="${title}" class="lesson-image">
              <div class="media-caption">${title}</div>
            </div>`;
    }

    return `<div class="unknown-embed">Unsupported embed: ${filename} (Type unknown)</div>`;
  }

  private async generateHTML(): Promise<string> {
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AP Microeconomics - Study Notes</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
    ${this.hasExcalidraw ? excaliDrawBundle : ''}
    <link rel="stylesheet" href="styles.css">
</head>
<body>
    <div class="app-container">
        <nav class="side-nav">
            <div class="nav-header">
                <span class="nav-label">Contents</span>
            </div>
            <ul class="nav-list">
                ${this.lessons.map(lesson => `
                    <li class="nav-item">
                        <a href="#${lesson.id}" class="nav-link" title="${lesson.title}">
                            <span class="nav-dot"></span>
                            <span class="nav-text">${lesson.title}</span>
                        </a>
                    </li>
                `).join('')}
            </ul>
        </nav>
        <main class="main-content">
            <div class="content-container">
                ${this.lessons.map(lesson => `
                    <section id="${lesson.id}" class="lesson-section">
                        <h1 class="lesson-title heading-with-anchor">
                            <span>${lesson.title}</span>
                            <button class="copy-anchor" onclick="copyAnchor('${lesson.id}')" title="Copy link to this section">
                                <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                            </button>
                        </h1>
                        <div class="lesson-content">
                            ${lesson.content}
                        </div>
                    </section>
                `).join('')}
            </div>
        </main>
    </div>

    <script src="script.js"></script>
</body>
</html>
    `;

    return htmlTemplate;
  }

  private async writeOutputFile(content: string): Promise<void> {
    const outputDir = path.join(this.outputPath);
    await fs.promises.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, 'index.html');
    await fs.promises.writeFile(outputPath, content, 'utf8');
  }

  private async copyMediaFiles(): Promise<void> {
    const attachmentsDir = path.join(this.basePath, 'attachments');
    const excalidrawDir = path.join(this.basePath, 'Excalidraw');
    const outputAttachments = path.join(this.outputPath, 'attachments');
    const outputExcalidraw = path.join(this.outputPath, 'Excalidraw');

    try {
      if (await this.dirExists(attachmentsDir)) {
        await fs.promises.mkdir(outputAttachments, { recursive: true });
        const attachments = await fs.promises.readdir(attachmentsDir);
        for (const file of attachments) {
          const source = path.join(attachmentsDir, file);
          const dest = path.join(outputAttachments, file);
          // Check if directory
          const stat = await fs.promises.stat(source);
          if (stat.isFile()) {
            await fs.promises.copyFile(source, dest);
          }
        }
      }

      if (await this.dirExists(excalidrawDir)) {
        await fs.promises.mkdir(outputExcalidraw, { recursive: true });
        const excalidrawFiles = await fs.promises.readdir(excalidrawDir);
        for (const file of excalidrawFiles) {
          const source = path.join(excalidrawDir, file);
          const dest = path.join(outputExcalidraw, file);
          const stat = await fs.promises.stat(source);
          if (stat.isFile()) {
            await fs.promises.copyFile(source, dest);
          }
        }
      }

    } catch (error) {
      console.error('Error copying media files:', error);
    }
  }

  private async copyStyleSheet(): Promise<void> {
    try {
      // Find the styles.css in the project root (relative to where the builder is run)
      const stylesheetPath = path.join(process.cwd(), 'styles.css');
      const destPath = path.join(this.outputPath, 'styles.css');

      if (await fs.promises.access(stylesheetPath).then(() => true).catch(() => false)) {
        await fs.promises.copyFile(stylesheetPath, destPath);
        console.log('Copied styles.css to output directory.');
      } else {
        console.warn('Could not find styles.css in project root to copy.');
      }
    } catch (error) {
      console.error('Error copying styles.css:', error);
    }
  }
}

// Export for use in build script
export default MicroeconWebsiteBuilder;
