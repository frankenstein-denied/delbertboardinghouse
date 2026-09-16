# Graph Report - delbert-boarding-house-app  (2026-09-16)

## Corpus Check
- Corpus is ~3,300 words - fits in a single context window. You may not need a graph.

## Summary
- 148 nodes · 136 edges · 20 communities (8 shown, 11 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.85)
- Token cost: 0 input · 338,266 output

## Community Hubs (Navigation)
- Social Feed UI Components
- Frontend UI Dependencies
- TypeScript Compiler Config
- shadcn Components Config
- Dev Dependencies & Tooling
- Package Manifest Metadata
- TypeScript Project Files
- Button Component & Utils
- Root Layout & Metadata
- PostCSS Config
- Next.js Config
- PNPM Workspace Policy
- Generic Placeholder Image
- Placeholder Logo Asset
- Apple Touch Icon
- App Icon (Adaptive)
- Dark Mode Favicon
- Light Mode Favicon
- User Avatar Placeholder

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `tailwind` - 6 edges
3. `aliases` - 6 edges
4. `include` - 6 edges
5. `Button()` - 4 edges
6. `scripts` - 4 edges
7. `lib` - 4 edges
8. `cn()` - 3 edges
9. `buttonVariants` - 2 edges
10. `@base-ui/react` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Button()` --calls--> `cn()`  [EXTRACTED]
  components/ui/button.tsx → lib/utils.ts
- `Placeholder Logo (PNG)` --semantically_similar_to--> `Placeholder Logo (SVG)`  [INFERRED] [semantically similar]
  public/placeholder-logo.png → public/placeholder-logo.svg
- `Generic Placeholder Image (SVG)` --INFERRED--> `Generic Placeholder Image (JPG)`  [INFERRED]
  public/placeholder.svg → public/placeholder.jpg

## Import Cycles
- None detected.

## Communities (20 total, 11 thin omitted)

### Community 0 - "Social Feed UI Components"
Cohesion: 0.07
Nodes (10): conversations, currentUser, Message, Post, posts, Reaction, reactionOptions, residents (+2 more)

### Community 1 - "Frontend UI Dependencies"
Cohesion: 0.09
Nodes (23): @base-ui/react, class-variance-authority, clsx, lucide-react, dependencies, @base-ui/react, class-variance-authority, clsx (+15 more)

### Community 2 - "TypeScript Compiler Config"
Cohesion: 0.11
Nodes (19): dom, dom.iterable, esnext, compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules (+11 more)

### Community 3 - "shadcn Components Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 4 - "Dev Dependencies & Tooling"
Cohesion: 0.13
Nodes (15): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+7 more)

### Community 5 - "Package Manifest Metadata"
Cohesion: 0.22
Nodes (8): name, packageManager, private, scripts, build, dev, start, version

### Community 6 - "TypeScript Project Files"
Cohesion: 0.22
Nodes (8): .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude, include

### Community 7 - "Button Component & Utils"
Cohesion: 0.70
Nodes (3): Button(), buttonVariants, cn()

## Knowledge Gaps
- **87 isolated node(s):** `metadata`, `viewport`, `View`, `User`, `Reaction` (+82 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 110 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend UI Dependencies` to `Package Manifest Metadata`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies & Tooling` to `Package Manifest Metadata`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `TypeScript Compiler Config` to `TypeScript Project Files`?**
  _High betweenness centrality (0.029) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `View` to the rest of the system?**
  _87 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Social Feed UI Components` be split into smaller, more focused modules?**
  _Cohesion score 0.06896551724137931 - nodes in this community are weakly interconnected._
- **Should `Frontend UI Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.10526315789473684 - nodes in this community are weakly interconnected._