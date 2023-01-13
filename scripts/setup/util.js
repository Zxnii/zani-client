const fs = require("fs");
const path = require("path");
const util = require("util");

const setupCacheLocation = path.join(process.cwd(), "setup_cache.json");

let downloaded = {};

if (fs.existsSync(setupCacheLocation)) {
    try {
        downloaded = JSON.parse(
            fs.readFileSync(path.join(setupCacheLocation), { encoding: "utf8" }));
    } catch {
        downloaded = {};

        fs.unlinkSync(setupCacheLocation);
    }
}

function log(...args) {
    console.log(`--`, ...args);
}

function writeRaw(...args) {
    if (process.stdout.isTTY) {
        process.stdout.cursorTo(0);

        process.stdout.write(util.format("--", ...args));

        process.stdout.clearLine(1);
    }
}

function formatSize(size) {
    if (size < 1000) {
        return `${size}B`;
    } else if (size < Math.pow(10, 6)) {
        return `${(size / 1000).toFixed(2)}KB`;
    } else if (size < Math.pow(10, 9)) {
        return `${(size / Math.pow(10, 6)).toFixed(2)}MB`;
    } else {
        return `${(size / Math.pow(10, 9)).toFixed(2)}GB`;
    }
}

function formatProgress(downloadedSize, totalSize) {
    return `${formatSize(downloadedSize)}/${formatSize(totalSize)}`;
}

function markDownloaded(hash, filePath) {
    if (!checkDownloaded(hash)) {
        downloaded[hash] = filePath;

        fs.writeFileSync(setupCacheLocation, JSON.stringify(downloaded, null, 4));
    }
}

function checkDownloaded(hash) {
    return hash in downloaded && fs.existsSync(downloaded[hash]);
}

function recurseFilteredCopy(dir, copy, cb, baseSrc, baseCopy) {
    const files = fs.readdirSync(dir);

    if (!baseSrc) {
        baseSrc = dir;
    }

    if (!baseCopy) {
        baseCopy = copy;
    }

    for (const file of files) {
        const completePath = path.join(dir, file);
        const completeCopyPath = path.join(copy, file);

        const isDir = fs.statSync(completePath).isDirectory();

        if (cb(completePath, isDir)) {
            if (isDir) {
                fs.mkdirSync(completeCopyPath, { recursive: true });

                recurseFilteredCopy(completePath, completeCopyPath, cb, baseSrc, baseCopy);
            } else {
                writeRaw(`Copying ${completePath.replace(baseSrc, "")
                    .replaceAll(path.sep, "/")
                    .replace(/^\//, "")}`);

                fs.copyFileSync(completePath, completeCopyPath);
            }
        }
    }
}

module.exports = {
    log,
    writeRaw,
    formatSize,
    formatProgress,
    markDownloaded,
    checkDownloaded,
    recurseFilteredCopy
};