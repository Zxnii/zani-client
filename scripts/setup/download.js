const { clientVersion, clientJarLocation, clientJsonLocation, nativesDirectory,
    assetObjectLocation, assetIndexLocation, assetLogConfigLocation, sourceCodeLocation, sourceAssetLocation
} = require("./constants");
const { log, writeRaw, formatProgress, formatSize, checkDownloaded, markDownloaded} = require("./util");

const ZipFile = require("adm-zip/zipFile");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

let manifestCache;
let versionMetadataCache = {

};

async function downloadVersionManifest() {
    if (!manifestCache) {
        log("Fetching version manifest");

        const versionManifestRequest = await fetch("https://piston-meta.mojang.com/mc/game/version_manifest_v2.json");

        if (!versionManifestRequest.ok) {
            log(`Failed to fetch version manifest! ${versionManifestRequest.status}`);
            process.exit(1);
        }

        const manifestData = await versionManifestRequest.json();

        manifestCache = manifestData;

        return manifestData;
    } else {
        return manifestCache;
    }
}

async function downloadVersionMetadata(version) {
    if (!versionMetadataCache[version]) {
        const { versions } = await downloadVersionManifest();

        const clientVersionEntry = versions.find(entry => entry.id === version);

        if (!clientVersionEntry) {
            log(`Failed to download version ${version} as it does not appear to exist!`);
            process.exit(1);
        }

        const versionMetadataRequest = await fetch(clientVersionEntry.url);

        if (!versionMetadataRequest.ok) {
            log(`Failed to fetch version metadata! ${versionMetadataRequest.status}`);
            process.exit(1);
        }

        const versionMetadata = await versionMetadataRequest.json();

        versionMetadataCache[version] = versionMetadata;

        return versionMetadata;
    } else {
        return versionMetadataCache[version];
    }
}

async function downloadLibrary(version, index) {
    const { libraries } = await downloadVersionMetadata(clientVersion);
    const { name, downloads, natives, extract } = libraries[index];

    const friendlyName = name.split(":")[1];

    let totalDownloaded = 0;

    if (natives) {
        const platform = {
            "win32": "windows",
            "darwin": "osx",
            "linux": "linux"
        }[process.platform] ?? "linux";

        const arch = {
            "x64": "64",
            "ia32": "32",
        }[process.arch] ?? "unsupported";

        const classifier = natives[platform].replace("${arch}", arch);
        const { classifiers } = downloads;

        if (classifier in classifiers) {
            const { url, sha1, size } = classifiers[classifier];
            const chunks = [];

            let verified = false;

            while (!verified) {
                const hash = crypto.createHash("sha1");

                const artifactRequest = await fetch(url);
                const reader = artifactRequest.body.getReader();

                let chunk = await reader.read();
                let recSize = 0;

                while (!chunk.done) {
                    chunks.push(Buffer.from(chunk.value));
                    hash.update(chunk.value);

                    recSize += chunk.value.byteLength;

                    chunk = await reader.read();

                    if (process.stdout.isTTY) writeRaw(`Downloading ${friendlyName} (natives) -- Progress: ${formatProgress(recSize, size)}`);
                }

                if (process.stdout.isTTY) {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                }

                const checksum = hash.digest("hex");

                if (checksum !== sha1) {
                    log(`${friendlyName} (natives) did not download correctly, retrying`);
                } else {
                    log(`${friendlyName} (natives) verified`);
                    verified = true;
                }
            }

            if (extract) {
                const zip = new ZipFile(Buffer.concat(chunks), {});

                zip.entries.forEach((entry, fileIndex) => {
                    let extractFile = true;

                    if ("exclude" in extract) {
                        for (const exclusion of extract.exclude) {
                            if (entry.entryName.startsWith(exclusion) || entry.isDirectory) extractFile = false;
                        }
                    }

                    if (extractFile) {
                        writeRaw(`Extracting ${entry.name} (${fileIndex + 1}/${zip.entries.length}) from ${friendlyName}`);

                        fs.writeFileSync(path.join(nativesDirectory, entry.name), entry.getData());
                    }
                });

                if (process.stdout.isTTY) {
                    process.stdout.clearLine(0);
                    process.stdout.cursorTo(0);
                }

                log(`Extracted all natives from ${friendlyName} (${index + 1}/${libraries.length})`);
            }

            totalDownloaded += size;
        }
    }

    return totalDownloaded;
}

async function downloadLibraries(version) {
    const { libraries } = await downloadVersionMetadata(clientVersion);

    log(`Downloading native libraries for ${version}`);

    let totalDownloaded = 0;

    for (let i = 0; i < libraries.length; i++) {
        totalDownloaded += await downloadLibrary(version, i);
    }

    log(`Downloaded ${formatSize(totalDownloaded)} of libraries`);
}

