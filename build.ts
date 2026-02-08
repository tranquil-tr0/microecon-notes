#!/usr/bin/env node

import MicroeconWebsiteBuilder from './builder';
import * as path from 'path';

// Get command line arguments
const args = process.argv.slice(2);

// Default paths
const basePath = args[0] || '/home/tranquil/Documents/Obsidian Vault/Edu Notes/AP Microeconomics/Microecon';
const outputPath = args[1] || './dist';

async function main() {
  try {
    console.log('Starting Microecon website build...');
    console.log(`Source: ${basePath}`);
    console.log(`Output: ${outputPath}`);
    
    const builder = new MicroeconWebsiteBuilder(basePath, outputPath);
    await builder.build();
    
    console.log('Build completed successfully!');
    console.log('Next steps:');
    console.log(`1. Open ${path.join(outputPath, 'index.html')} in your browser`);
    console.log(`2. To serve locally, run: npx serve ${outputPath}`);
    
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

main();