# Agent: Update Demo Video

Update the Remotion-based demo video and marketing assets.

## Instructions

1. Video project is at `videos/` (standalone npm project, NOT pnpm)
2. `cd videos && npm install`
3. Edit scenes in `videos/src/DemoVideo.tsx`
4. Compositions defined in `videos/src/Root.tsx`
5. Current: 10-11 scenes, 74sec (2220 frames at 30fps), 1080p
6. Style: dark terminal aesthetic, neon green (#39FF14), monospace font

## Rendering

```bash
cd videos
# Full video
npx remotion render src/index.ts DemoVideo out/demo.mp4
# Individual GIFs (for README)
npx remotion render src/index.ts DemoInstall out/demo-install.gif
npx remotion render src/index.ts DemoReport out/demo-report.gif
```

## After Rendering
- Copy assets to `docs/assets/` in main repo
- Update README.md if GIF references changed
- Attach MP4 to GitHub release
- GitHub strips `<video>` tags — use GIF in README, MP4 on Releases
