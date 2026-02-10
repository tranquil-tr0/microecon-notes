declare class ExcalidrawRenderer {
    private canvas;
    private ctx;
    private compressedData;
    constructor(canvas: HTMLCanvasElement);
    private init;
    setCompressedData(data: string): void;
    private decompressData;
    private render;
}
declare function initExcalidrawRenderers(): void;
declare function openLesson(index: number): void;
declare function setupLazyLoading(): void;
declare function copyAnchor(idOrElement: string | HTMLElement): Promise<void>;
export { ExcalidrawRenderer, initExcalidrawRenderers, openLesson, setupLazyLoading, copyAnchor };
//# sourceMappingURL=script.d.ts.map