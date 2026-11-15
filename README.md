# Stormbrainer

One big button that gets a group talking: tap **Spark** and read the card aloud (debate, hot take, memory lane, what if).

Web preview: https://se7enbit.github.io/stormbrainer/

```bash
npm install
npx expo start         # local dev
npm run typecheck
npm run lint
npm test
npm run build:web      # web export to dist/, as deployed
```

Every push is typechecked, linted, tested and exported for web; pushes to `main` are deployed to GitHub Pages. The **Android APK** workflow (Actions tab → Run workflow) builds an installable preview APK as a downloadable artifact.

- [SPEC.md](SPEC.md): scope, data model, acceptance criteria
- [CLAUDE.md](CLAUDE.md): working rules for this repo
- [STATUS.md](STATUS.md): what works, what's next, known issues
