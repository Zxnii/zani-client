const { downloadMinecraftClient } = require("./download");
const { unpackAssets } = require("./source_helper");

(async () => {
    await downloadMinecraftClient();

    unpackAssets();
})();