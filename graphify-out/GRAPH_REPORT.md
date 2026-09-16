# Graph Report - delbert-boarding-house-app  (2026-09-17)

## Corpus Check
- 42 files · ~18,958 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 237 nodes · 346 edges · 22 communities (10 shown, 11 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Core Feature Views & Types
- TypeScript Compiler Config
- Frontend & Firebase Dependencies
- Package Manifest & Dev Tooling
- Authentication & Profile
- Firebase Plan & Design Rationale
- shadcn Components Config
- Orange D Brand Icons
- Reports View & UI Utils
- Root Layout & Service Worker
- PWA Install Button
- Badging API Types
- PostCSS Config
- Next.js Config
- Service Worker App Shell
- PNPM Workspace Policy
- Generic Placeholder Image (JPG)
- Placeholder Logo Asset (PNG)
- Placeholder Logo Asset (SVG)
- Generic Placeholder Image (SVG)
- User Avatar Placeholder

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `useCollection()` - 15 edges
3. `UserProfile` - 12 edges
4. `Firebase + PWA Integration Spec` - 10 edges
5. `Button()` - 9 edges
6. `Firebase + PWA Integration Implementation Plan` - 8 edges
7. `ChatsView()` - 7 edges
8. `Avatar()` - 7 edges
9. `useAuth()` - 7 edges
10. `tailwind` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Brand Mark Source SVG (icon.svg)` --semantically_similar_to--> `App Favicon (Orange "D" Logo Mark)`  [INFERRED] [semantically similar]
  public/icon.svg → app/icon.png
- `PageShell()` --calls--> `useAuth()`  [EXTRACTED]
  app/page.tsx → lib/auth-context.tsx
- `StartConversationModal()` --calls--> `useCollection()`  [EXTRACTED]
  components/chats/chats-view.tsx → lib/firestore-hooks.ts
- `RightRail()` --calls--> `useCollection()`  [EXTRACTED]
  components/home/home-view.tsx → lib/firestore-hooks.ts
- `ReportsView()` --calls--> `useCollection()`  [EXTRACTED]
  components/reports/reports-view.tsx → lib/firestore-hooks.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **24h/4h Expiry Enforcement Flow** — docs_superpowers_specs_2026_09_16_firebase_pwa_integration_firestorenativettl, docs_superpowers_plans_2026_09_16_firebase_pwa_integration_clientsideexpiryfilter, docs_firebase_setup_ttlpolicyenablement [EXTRACTED 1.00]
- **Post-plan Revision: Role/Admin Removal and Public Anonymous Reports** — docs_superpowers_specs_2026_09_16_firebase_pwa_integration_roleadminremoval, docs_superpowers_specs_2026_09_16_firebase_pwa_integration_reportspublicanonymous, docs_firebase_setup_firebasesetupguide [INFERRED 0.85]

## Communities (22 total, 11 thin omitted)

### Community 0 - "Core Feature Views & Types"
Cohesion: 0.10
Nodes (26): View, ChatsView(), startConversationWith(), conversationId(), expiresLabel(), StartConversationModal(), timeLabel(), FriendsView() (+18 more)

### Community 1 - "TypeScript Compiler Config"
Cohesion: 0.07
Nodes (27): dom, dom.iterable, esnext, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts (+19 more)

### Community 2 - "Frontend & Firebase Dependencies"
Cohesion: 0.08
Nodes (25): @base-ui/react, class-variance-authority, clsx, firebase, lucide-react, dependencies, @base-ui/react, class-variance-authority (+17 more)

### Community 3 - "Package Manifest & Dev Tooling"
Cohesion: 0.08
Nodes (23): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript (+15 more)

### Community 4 - "Authentication & Profile"
Cohesion: 0.15
Nodes (17): PageShell(), LoginView(), handleSubmit(), Mode, ProfileView(), save(), AuthContext, AuthContextValue (+9 more)

### Community 5 - "Firebase Plan & Design Rationale"
Cohesion: 0.15
Nodes (19): Composite Index for Chats List Query, Firebase Setup Guide, TTL Policy Enablement (gcloud/Console), Client-side Expiry Filter (moving now-tick), Firestore Query/DocumentReference Instability Pattern, Hand-rolled PWA Shell (manifest + minimal service worker), Honesty Principle: Don't Invent Data, Firebase + PWA Integration Implementation Plan (+11 more)

### Community 6 - "shadcn Components Config"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 7 - "Orange D Brand Icons"
Cohesion: 0.15
Nodes (13): App Favicon (Orange "D" Logo Mark), Delbert App Brand Mark (Orange 'D' Badge), Delbert Brand Mark (Orange Rounded-Square Badge with White 'D'), Prior Abstract Light-Mode Placeholder Icon (superseded), Delbert Boarding House Brand Logo Mark, Orange Rounded-Square 'D' Brand Mark, Apple Touch Icon (D Brand Mark), PWA Install Icon (192x192) (+5 more)

### Community 8 - "Reports View & UI Utils"
Cohesion: 0.26
Nodes (8): expiresLabel(), ReportCard(), ReportsView(), timeAgo(), Button(), buttonVariants, ReportDoc, cn()

### Community 9 - "Root Layout & Service Worker"
Cohesion: 0.40
Nodes (3): metadata, viewport, ServiceWorkerRegistration()

## Knowledge Gaps
- **92 isolated node(s):** `metadata`, `viewport`, `View`, `$schema`, `style` (+87 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 121 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `Frontend & Firebase Dependencies` to `Package Manifest & Dev Tooling`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **What connects `metadata`, `viewport`, `View` to the rest of the system?**
  _92 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Core Feature Views & Types` be split into smaller, more focused modules?**
  _Cohesion score 0.09758454106280193 - nodes in this community are weakly interconnected._
- **Should `TypeScript Compiler Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07142857142857142 - nodes in this community are weakly interconnected._
- **Should `Frontend & Firebase Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Package Manifest & Dev Tooling` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._
- **Should `shadcn Components Config` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._