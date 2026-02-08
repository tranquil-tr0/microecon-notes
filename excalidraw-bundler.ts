import * as ExcalidrawUtils from '@excalidraw/utils';
// @ts-ignore
if (typeof window !== 'undefined') {
    // @ts-ignore
    window.ExcalidrawUtils = ExcalidrawUtils;
} else if (typeof global !== 'undefined') {
    // @ts-ignore
    global.ExcalidrawUtils = ExcalidrawUtils;
}
