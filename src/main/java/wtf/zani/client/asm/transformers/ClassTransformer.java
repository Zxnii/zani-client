package wtf.zani.client.asm.transformers;

import org.apache.logging.log4j.Logger;
import org.objectweb.asm.tree.*;
import wtf.zani.client.asm.TransformingException;
import wtf.zani.client.asm.util.ClassUtils;
import wtf.zani.client.asm.util.MethodUtils;
import wtf.zani.client.bootstrap.Bootstrap;

import static org.objectweb.asm.Opcodes.RETURN;

public abstract class ClassTransformer {
    protected final Logger logger = Bootstrap.getLogger();

    protected ClassTransformer() {

    }

    public abstract String getName();

    public abstract void transform(ClassNode node) throws TransformingException;
    public abstract boolean transformSupported(String className);

    protected void clearInstructions(MethodNode methodNode)
    {
        methodNode.instructions.clear();

        if (!methodNode.localVariables.isEmpty()) methodNode.localVariables.clear();
        if (!methodNode.tryCatchBlocks.isEmpty()) methodNode.tryCatchBlocks.clear();
    }

    protected InsnList createInstructionList(AbstractInsnNode... instructions) {
        final InsnList instructionList = new InsnList();

        for (final AbstractInsnNode instruction : instructions) {
            instructionList.add(instruction);
        }

        return instructionList;
    }

    protected void insertMethodHead(MethodNode targetNode, Class<?> methodOwner, String methodName, Class<?>... methodArgs) throws TransformingException {
        final MethodNode methodNode = ClassUtils.findMethodNodeOnClass(methodOwner, methodName, methodArgs);

        if (methodNode == null) {
            throw new TransformingException("Could not find " + methodName + " with specified arguments in " + methodOwner.getName());
        }

        final InsnList instructions = MethodUtils.sanitizeMethodForSplicing(methodNode);

        targetNode.instructions.insert(instructions);
    }

    protected void insertMethodTail(MethodNode targetNode, Class<?> methodOwner, String methodName, Class<?>... methodArgs) throws TransformingException {
        final MethodNode methodNode = ClassUtils.findMethodNodeOnClass(methodOwner, methodName, methodArgs);

        if (methodNode == null) {
            throw new TransformingException("Could not find " + methodName + " with specified arguments in " + methodOwner.getName());
        }

        final InsnList instructions = MethodUtils.sanitizeMethodForSplicing(methodNode);

        InsnNode lastReturn = null;

        for (final AbstractInsnNode instruction : targetNode.instructions) {
            // todo: handle returning of integers, etc
            if (instruction instanceof InsnNode && instruction.getOpcode() == RETURN) {
                lastReturn = (InsnNode) instruction;
            }
        }

        if (lastReturn == null) {
            throw new TransformingException("Could not find a end return node in " + targetNode.name);
        }

        targetNode.instructions.remove(lastReturn);
        targetNode.instructions.add(instructions);
        targetNode.instructions.add(lastReturn);
    }

    protected void overwriteMethod(MethodNode targetNode, Class<?> methodOwner, String methodName, Class<?>... methodArgs) throws TransformingException {
        final MethodNode methodNode = ClassUtils.findMethodNodeOnClass(methodOwner, methodName, methodArgs);

        if (methodNode == null) {
            throw new TransformingException("Could not find " + methodName + " with specified arguments in " + methodOwner.getName());
        }

        this.clearInstructions(targetNode);

        targetNode.instructions.insert(methodNode.instructions);
    }
}
