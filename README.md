# Siege

**Desktop Pet Siege** — Tower defense on the real desktop edge — pets defend the screen from creeping bits.

Part of the [ComputerPets](https://github.com/RicheyWorks/computerpets) universe. Map: [computerpets-ecosystem](https://github.com/RicheyWorks/computerpets-ecosystem).

> Status: **design scaffold**. Gameplay contract is frozen. Engine choice is the one in the brief. Implementation comes next.

## Loop

The flagship pet is already a living sticker on Windows. Siege is the combat skin of that sticker: creeps climb the taskbar, Rui swats them. Close Siege, the pet still walks.

## Genre & engine

- Genre: **Tower defense overlay**
- Engine: **C# / WinForms (or WPF)**
- Stack: C# · .NET 8 · WinForms/WPF layered window · same always-on-top path as the Electron overlay
- Default surface: `desktop overlay`

## How you play

1. Start from desktop.ps1 extra flag or siege.exe.
2. Place up to 3 owned pets as towers on screen edges.
3. Creeps are abstract (paperclips, popups), not horror.
4. Defeat = overlay hides 30s, then walks back. No permadeath.

## Talks to

- computerpets desktop overlay
- computerpets-motion
- computerpets-dojo
- computerpets-horde (wave DNA)

## Failure doctrine

Game crash → overlay process is separate, pet remains. Multi-monitor → defend the focused screen only. Accessibility: motion can be reduced.

Canon rules that never yield:

- 210 living kinds. No illegal hybrids.
- Overlay pets can get tired, sick, or hide. Tokens are not burned by a minigame.
- Desktop walk stays the main quest. Closing Siege must leave Rui walking.

## Layout

```
computerpets-siege/
  README.md
  LICENSE
  docs/DESIGN.md
  src/                implementation lands here
```

## Run (Windows)

```powershell
dotnet build src/Siege.csproj; dotnet run --project src/Siege.csproj
```

Meet Rui first via the [flagship start-here](https://github.com/RicheyWorks/computerpets/blob/main/docs/START-HERE.md). This game is optional.

## License

MIT. See [LICENSE](LICENSE).

---

*Two hundred ten living kinds. Keep them so a line does not go quiet.*