async function downloadAssets(version) {
    const { assetIndex } = await downloadVersionMetadata(version);
    const { id, url, totalSize } = assetIndex;

    const indexRequest = await fetch(url);
    const indexData = await indexRequest.json();

    const entries = Object.entries(indexData.objects);

    let downloaded = 0;

    log("Downloading assets");

    let parallelDownloads = [];

    for (const [, entry] of entries) {
        parallelDownloads.push(new Promise(async resolve => {
            const { hash, size } = entry;

            const group = hash.slice(0, 2);
            const groupPath = path.join(assetObjectLocation, group);

            if (!fs.existsSync(groupPath)) {
                fs.mkdirSync(groupPath, {recursive: true});
            }

            const assetPath = path.join(groupPath, hash);

            let verified = checkDownloaded(hash);

            while (!verified) {
                const verifyHash = crypto.createHash("sha1");

                const assetRequest = await fetch(`https://resources.download.minecraft.net/${group}/${hash}`);
                const reader = assetRequest.body.getReader();

                let chunk = await reader.read();
                let recSize = 0;

                fs.writeFileSync(assetPath, Buffer.alloc(0));

                while (!chunk.done) {
                    fs.appendFileSync(assetPath, chunk.value);
                    verifyHash.update(chunk.value);

                    recSize += chunk.value.byteLength;

                    chunk = await reader.read();
                }

                const checksum = verifyHash.digest("hex");

                if (checksum !== hash) {
                    writeRaw(`${hash} did not download correctly, retrying`);
                } else {
                    markDownloaded(checksum, assetPath);
                    verified = true;
                }
            }

            downloaded += size;

            resolve();
        }));

        if (parallelDownloads.length >= 10) {
            await Promise.all(parallelDownloads);
            parallelDownloads = [];

            if (process.stdout.isTTY) writeRaw(`Progress: ${formatProgress(downloaded, totalSize)}`);
        }
    }

    if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    fs.writeFileSync(path.join(assetIndexLocation, `${id}.json`), JSON.stringify(indexData));

    log("Downloaded assets");
}

async function downloadLogConfig(version) {
    log("Downloading log config");

    const { logging: { client: { file: { id, url }}} } = await downloadVersionMetadata(version);

    const configRequest = await fetch(url);
    const configData = await configRequest.text();

    fs.writeFileSync(path.join(assetLogConfigLocation, id), configData);

    log("Downloaded log config");
}

async function downloadOptifine(version) {
    log(`Downloading latest OptiFine version for ${version}`);

    const optifineRequest = await fetch(`https://dl.zani.wtf/optifine${version}_latest.zip`);

    const reader = optifineRequest.body.getReader();
    const chunks = [];

    let chunk = await reader.read();

    while (!chunk.done) {
        chunks.push(Buffer.from(chunk.value));

        chunk = await reader.read();
    }

    const zip = new ZipFile(Buffer.concat(chunks), {});

    zip.entries.forEach(entry => {
        if (entry.entryName.startsWith("optifine/")) {
            const trimmed = entry.entryName.replace("optifine/", "");
            const dir = path.dirname(trimmed);

            if (!fs.existsSync(path.join(sourceCodeLocation, dir))) {
                fs.mkdirSync(path.join(sourceCodeLocation, dir), { recursive: true });
            }

            if (!entry.isDirectory && trimmed.endsWith(".java")) {
                fs.writeFileSync(path.join(sourceCodeLocation, trimmed), entry.getData());
            }
        } else if (entry.entryName.startsWith("assets")) {
            const dir = path.dirname(entry.entryName);

            if (!fs.existsSync(path.join(sourceAssetLocation, dir))) {
                fs.mkdirSync(path.join(sourceAssetLocation, dir), { recursive: true });
            }

            if (!entry.isDirectory) {
                fs.writeFileSync(path.join(sourceAssetLocation, entry.entryName), entry.getData());
            }
        }
    });

    log(`Downloaded latest OptiFine version for ${version}`);
}

async function downloadMinecraftClient() {
    const versionMetadata = await downloadVersionMetadata(clientVersion);
    const { downloads: { client: { sha1, size, url: clientUrl } } } = versionMetadata;

    fs.writeFileSync(clientJsonLocation, JSON.stringify(versionMetadata, null, 4));

    let verified = checkDownloaded(sha1);

    if (!verified) {
        log(`Downloading client jar: ${clientUrl} (SHA1: ${sha1})`);
    } else {
        log(`Skipped re-downloading client jar`);
    }

    while (!verified) {
        const hash = crypto.createHash("sha1");

        fs.writeFileSync(clientJarLocation, Buffer.alloc(0));

        const clientRequest = await fetch(clientUrl);

        const reader = clientRequest.body.getReader();

        let chunk = await reader.read();
        let recSize = 0;

        if (process.stdout.isTTY) writeRaw(`Progress: ${formatProgress(recSize, size)}`);

        while (!chunk.done) {
            fs.appendFileSync(clientJarLocation, chunk.value);
            hash.update(chunk.value);

            recSize += chunk.value.byteLength;

            chunk = await reader.read();

            if (process.stdout.isTTY) writeRaw(`Progress: ${formatProgress(recSize, size)}`);
        }

        if (process.stdout.isTTY) {
            process.stdout.clearLine(0);
            process.stdout.cursorTo(0);
        }

        const checksum = hash.digest("hex");

        if (checksum !== sha1) {
            log("Client jar is not valid, retrying");
        } else {
            log("Verified client jar");
            markDownloaded(checksum, clientJarLocation);
            verified = true;
        }
    }

    await downloadLibraries(clientVersion);
    await downloadAssets(clientVersion);
    await downloadLogConfig(clientVersion);
    await downloadOptifine(clientVersion);
}

module.exports = {
    downloadMinecraftClient
};