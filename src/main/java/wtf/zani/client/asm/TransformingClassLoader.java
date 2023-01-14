package wtf.zani.client.asm;

import com.google.common.collect.Lists;
import org.apache.commons.io.IOUtils;
import org.apache.logging.log4j.Logger;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.ClassWriter;
import org.objectweb.asm.tree.ClassNode;
import wtf.zani.client.bootstrap.Bootstrap;
import wtf.zani.client.asm.transformers.ClassTransformer;

import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public class TransformingClassLoader extends ClassLoader {
    private final List<ClassTransformer> transformers = Lists.newArrayList();
    private final List<String> transformablePackages = Lists.newArrayList(
            "net.minecraft",
            "net.optifine",
            "net.minecraftforge"
    );

    private final Logger logger = Bootstrap.getLogger();

    public TransformingClassLoader(ClassLoader parent) {
        super(parent);
    }

    public void addTransformablePackage(String packageName) {
        transformablePackages.add(packageName);
    }

    public void registerClassTransformer(ClassTransformer transformer) {
        final boolean exists = transformers.stream().anyMatch((existing) -> existing.getClass().getName().equals(transformer.getClass().getName()));

        if (!exists) {
            this.transformers.add(transformer);
        } else {
            throw new RuntimeException("Transformer is already registered: " + transformer.getClass().getName());
        }
    }

    @Override
    public String getName() {
        return "TransformingClassLoader";
    }

    @Override
    public Class<?> loadClass(String name) throws ClassNotFoundException {
        return this.loadClass(name, true);
    }

    @Override
    protected Class<?> loadClass(String name, boolean resolve) throws ClassNotFoundException {
        final Class<?> loadedClass = this.findLoadedClass(name);
        boolean tryTransform = false;

        for (final String allowedPackage : this.transformablePackages) {
            if (name.startsWith(allowedPackage)) {
                tryTransform = true;

                break;
            }
        }

        if (tryTransform && loadedClass == null) {
            final InputStream stream = this.getResourceAsStream(name.replace('.', '/') + ".class");

            if (stream == null) {
                throw new ClassNotFoundException(name);
            }

            try {
                final byte[] originalClass = IOUtils.toByteArray(stream);

                for (final ClassTransformer transformer : this.transformers) {
                    if (transformer.transformSupported(name)) {
                        this.logger.info("Transforming " + name);

                        final ClassNode classNode = new ClassNode();

                        final ClassReader reader = new ClassReader(originalClass);
                        final ClassWriter writer = new ClassWriter(reader, 0);

                        reader.accept(classNode, 0);

                        try {
                            transformer.transform(classNode);
                        } catch (TransformingException e) {
                            throw new RuntimeException(e);
                        }

                        classNode.accept(writer);

                        final byte[] transformedClass = writer.toByteArray();

                        this.logger.info("Transformed " + name);
                        this.dumpClass(name, transformedClass);

                        return this.defineClass(name, transformedClass, 0, transformedClass.length);
                    }
                }

                return defineClass(name, originalClass, 0, originalClass.length);
            } catch (IOException e) {
                throw new ClassNotFoundException(name);
            }
        } else if (!tryTransform) {
            return super.loadClass(name, resolve);
        }

        return loadedClass;
    }

    private void dumpClass(String name, byte[] data) {
        try {
            FileOutputStream file = new FileOutputStream(name + ".class");

            file.write(data);
        } catch (IOException e) {
            this.logger.error("Failed to dump class");
            e.printStackTrace();
        }
    }
}
