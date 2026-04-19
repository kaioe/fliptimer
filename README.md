# FlipTimer

> A beautiful, responsive flip-clock timer with customizable presets

FlipTimer is an elegant, web-based countdown timer featuring a classic flip-clock design with smooth 3D animations. Designed for both desktop and mobile, it's perfect for workouts, cooking, focus sessions, or any activity where you need a stylish and reliable timer..

[**Live Demo**](https://kaioe.github.io/fliptimer/) | [**GitHub Repository**](https://github.com/kaioe/fliptimer)

## ✨ Features

- **⏱️ Flip-Clock Design** - Elegant animated flip-clock interface with smooth 3D transitions and customizable digit colors.
- **📱 Responsive & Touch-Friendly** - Works perfectly on desktop and mobile with touch gestures, safe-area support, and adaptive sizing.
- **🎨 Customizable Presets** - Create unlimited timer presets with custom names, colors, durations, intervals, and rounds.
- **🔊 Sound Effects** - Optional audio feedback for start, pause, and finish events with preloaded or custom sounds.
- **🌙 Dark Theme** - Beautiful dark theme with subtle gradients and customizable background images.
- **⚡ Fast & Lightweight** - No dependencies beyond jQuery, CSS animations for smooth performance, and localStorage persistence.

## 🚀 Installation

FlipTimer is easy to set up and run locally:

1. **Clone the repository**
   ```bash
   git clone https://github.com/kaioe/fliptimer.git
   cd fliptimer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```
   This will start BrowserSync on port 3000 (or the next available port) and open the timer in your browser.

> [!TIP]
> **Development Mode:** The dev server automatically watches for changes to your SCSS files and reloads the browser. It also provides preset synchronization to `fliptimer.json`.

## 🛠️ Usage

### Basic Controls
- **Play/Pause:** Start or pause the timer with a 5-second countdown preparation.
- **Reset:** Return to the original time setting.
- **Presets:** Open the preset modal to manage timer configurations.

### Creating Presets
1. Click the **Presets** button (list icon).
2. Fill in the timer details:
   - **Name:** Custom label for your timer.
   - **Color:** Choose a color that will be applied to the clock digits.
   - **Duration:** Main countdown time (using the blue slider).
   - **Interval:** Break or interval time (using the orange slider).
   - **Rounds:** Number of repetitions (using the purple slider).
3. Click **Save timer** to add it to your presets.
4. Use the **checkmark icon** to apply a preset to the main timer.

### Timer Settings
Access advanced options by clicking the **gear icon** in the preset modal header:
- **Track Range:** Set maximum duration for sliders (10-60 minutes).
- **Sounds:** Choose preloaded sounds or upload custom audio files.
- **App Background:** Upload a custom background image.
- **Counter Size:** Adjust the clock size as a percentage of viewport.

## 🏗️ Building for Production

### Compile CSS
```bash
npm run build
```
This compiles `fliptimer.scss` to minified `fliptimer.css` (`--style=compressed`) and writes `fliptimer.css.map` for browser DevTools (the map file is gitignored; CI still ships it inside `dist/` when you run `build:dist`).

Development (`npm run dev`) compiles expanded CSS with the same source map so you can debug against the SCSS sources.

### Create Distribution Bundle
```bash
npm run build:dist
```
This creates a `dist/` folder with all files needed for static hosting:
- `index.html`
- `fliptimer.css` (minified), `fliptimer.css.map` when present, and `fliptimer.js`
- Vendored jQuery (`vendor/jquery.min.js`)
- `sounds/` directory with all audio files
- `favicon.svg` and optional `fliptimer.json`

> [!WARNING]
> The `dist/` folder is self-contained and can be deployed to any static hosting service (GitHub Pages, Netlify, Vercel, etc.) without requiring Node.js on the server.

## 📋 Technical Specifications

| Component | Specification |
| :--- | :--- |
| **Framework** | Vanilla JS + jQuery |
| **Styling** | Sass/SCSS → CSS (compressed for production, source maps in dev and dist) |
| **Animations** | CSS 3D Transforms |
| **Storage** | localStorage |
| **Dev Server** | BrowserSync |
| **Testing** | Playwright |
| **Build Tools** | npm scripts |
| **License** | MIT |

## 💻 Development

### Available Scripts
```bash
# Start development server with hot reload
npm run dev

# Compile SCSS to CSS
npm run build

# Build distribution bundle
npm run build:dist

# Run console logging test (headless browser)
npm run browser:console

# Test preset save without full reload
npm run test:preset-save
```

### File Structure
```text
fliptimer/
├── index.html          # Main application HTML
├── fliptimer.scss      # Source styles (edit this)
├── fliptimer.css       # Compiled CSS (generated; minified via npm run build)
├── fliptimer.css.map   # Sass source map (generated; gitignored)
├── fliptimer.js        # Application logic
├── fliptimer.json      # Presets and settings
├── sounds/             # Audio files
├── scripts/            # Build and test scripts
├── tests/              # Playwright tests
└── dist/               # Production build output
```

> [!CAUTION]
> **CSS Compilation:** Always edit `fliptimer.scss`, not `fliptimer.css`. Browsers cannot compile Sass/SCSS directly. Run `npm run build` or use `npm run dev` for automatic compilation.

## 🌐 Browser Support

FlipTimer supports all modern browsers with CSS 3D transform support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

The app uses progressive enhancement and falls back gracefully where advanced features are not available.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

### Development Guidelines
- Follow the existing code style and conventions.
- Edit SCSS files, not compiled CSS.
- Test changes in both development and production builds.
- Ensure mobile responsiveness is maintained.
- Add comments for complex logic.

## 📄 License

This project is licensed under the MIT License. Feel free to use it in your own projects!

---
Built with ❤️ using vanilla JavaScript and CSS.
