using Mono.Cecil;
using Mono.Cecil.Cil;
using System.Security.Cryptography;
using System.Text.Json;

if (args.Length != 1)
{
    Console.Error.WriteLine("Usage: PatchSts2Bridges <staged sts2.dll path>");
    return 2;
}

string targetPath = Path.GetFullPath(args[0]);
if (!File.Exists(targetPath))
{
    Console.Error.WriteLine($"Staged game assembly not found: {targetPath}");
    return 2;
}

string temporaryPath = targetPath + ".bridge-patch.tmp";
var resolver = new DefaultAssemblyResolver();
resolver.AddSearchDirectory(Path.GetDirectoryName(targetPath)!);
DirectoryInfo runtimeDirectory = new(Path.GetDirectoryName(targetPath)!);
string projectRoot = runtimeDirectory.Parent?.Parent?.FullName
    ?? throw new InvalidOperationException("Could not locate the project root from the staged assembly path.");
string referencePath = Path.Combine(projectRoot, "reference", "sts2.dll");
string manifestPath = Path.Combine(projectRoot, "docs", "reference-manifest.json");
if (!File.Exists(referencePath) || !File.Exists(manifestPath))
    throw new FileNotFoundException("The provided reference/sts2.dll and docs/reference-manifest.json are required before patching.");
string expectedHash = JsonDocument.Parse(File.ReadAllText(manifestPath)).RootElement
    .GetProperty("files").GetProperty("sts2.dll").GetString()!;
string sourceHash = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(referencePath))).ToLowerInvariant();
if (!string.Equals(expectedHash, sourceHash, StringComparison.OrdinalIgnoreCase))
    throw new InvalidOperationException("reference/sts2.dll does not match docs/reference-manifest.json; refusing to patch a different game build.");

using ModuleDefinition module = ModuleDefinition.ReadModule(targetPath, new ReaderParameters
{
    AssemblyResolver = resolver,
    InMemory = true,
    ReadSymbols = false
});
using (ModuleDefinition reference = ModuleDefinition.ReadModule(referencePath, new ReaderParameters { InMemory = true, ReadSymbols = false }))
    if (module.Mvid != reference.Mvid)
        throw new InvalidOperationException("runtime/lib/sts2.dll does not have the same MVID as the provided source assembly.");

AssemblyNameReference bridgeAssembly = module.AssemblyReferences.FirstOrDefault(reference => reference.Name == "SpireCli")
    ?? new AssemblyNameReference("SpireCli", new Version(1, 0, 0, 0));
if (!module.AssemblyReferences.Contains(bridgeAssembly)) module.AssemblyReferences.Add(bridgeAssembly);

int changed = 0;
changed += ReplaceAsyncEntryPoint(
    module,
    "MegaCrit.Sts2.Core.Commands.CardSelectCmd",
    "FromChooseABundleScreen",
    "SelectBundle");
changed += ReplaceAsyncEntryPoint(
    module,
    "MegaCrit.Sts2.Core.Commands.RelicSelectCmd",
    "FromChooseARelicScreen",
    "SelectRelic");
changed += WrapCardRewardAlternatives(module);

if (changed == 0)
{
    Console.WriteLine("All three command-choice bridge entry points were already patched.");
    return 0;
}

try
{
    if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
    module.Write(temporaryPath, new WriterParameters { WriteSymbols = false });
    File.Move(temporaryPath, targetPath, overwrite: true);
}
finally
{
    if (File.Exists(temporaryPath)) File.Delete(temporaryPath);
}

Console.WriteLine($"Patched {changed} command-choice entry point(s) in staged assembly: {targetPath}");
Console.WriteLine("The provided reference/sts2.dll file was not modified.");
return 0;

