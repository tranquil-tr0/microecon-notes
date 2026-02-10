declare class MicroeconWebsiteBuilder {
    private basePath;
    private outputPath;
    private lessons;
    private mediaFiles;
    private hasExcalidraw;
    constructor(basePath: string, outputPath: string);
    build(): Promise<void>;
    private indexMediaFiles;
    private dirExists;
    private readMarkdownFile;
    private parseLessons;
    private createMarkdownParser;
    private processContent;
    private resolveMediaFile;
    private generateEmbedHtml;
    private generateHTML;
    private writeOutputFile;
    private copyMediaFiles;
    private copyStyleSheet;
}
export default MicroeconWebsiteBuilder;
//# sourceMappingURL=builder.d.ts.map