const fs = require("fs");
const path = require("path");

function createAll(directories) {
    for (const dir of directories) {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }
}

const clientVersion = "1.8.9";

const runLocation = path.join(process.cwd(), "run");
const sourceCodeLocation = path.join(process.cwd(), "src/main/java");
const sourceAssetLocation = path.join(process.cwd(), "src/main/resources");

const assetLocation = path.join(runLocation, "assets");
const assetIndexLocation = path.join(assetLocation, "indexes");
const assetObjectLocation = path.join(assetLocation, "objects");
const assetLogConfigLocation = path.join(assetLocation, "log_configs");

const versionDownloadDirectory = path.join(process.cwd(), `jars/versions/${clientVersion}`);

const nativesDirectory = path.join(process.cwd(), "bin");
const fakeNativesDirectory = path.join(versionDownloadDirectory, `${clientVersion}-natives`);

const clientJarLocation = path.join(versionDownloadDirectory, `${clientVersion}.jar`);
const clientJsonLocation = path.join(versionDownloadDirectory, `${clientVersion}.json`);

createAll([
    runLocation,
    sourceCodeLocation,
    sourceAssetLocation,

    assetLocation,
    assetIndexLocation,
    assetObjectLocation,
    assetLogConfigLocation,

    versionDownloadDirectory,

    nativesDirectory,
    fakeNativesDirectory,
]);

module.exports = {
    clientVersion,

    runLocation,
    sourceCodeLocation,
    sourceAssetLocation,

    assetLocation,
    assetIndexLocation,
    assetObjectLocation,
    assetLogConfigLocation,

    versionDownloadDirectory,

    nativesDirectory,
    fakeNativesDirectory,

    clientJarLocation,
    clientJsonLocation
};