static int ReplaceAsyncEntryPoint(ModuleDefinition module, string typeName, string methodName, string bridgeMethodName)
{
    TypeDefinition type = FindType(module, typeName);
    MethodDefinition method = type.Methods.Single(candidate => candidate.Name == methodName);
    if (CallsBridge(method, bridgeMethodName)) return 0;
    if (!method.IsStatic || method.Parameters.Count != 2 || !method.ReturnType.FullName.StartsWith("System.Threading.Tasks.Task`1<", StringComparison.Ordinal))
        throw new InvalidOperationException($"Unexpected signature for {typeName}.{methodName}: {method.FullName}");

    MethodReference bridgeMethod = CreateBridgeMethod(module, bridgeMethodName, method.ReturnType, method.Parameters.Select(parameter => parameter.ParameterType).ToArray());
    ReplaceBody(method, [
        Instruction.Create(OpCodes.Ldarg_0),
        Instruction.Create(OpCodes.Ldarg_1),
        Instruction.Create(OpCodes.Call, bridgeMethod),
        Instruction.Create(OpCodes.Ret)
    ]);
    RemoveAsyncStateMachineAttribute(method);
    return 1;
}

static int WrapCardRewardAlternatives(ModuleDefinition module)
{
    const string typeName = "MegaCrit.Sts2.Core.Entities.CardRewardAlternatives.CardRewardAlternative";
    TypeDefinition type = FindType(module, typeName);
    MethodDefinition method = type.Methods.Single(candidate => candidate.Name == "Generate" && candidate.Parameters.Count == 1);
    if (CallsBridge(method, "WrapRewardAlternatives")) return 0;
    MethodReference bridgeMethod = CreateBridgeMethod(
        module,
        "WrapRewardAlternatives",
        method.ReturnType,
        [method.ReturnType, method.Parameters[0].ParameterType]);
    ILProcessor il = method.Body.GetILProcessor();
    foreach (Instruction ret in method.Body.Instructions.Where(instruction => instruction.OpCode == OpCodes.Ret).ToArray())
    {
        il.InsertBefore(ret, Instruction.Create(OpCodes.Ldarg_0));
        il.InsertBefore(ret, Instruction.Create(OpCodes.Call, bridgeMethod));
    }
    return 1;
}

static MethodReference CreateBridgeMethod(ModuleDefinition module, string name, TypeReference returnType, TypeReference[] parameters)
{
    AssemblyNameReference bridgeAssembly = module.AssemblyReferences.Single(reference => reference.Name == "SpireCli");
    var bridgeType = new TypeReference(string.Empty, "ChoiceAdapters", module, bridgeAssembly, false);
    var method = new MethodReference(name, returnType, bridgeType)
    {
        HasThis = false,
        ExplicitThis = false,
        CallingConvention = MethodCallingConvention.Default
    };
    foreach (TypeReference parameter in parameters) method.Parameters.Add(new ParameterDefinition(parameter));
    return method;
}

static bool CallsBridge(MethodDefinition method, string bridgeMethodName) =>
    method.Body.Instructions.Any(instruction => instruction.Operand is MethodReference reference
        && reference.DeclaringType.FullName == "ChoiceAdapters"
        && reference.Name == bridgeMethodName);

static TypeDefinition FindType(ModuleDefinition module, string fullName) =>
    module.Types.SelectMany(Flatten).Single(type => type.FullName == fullName);

static IEnumerable<TypeDefinition> Flatten(TypeDefinition type)
{
    yield return type;
    foreach (TypeDefinition nested in type.NestedTypes)
        foreach (TypeDefinition child in Flatten(nested)) yield return child;
}

static void ReplaceBody(MethodDefinition method, IReadOnlyList<Instruction> instructions)
{
    method.Body.Instructions.Clear();
    method.Body.ExceptionHandlers.Clear();
    method.Body.Variables.Clear();
    method.Body.InitLocals = false;
    ILProcessor il = method.Body.GetILProcessor();
    foreach (Instruction instruction in instructions) il.Append(instruction);
}

static void RemoveAsyncStateMachineAttribute(MethodDefinition method)
{
    for (int i = method.CustomAttributes.Count - 1; i >= 0; i--)
        if (method.CustomAttributes[i].AttributeType.FullName == "System.Runtime.CompilerServices.AsyncStateMachineAttribute")
            method.CustomAttributes.RemoveAt(i);
}
