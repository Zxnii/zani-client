package wtf.zani.client.asm.util;

import org.objectweb.asm.tree.AbstractInsnNode;
import org.objectweb.asm.tree.InsnList;
import org.objectweb.asm.tree.InsnNode;
import org.objectweb.asm.tree.MethodNode;

import java.lang.reflect.Method;

import static org.objectweb.asm.Opcodes.RETURN;

public class MethodUtils {
    public static String getMethodSignature(Method method) {
        final Class<?>[] parameters = method.getParameterTypes();

        final StringBuilder builder = new StringBuilder("(");

        for (final Class<?> parameter : parameters) {
            builder.append(getTypeSignature(parameter));
        }

        builder.append(")").append(getTypeSignature(method.getReturnType()));

        return builder.toString();
    }

    public static String getTypeSignature(Class<?> clazz) {
        String stringType = clazz.getName();

        switch (stringType) {
            case "int": {
                return "I";
            }
            case "byte": {
                return "B";
            }
            case "char": {
                return "C";
            }
            case "long": {
                return "J";
            }
            case "void": {
                return "V";
            }
            case "float": {
                return "F";
            }
            case "short": {
                return "S";
            }
            case "double": {
                return "D";
            }
            case "boolean": {
                return "Z";
            }
            default: {
                if (stringType.startsWith("[")) {
                    return stringType;
                } else {
                    return "L" + stringType + ";";
                }
            }
        }
    }

    public static InsnList sanitizeMethodForSplicing(MethodNode methodNode) {
        InsnList list = new InsnList();

        for (AbstractInsnNode instruction : methodNode.instructions) {
            // todo: handle returning of integers, etc
            if (instruction instanceof InsnNode && instruction.getOpcode() == RETURN) {
                continue;
            }

            list.add(instruction);
        }

        return list;
    }
}
