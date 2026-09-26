# Battle page redesign plan

## Goal

Replace the current dashboard-style `/battle` experience with a polished, original card-battle interface inspired by `tcg/battle-frontend-web/`. Make it feel like **Mint's NFT card game**, not a Pokémon TCG clone. Keep real wallet-connected matchmaking and battles working; do not migrate Pokémon characters, card data, names, rules, artwork, scripted events, or branding.

## What exists today

- `app/battle/page.tsx` is a lobby browser with create/join, active battles, and history. `app/battle/lobby/[id]/page.tsx` handles NFT selection and readiness; `app/battle/play/[id]/page.tsx` renders the actual match.
- `convex/lobby.ts` starts a two-player battle with **one selected NFT per player**. `convex/battle.ts` resolves alternating attacks, health, victory, and rewards; `convex/schema.ts` stores health, turn, and move history. There is no deck, hand, bench, energy, prize, or card-draw system.
- The reference's `/battle` uses `BattleClient.tsx` plus `mockMatch.ts`: a fixed Arven → Escape Rope → Arcanine attack → prize → Raihan replay. Its visuals and animation ideas are useful, but its actions, counters, and progression are not connected to our game.

## Product direction and scope

**First release: a truthful, playable one-card-versus-one-card battlefield.** Reuse the visual language of the reference (table/board, prominent cards, depth, focused card preview, turn indicator, attack impact, result state), adapted to Mint's original visual identity and existing NFT artwork. Do **not** display a fake hand, deck, bench, prize track, energy requirement, or opponent cards we cannot actually derive from the server.

`/battle` becomes the battle **hub presented as an arena**: show an active match prominently with a clear Continue action; otherwise show a staged arena/owned-card preview and the primary Create/Join actions. Keep public lobbies, join-by-code, active matches, and history available in a compact panel/drawer or below the arena. An actual match remains at `/battle/play/[id]`; redesign that route using the same board and card components so the hub's promise carries through to real gameplay. Preserve `/battle/lobby/[id]` and its selection/readiness workflow, restyling it to match as needed. This avoids replacing live matchmaking with an unplayable local demo.

## Implementation phases

1. **Extract the reference's reusable design patterns.** Review `tcg/battle-frontend-web/src/components/battle/{BattleField,BattleCard,CardPreview,BattleHud,VfxLayer}.tsx`, `src/battle/animation/AnimationQueue.ts`, and `src/app/globals.css`. Build scoped Mint battle components/styles under `components/battle/` (and a battle-specific stylesheet if useful); do not paste the reference's 2,231-line global stylesheet or overwrite `app/globals.css`. Adapt only animations that add clear feedback; use the existing `framer-motion` where practical rather than adding `gsap` without a compelling need. Account for the app's global `Navbar` and providers in `app/layout.tsx`.
2. **Define a live battle view model.** Map `getBattleWithNFTData` and the connected wallet to local/opponent player, owned NFT metadata/image, max/current health, types, four custom moves, turn, move history, and result. Give every image a readable fallback. Keep combat calculation, turn validation, and rewards in `convex/battle.ts`, not in UI state. Never infer hidden game state from the reference's mock fixtures.
3. **Replace `/battle` hub.** Make a visually rich but honest arena entry screen with distinct states for wallet initialization/disconnection, loading, no cards or matches, active battle, and completed battle. Preserve create-public/private, code entry, public browsing, resume, and history/replay entry points; show button loading/error feedback and prevent double submissions. Keep navigation into the existing lobby and play routes intact.
4. **Redesign the live play route.** Replace the rigid three-column layout in `app/battle/play/[id]/page.tsx` with a responsive board: opponent card above, player's NFT card below, legible HP and turn labels, custom-move action dock, collapsible event log, and end-of-match summary. Animate only after a confirmed Convex result/subscription update (attack, damage, critical, KO, turn change); ensure animations never block the next valid action or replay stale updates. Preserve the existing four-move selection and `executeTurn` behavior. Do not claim arbitrary selected move power affects damage unless server logic is changed to support it.
5. **Improve accessibility and small-screen behavior.** Remove the current hard `1504px × 900px` play-route cutoff. Reflow/scroll the board and collapse ancillary panels on tablets and phones; maintain usable actions without overlap. Add keyboard-accessible card inspection and controls, visible focus states, semantic labels/live turn announcements, sufficient contrast, `prefers-reduced-motion` support, and an animation-skip path. Sound, if included, must default off and play real cues rather than only changing status text.
6. **Verify end to end.** Run TypeScript/build and applicable lint checks. Manually exercise wallet connect/disconnect, create public/private lobby, join by code/public listing, select NFT and ready, start/continue match, take turns from both players, reject out-of-turn/double actions, finish a match, view history, and handle missing card art/data. Check desktop, tablet, mobile, keyboard, and reduced-motion flows; confirm responsive states and animations with live Convex updates.

## Explicit exclusions and follow-up

- Do not copy `mockMatch.ts`, reference card names, Pokémon references, trademarked terminology, prerecorded timestamps, hard-coded opponent identities/counts, or the reference's predetermined match outcome. Use original Mint copy and the user's actual NFT metadata/artwork; audit copied markup, labels, aria text, CSS comments, and assets for leftover references.
- A **true multi-card TCG** (decks, hands, draws, energy, switching, prizes, hidden information) requires a separate game-design decision and a new authoritative Convex schema/mutations, validated rules, privacy boundaries, deck building, and migration strategy. Do not imply these mechanics exist just to resemble the reference. If that is the desired product instead of the one-card game above, agree on the rules and backend scope before implementation.
- Preserve existing battle records/routes and winner rewards. Treat existing `?replay=true` carefully: the current route shows final state, not a turn-by-turn replay. Either implement a real move-history playback from stored moves in a later phase or label this action **View result** in the redesigned UI; do not promise a replay that is not there.

## Done when

- `/battle` clearly looks and behaves like the entry point to Mint's card battle, with create/join/resume/history still reachable.
- `/battle/play/[id]` shows real player cards, health, turn, moves, and outcomes from Convex, with no fabricated TCG state and no Pokémon content.
- A complete two-wallet battle works without regressions, and the UI remains legible, operable, and motion-safe on mobile and desktop.
