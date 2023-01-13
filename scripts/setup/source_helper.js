const { clientJarLocation, sourceAssetLocation} = require("./constants");
const { log, writeRaw} = require("./util");

const Zip = require("adm-zip");
const path = require("path");
const fs = require("fs");

function unpackAssets() {
    log("Unpacking assets");

    const clientJar = new Zip(clientJarLocation);
    const entries = clientJar.getEntries();

    for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        const { entryName } = entry;

        if (!entryName.endsWith(".class") && !entryName.startsWith("META-INF/")) {
            const dir = path.dirname(entryName);

            const unpackLocation = path.join(sourceAssetLocation, dir);
            const unpackFileLocation = path.join(sourceAssetLocation, entryName);

            if (!fs.existsSync(unpackLocation)) {
                fs.mkdirSync(unpackLocation, {recursive: true});
            }

            if (!fs.existsSync(unpackFileLocation)) {
                writeRaw(`Unpacking ${entryName} (${i + 1}/${entries.length})`);

                fs.writeFileSync(unpackFileLocation, entry.getData());
            }
        }
    }

    if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }

    log("Unpacked assets");
}

module.exports = {
    unpackAssets
}