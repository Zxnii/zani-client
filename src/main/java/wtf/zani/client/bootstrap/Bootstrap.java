package wtf.zani.client.bootstrap;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.Logger;
import wtf.zani.client.asm.TransformingClassLoader;
import wtf.zani.client.asm.transformers.MinecraftClassTransformer;
import wtf.zani.client.util.ArrayUtils;

import java.lang.reflect.Method;

public class Bootstrap {
    private static final Logger logger = LogManager.getLogger("Bootstrap");
    private static Bootstrap instance;
    private final String[] args;
    private final TransformingClassLoader classLoader;

    private Bootstrap(String[] args) {
        instance = this;

        Thread.currentThread().setName("Bootstrap");

        this.args = args;
        this.classLoader = new TransformingClassLoader(this.getClass().getClassLoader());

        logger.info("Starting zani client");

        this.registerTransformers();
        this.launchMinecraft();
    }

    public TransformingClassLoader getClassLoader() {
        return this.classLoader;
    }

    public static void main(String[] args) {
        new Bootstrap(args);
    }

    public static Bootstrap getInstance() {
        return instance;
    }

    public static Logger getLogger() {
        return logger;
    }

    private void launchMinecraft() {
        logger.info("Starting Minecraft");

        try {
            final Class<?> MainClazz = this.classLoader.loadClass("net.minecraft.client.main.Main");
            final Method entryMethod = MainClazz.getMethod("main", String[].class);

            Thread.currentThread().setContextClassLoader(this.classLoader);

            entryMethod.invoke(MainClazz, (Object) ArrayUtils.concat(new String[]{"--version", "zani client", "--accessToken", "0", "--assetsDir", "assets", "--assetIndex", "1.8", "--userProperties", "{}"}, args));
        } catch (Exception e) {
            logger.error("Failed to launch Minecraft");
            e.printStackTrace();

            System.exit(1);
        }
    }

    private void registerTransformers() {
        logger.info("Registering transformers");

        this.classLoader.registerClassTransformer(new MinecraftClassTransformer());
    }
}