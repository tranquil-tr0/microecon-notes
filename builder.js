"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const markdown_it_1 = __importDefault(require("markdown-it"));
const markdown_it_anchor_1 = __importDefault(require("markdown-it-anchor"));
const markdown_it_obsidian_callouts_1 = __importDefault(require("markdown-it-obsidian-callouts"));
const markdown_it_mark_1 = __importDefault(require("markdown-it-mark"));
const markdown_it_ins_1 = __importDefault(require("markdown-it-ins"));
const crypto_1 = __importDefault(require("crypto"));
const lz_string_1 = __importDefault(require("lz-string"));
const excalidraw_constants_1 = require("./excalidraw-constants");
class MicroeconWebsiteBuilder {
    constructor(basePath, outputPath) {
        this.lessons = [];
        this.mediaFiles = new Set();
        this.hasExcalidraw = false;
        this.basePath = basePath;
        this.outputPath = outputPath;
    }
    async build() {
        console.log('Building Microecon website...');
        await this.indexMediaFiles();
        const mainContent = await this.readMarkdownFile('MAIN.md');
        await this.parseLessons(mainContent);
        const htmlContent = await this.generateHTML();
        await this.writeOutputFile(htmlContent);
        await this.copyMediaFiles();
        await this.copyStyleSheet();
        console.log('Website built successfully!');
        console.log(`Output: ${path_1.default.join(this.outputPath, 'index.html')}`);
    }
    async indexMediaFiles() {
        const attachmentsDir = path_1.default.join(this.basePath, 'attachments');
        const excalidrawDir = path_1.default.join(this.basePath, 'Excalidraw');
        try {
            if (await this.dirExists(attachmentsDir)) {
                const files = await fs_1.default.promises.readdir(attachmentsDir);
                for (const file of files) {
                    this.mediaFiles.add(`attachments/${file}`);
                }
            }
            if (await this.dirExists(excalidrawDir)) {
                const files = await fs_1.default.promises.readdir(excalidrawDir);
                for (const file of files) {
                    this.mediaFiles.add(`Excalidraw/${file}`);
                }
            }
            console.log(`Indexed ${this.mediaFiles.size} media files.`);
        }
        catch (e) {
            console.error("Error indexing media files:", e);
        }
    }
    async dirExists(dir) {
        try {
            await fs_1.default.promises.access(dir);
            return true;
        }
        catch {
            return false;
        }
    }
    async readMarkdownFile(filename) {
        const filePath = path_1.default.join(this.basePath, filename);
        return fs_1.default.promises.readFile(filePath, 'utf8');
    }
    async parseLessons(content) {
        const lines = content.split('\n');
        let currentLesson = null;
        let currentContent = [];
        for (const line of lines) {
            const lessonMatch = line.match(/^#\s+(.*)/);
            if (lessonMatch) {
                if (currentLesson) {
                    currentLesson.content = await this.processContent(currentContent.join('\n'));
                    this.lessons.push(currentLesson);
                }
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
        if (currentLesson) {
            currentLesson.content = await this.processContent(currentContent.join('\n'));
            this.lessons.push(currentLesson);
        }
    }
    createMarkdownParser() {
        const md = new markdown_it_1.default({
            html: true,
            linkify: true,
            typographer: true,
            breaks: false,
        });
        md.use(markdown_it_obsidian_callouts_1.default);
        md.use(markdown_it_mark_1.default);
        md.use(markdown_it_ins_1.default);
        md.use(markdown_it_anchor_1.default, {
            permalink: markdown_it_anchor_1.default.permalink.linkInsideHeader({
                symbol: `<button class="copy-anchor" onclick="copyAnchor(this)" title="Copy link to this section">
          <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
        </button>`,
                placement: 'after',
            }),
            slugify: (str) => str.toLowerCase().replace(/[^\w]+/g, '-'),
        });
        md.inline.ruler.before('link', 'wikilink', (state) => {
            const src = state.src;
            const pos = state.pos;
            if (src.charCodeAt(pos) !== 0x5B || src.charCodeAt(pos + 1) !== 0x5B) {
                return false;
            }
            const endPos = src.indexOf(']]', pos + 2);
            if (endPos === -1) {
                return false;
            }
            const content = src.slice(pos + 2, endPos);
            const token = state.push('wikilink_open', 'a', 1);
            token.attrs = [['href', `#${content.toLowerCase().replace(/[^\w]+/g, '-')}`]];
            token.markup = '[[';
            const textToken = state.push('text', '', 0);
            textToken.content = content;
            state.push('wikilink_close', 'a', -1);
            state.pos = endPos + 2;
            return true;
        });
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
            state.pos = endPos + 2;
            return true;
        });
        return md;
    }
    async processContent(content) {
        const embedRegex = /!\[\[(.*?)\]\]/g;
        const placeholders = new Map();
        let processedContent = content;
        processedContent = processedContent.replace(embedRegex, (_, filename) => {
            filename = filename.trim();
            const id = crypto_1.default.randomUUID();
            const placeholder = `<div data-embed-id="${id}"></div>\n`;
            placeholders.set(placeholder, filename);
            return placeholder;
        });
        const md = this.createMarkdownParser();
        let htmlContent = md.render(processedContent);
        for (const [placeholder, filename] of placeholders.entries()) {
            const mediaHtml = await this.generateEmbedHtml(filename);
            htmlContent = htmlContent.replace(placeholder, mediaHtml);
        }
        return htmlContent;
    }
    resolveMediaFile(filename) {
        const ext = path_1.default.extname(filename);
        if (ext) {
            if (this.mediaFiles.has(`attachments/${filename}`))
                return `attachments/${filename}`;
            if (this.mediaFiles.has(`Excalidraw/${filename}`))
                return `Excalidraw/${filename}`;
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
        }
        else {
            const extensions = ['.md', '.svg', '.mkv', '.mp4', '.webm', '.png', '.jpg'];
            if (this.mediaFiles.has(`attachments/${filename}.md`)) {
                console.log(`Resolved ${filename} to attachments/${filename}.md`);
                return `attachments/${filename}.md`;
            }
            if (this.mediaFiles.has(`Excalidraw/${filename}.md`)) {
                console.log(`Resolved ${filename} to Excalidraw/${filename}.md`);
                return `Excalidraw/${filename}.md`;
            }
            for (const exc of extensions) {
                if (this.mediaFiles.has(`attachments/${filename}${exc}`)) {
                    console.log(`Resolved ${filename} to attachments/${filename}${exc}`);
                    return `attachments/${filename}${exc}`;
                }
                if (this.mediaFiles.has(`Excalidraw/${filename}${exc}`)) {
                    console.log(`Resolved ${filename} to Excalidraw/${filename}${exc}`);
                    return `Excalidraw/${filename}${exc}`;
                }
            }
        }
        console.warn(`Failed to resolve media file: ${filename}`);
        return null;
    }
    async generateEmbedHtml(filename) {
        const relativePath = this.resolveMediaFile(filename);
        if (!relativePath) {
            return `<div class="error-embed">Missing: ${filename}</div>`;
        }
        const lowerPath = relativePath.toLowerCase();
        const title = path_1.default.basename(filename, path_1.default.extname(filename));
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
        }
        else if (lowerPath.endsWith('.svg')) {
            return `
            <div class="media-embed svg-embed">
              <object type="image/svg+xml" data="${relativePath}" class="lesson-svg"></object>
              <div class="media-caption">${title}</div>
            </div>`;
        }
        else if (lowerPath.endsWith('.md')) {
            try {
                const fileText = await fs_1.default.promises.readFile(path_1.default.join(this.basePath, relativePath), 'utf8');
                const isCompressed = fileText.includes("```compressed-json");
                const startString = isCompressed ? "```compressed-json" : "```json";
                const start = fileText.indexOf(startString) + startString.length;
                const end = fileText.lastIndexOf("```");
                const jsonContent = isCompressed
                    ? lz_string_1.default.decompressFromBase64(fileText.slice(start, end).replace(/[\n\r]/g, ""))
                    : fileText.slice(start, end);
                if (!jsonContent)
                    throw new Error("Failed to extract JSON from Excalidraw file");
                const excaliDrawJson = JSON.parse(jsonContent);
                if (excaliDrawJson.elements) {
                    excaliDrawJson.elements.forEach((el) => {
                        if (el.fontFamily > 4) {
                            el.fontFamily = 1;
                        }
                    });
                }
                const drawingId = title.split(" ").join("_").replace(/\./g, "") + "_" + crypto_1.default.randomBytes(4).toString('hex');
                this.hasExcalidraw = true;
                return `
              <div class="media-embed excalidraw-embed">
                ${(0, excalidraw_constants_1.excalidraw)(JSON.stringify(excaliDrawJson), drawingId)}
                <div class="media-caption">${title}</div>
              </div>`;
            }
            catch (e) {
                console.error(`Error processing Excalidraw file ${relativePath}:`, e);
                return `<div class="error-embed">Error rendering: ${filename}</div>`;
            }
        }
        else if (lowerPath.endsWith('.png') || lowerPath.endsWith('.jpg') || lowerPath.endsWith('.jpeg')) {
            return `
            <div class="media-embed image-embed">
              <img src="${relativePath}" alt="${title}" class="lesson-image">
              <div class="media-caption">${title}</div>
            </div>`;
        }
        return `<div class="unknown-embed">Unsupported embed: ${filename} (Type unknown)</div>`;
    }
    async generateHTML() {
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
    ${this.hasExcalidraw ? excalidraw_constants_1.excaliDrawBundle : ''}
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
    async writeOutputFile(content) {
        const outputDir = path_1.default.join(this.outputPath);
        await fs_1.default.promises.mkdir(outputDir, { recursive: true });
        const outputPath = path_1.default.join(outputDir, 'index.html');
        await fs_1.default.promises.writeFile(outputPath, content, 'utf8');
    }
    async copyMediaFiles() {
        const attachmentsDir = path_1.default.join(this.basePath, 'attachments');
        const excalidrawDir = path_1.default.join(this.basePath, 'Excalidraw');
        const outputAttachments = path_1.default.join(this.outputPath, 'attachments');
        const outputExcalidraw = path_1.default.join(this.outputPath, 'Excalidraw');
        try {
            if (await this.dirExists(attachmentsDir)) {
                await fs_1.default.promises.mkdir(outputAttachments, { recursive: true });
                const attachments = await fs_1.default.promises.readdir(attachmentsDir);
                for (const file of attachments) {
                    const source = path_1.default.join(attachmentsDir, file);
                    const dest = path_1.default.join(outputAttachments, file);
                    const stat = await fs_1.default.promises.stat(source);
                    if (stat.isFile()) {
                        await fs_1.default.promises.copyFile(source, dest);
                    }
                }
            }
            if (await this.dirExists(excalidrawDir)) {
                await fs_1.default.promises.mkdir(outputExcalidraw, { recursive: true });
                const excalidrawFiles = await fs_1.default.promises.readdir(excalidrawDir);
                for (const file of excalidrawFiles) {
                    const source = path_1.default.join(excalidrawDir, file);
                    const dest = path_1.default.join(outputExcalidraw, file);
                    const stat = await fs_1.default.promises.stat(source);
                    if (stat.isFile()) {
                        await fs_1.default.promises.copyFile(source, dest);
                    }
                }
            }
        }
        catch (error) {
            console.error('Error copying media files:', error);
        }
    }
    async copyStyleSheet() {
        try {
            const stylesheetPath = path_1.default.join(process.cwd(), 'styles.css');
            const destPath = path_1.default.join(this.outputPath, 'styles.css');
            if (await fs_1.default.promises.access(stylesheetPath).then(() => true).catch(() => false)) {
                await fs_1.default.promises.copyFile(stylesheetPath, destPath);
                console.log('Copied styles.css to output directory.');
            }
            else {
                console.warn('Could not find styles.css in project root to copy.');
            }
        }
        catch (error) {
            console.error('Error copying styles.css:', error);
        }
    }
}
exports.default = MicroeconWebsiteBuilder;
//# sourceMappingURL=builder.js.map