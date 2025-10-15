# Music Playground

**Goal**: Cute UI, elite sound. A fun music composition tool with professional-grade audio quality.

## Architecture

```
music-playground/
├── packages/
│   ├── engine/        # Headless audio engine (@music/engine)
│   └── ui/            # Shared React components
├── apps/
│   ├── composer/      # Step sequencer with macros
│   └── lab/           # Experimental sandbox
└── shared/
    └── assets/        # Audio samples and IRs
```

### Key Design Decisions

- **Headless Engine**: Audio engine works in Node.js and browser (no DOM dependencies)
- **Tone.js**: Peer dependency (^14 || ^15) - apps choose version
- **Public API**: Clean `createEngine()` facade with typed interfaces
- **Monorepo**: pnpm workspaces with Turborepo for build orchestration

## Quick Start

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run Composer in dev mode
pnpm -F composer dev

# Run tests
pnpm test
```

## Development

### First Time Setup

1. Clone the repository
2. Run `pnpm install` to install all dependencies
3. Run `pnpm build` to build packages
4. Start developing with `pnpm dev`

### Project Structure

- **@music/engine**: Core audio engine with macros, effects, and scheduling
- **@music/ui**: Shared UI components (buttons, sliders, etc.)
- **composer**: Main step sequencer app with Transport and MacroStrip
- **lab**: Experimental features and testing ground

### Tone.js Version Note

The engine supports Tone.js v14 and v15+:
- **v14**: Full PitchShift support (shimmer, harmonizer work perfectly)
- **v15+**: Some effects gracefully degrade (harmonizer uses fallback)

Apps should declare `tone` as a dependency and install the same major version.

## Contributing

### PR Workflow

1. Create feature branch from `main`
2. Make changes and add tests
3. Run `pnpm build && pnpm test` to verify
4. Submit PR with clear description
5. Ensure CI passes before merge

### Merge Order for Current PRs

1. **PR #1** (feat/engine-extract): Engine package with headless API
2. **PR #2** (feat/composer-mvp): Composer app wired to engine
3. **PR #3** (feat/lab-stub): Lab stub application

### Code Standards

- TypeScript strict mode enabled
- No DOM code in engine package
- All window/document usage guarded with `globalThis` checks
- Tests required for new engine features
- Commit messages follow conventional commits

## Audio Performance

- **Target latency**: < 100ms on desktop, < 150ms on mobile
- **Look-ahead**: 0.1s (configurable per app)
- **First sound**: < 2.5s from app load
- **Bundle budget**: < 150 KB gzipped (Composer app without assets)

## License

MIT

## Roadmap

### Phase 1: MVP (Current)
- ✅ Headless engine with macro system
- ✅ Composer app with Transport and MacroStrip
- 🔄 ComposerGrid with step sequencing
- 🔄 CI/CD pipeline

### Phase 2: Polish
- Feel macro with swing and humanize
- Low latency mode for mobile
- Invisible mastering bus
- One production-ready kit + IR

### Phase 3: User Testing
- Dogfood with 2+ non-musicians
- Measure time-to-first-loop
- Optimize macro UX based on data
