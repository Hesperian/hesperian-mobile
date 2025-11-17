const fs = require("fs");
const path = require("path");
const { defineConfig } = require("vite");

const getPageInfo = require("../webpack/webpack.preprocess");

const CSS_EXTENSION = /.css$/i;

function normalizeDest(dest) {
  if (!dest || dest === "." || dest === "./") {
    return ".";
  }

  return dest.replace(/^\.\/?/, "");
}

function stripGlobPattern(value) {
  if (!value) {
    return value;
  }

  const starIndex = value.indexOf("*");
  if (starIndex === -1) {
    return value;
  }

  const sliced = value.slice(0, starIndex);
  return sliced.replace(/[/\\]*$/, "");
}

function buildStaticTargets(root, libraryRoot, additionalAssets = []) {
  const baseAssets = [
    { from: "img", to: "." },
    { from: "locales", to: "." },
    { from: "lib", to: ".", optional: true },
  ];

  const targets = [];

  const addAsset = (asset) => {
    if (!asset || !asset.from) {
      return;
    }

    const dest = normalizeDest(asset.to);
    const basePath = stripGlobPattern(asset.from);
    const sourcePath = path.resolve(root, basePath);

    if (!fs.existsSync(sourcePath)) {
      if (asset.optional || asset.noErrorOnMissing) {
        return;
      }

      throw new Error(
        `Static asset path "${asset.from}" not found under ${root}.`
      );
    }

    targets.push({
      src: sourcePath,
      dest,
      rename: asset.rename,
    });
  };

  baseAssets.forEach(addAsset);

  (additionalAssets || []).forEach(addAsset);

  const bootstrapSource = path.resolve(libraryRoot, "lib/bootstrap.js");
  if (fs.existsSync(bootstrapSource)) {
    targets.push({
      src: bootstrapSource,
      dest: "lib",
      rename: "bootstrap.js",
    });
  }

  return targets;
}

async function copyPath(src, dest, rename) {
  const stats = await fs.promises.stat(src);
  const outputPath = rename
    ? path.join(dest, rename)
    : path.join(dest, path.basename(src));

  if (stats.isDirectory()) {
    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.cp(src, outputPath, {
      recursive: true,
      force: true,
    });
    return;
  }

  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.promises.copyFile(src, outputPath);
}

function copyStaticAssetsPlugin(targets, outDir) {
  return {
    name: "hesperian-copy-static-assets",
    apply: "build",
    async writeBundle() {
      for (const target of targets) {
        const destRoot = path.resolve(outDir, target.dest);
        await copyPath(target.src, destRoot, target.rename);
      }
    },
  };
}

function debugBundlePlugin(enabled) {
  return {
    name: "hesperian-debug-bundle",
    apply: "build",
    generateBundle(_, bundle) {
      if (!enabled) {
        return;
      }

      // eslint-disable-next-line no-console
      console.log("[hesperian-vite] bundle keys:", Object.keys(bundle));
    },
  };
}

function createConfig(spec) {
  const appConfig = spec.appConfig || {};
  const rootDir = spec.rootDir || process.cwd();
  const root = path.resolve(rootDir, "www");
  const outDir = path.resolve(rootDir, "dist");
  const libraryRoot = path.resolve(__dirname, "..");
  const localizationList = Array.isArray(appConfig.localizations)
    ? appConfig.localizations
    : [];
  const localizationDirs = localizationList
    .map((locale) => locale.language_code)
    .filter(Boolean);

  const additionalAssets =
    spec.addtionalAssets || spec.additionalAssets || [];

  const targets = buildStaticTargets(root, libraryRoot, additionalAssets);

  return defineConfig(({ mode }) => ({
    root,
    base: "./",
    publicDir: false,
    resolve: {
      alias: {
        "hesperian-mobile": libraryRoot,
        "theme.scss": path.resolve(root, "css/theme.scss"),
        "theme.css": path.resolve(root, "css/theme.scss"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          includePaths: [
            path.resolve(root, "css"),
            path.resolve(libraryRoot, "lib/css"),
            path.resolve(rootDir, "node_modules"),
          ],
        },
      },
    },
    define: {
      __VERSION__: JSON.stringify(appConfig.version || ""),
      __PREPROCESS__: JSON.stringify(getPageInfo(localizationDirs)),
    },
    build: {
      outDir,
      emptyOutDir: true,
      target: "es2017",
      minify: mode === 'production',
      sourcemap: mode === 'development',
      assetsDir: ".",
      cssCodeSplit: false,
      rollupOptions: {
        input: path.resolve(root, "js/app.js"),
        external: [],
        output: {
          format: "iife",
          name: "HesperianAppBundle",
          entryFileNames: "main.js",
          assetFileNames: (assetInfo) => {
            if (assetInfo.name && CSS_EXTENSION.test(assetInfo.name)) {
              return "main.css";
            }

            return "[name][extname]";
          },
        },
      },
    },
    plugins: [copyStaticAssetsPlugin(targets, outDir), debugBundlePlugin(process.env.VITE_DEBUG_BUNDLE === "1")],
  }));
}

module.exports = {
  createConfig,
};
