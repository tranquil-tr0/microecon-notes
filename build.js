#!/usr/bin/env node
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const builder_1 = __importDefault(require("./builder"));
const path = __importStar(require("path"));
const args = process.argv.slice(2);
const basePath = args[0] || '/home/tranquil/Documents/Obsidian Vault/Edu Notes/AP Microeconomics/Microecon';
const outputPath = args[1] || './dist';
async function main() {
    try {
        console.log('Starting Microecon website build...');
        console.log(`Source: ${basePath}`);
        console.log(`Output: ${outputPath}`);
        const builder = new builder_1.default(basePath, outputPath);
        await builder.build();
        console.log('Build completed successfully!');
        console.log('Next steps:');
        console.log(`1. Open ${path.join(outputPath, 'index.html')} in your browser`);
        console.log(`2. To serve locally, run: npx serve ${outputPath}`);
    }
    catch (error) {
        console.error('Build failed:', error);
        process.exit(1);
    }
}
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
    process.exit(1);
});
main();
//# sourceMappingURL=build.js.map