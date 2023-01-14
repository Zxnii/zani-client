package wtf.zani.client.asm.transformers;

import net.minecraft.client.Minecraft;
import org.lwjgl.opengl.Display;
import org.objectweb.asm.tree.ClassNode;
import org.objectweb.asm.tree.MethodNode;
import wtf.zani.client.asm.TransformingException;

public class MinecraftClassTransformer extends ClassTransformer {
    @Override
    public String getName() {
        return "Test";
    }

    @Override
    public void transform(ClassNode clazz) throws TransformingException {
        for (final MethodNode methodNode : clazz.methods) {
            if (methodNode.name.equals("createDisplay")) {
                this.insertMethodTail(methodNode, MinecraftClassTransformer.class, "modifyTitle");
            }
        }
    }

    @Override
    public boolean transformSupported(String className) {
        return className.equals(Minecraft.class.getName());
    }

    public void modifyTitle() {
        Display.setTitle("zani client");
    }
}
