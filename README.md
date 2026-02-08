# Microecon Website

A beautiful, lightweight website built from Obsidian markdown for AP Microeconomics notes.

## Features

- **Automatic Build**: Converts Obsidian markdown to professional website
- **Responsive Design**: Mobile-friendly with modern CSS
- **Media Support**: Videos, SVGs, and Excalidraw drawings
- **Smooth Navigation**: Clean layout with smooth scrolling
- **TypeScript**: Type-safe build process
- **Lightweight**: Fast loading and minimal dependencies

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/microecon-website.git
cd microecon-website
```

2. Install dependencies:
```bash
npm install
```

3. Build the website:
```bash
npm run build
```

## Usage

### Building the Website
```bash
# Build the website
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

### Custom Configuration
You can specify custom source and output paths:
```bash
# Custom source and output
npm run build -- /path/to/source /path/to/output

# Or using the build script directly
node build.js /path/to/source /path/to/output
```

## Project Structure

```
├── builder.ts          # Main build logic
├── build.ts            # Build script entry point
├── script.ts           # Frontend JavaScript
├── styles.css          # Stylesheets
├── tsconfig.json       # TypeScript configuration
├── package.json        # Dependencies and scripts
└── dist/               # Generated website output
```

## Media Support

The website automatically handles:

- **Videos** (.mkv): Embedded with HTML5 video player
- **SVGs**: Displayed using <object> tags
- **Excalidraw**: Renders compressed Excalidraw drawings on canvas

## Development

### Adding New Content
1. Add markdown files to the source directory
2. Use `![[filename]]` syntax for media embeds
3. Run `npm run build` to regenerate the website

### Customizing Styles
Edit `styles.css` to modify the design. The website uses CSS custom properties for easy theming.

## License

MIT License - feel free to use for your own educational content!

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Support

For issues or questions, please open an issue on GitHub.