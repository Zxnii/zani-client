package wtf.zani.client.asm.util;

import org.apache.commons.io.IOUtils;
import org.objectweb.asm.ClassReader;
import org.objectweb.asm.tree.ClassNode;
import org.objectweb.asm.tree.MethodNode;
import wtf.zani.client.bootstrap.Bootstrap;

import java.io.IOException;
import java.io.InputStream;
import java.lang.reflect.Method;

public class ClassUtils {
    public static MethodNode findMethodNodeOnClass(Class<?> methodOwner, String methodName, Class<?>... methodArgs) {
        String methodSignature;

        try {
            Method method = methodOwner.getMethod(methodName, methodArgs);

            methodSignature = MethodUtils.getMethodSignature(method);
        } catch (Exception e) {
            return null;
        }

        final InputStream inputStream = Bootstrap.getInstance().getClassLoader().getResourceAsStream(methodOwner.getName().replace('.', '/') + ".class");

        if (inputStream == null) {
            return null;
        }

        byte[] targetClassBytes;

        try {
            targetClassBytes = IOUtils.toByteArray(inputStream);
        } catch (IOException e) {
            return null;
        }

        final ClassNode targetClass = new ClassNode();
        final ClassReader classReader = new ClassReader(targetClassBytes);

        classReader.accept(targetClass, 0);

        for (final MethodNode node : targetClass.methods) {
            if (node.name.equals(methodName)
                    && (node.signature == null || node.signature.equals(methodSignature))) {
                return node;
            }
        }

        return null;
    }
}
