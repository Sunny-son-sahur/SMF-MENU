// @ts-nocheck
declare const Il2Cpp: any;

Il2Cpp.perform(() => {
    console.log("\n========== DUMP START ==========\n");

    const images = Il2Cpp.domain.assemblies;
    let acImg: any = null;
    for (let i = 0; i < images.length; i++) {
        try {
            const img = images[i].image;
            if (img.name === "Assembly-CSharp.dll") { acImg = img; break; }
        } catch(_) {}
    }

    if (!acImg) {
        console.error("[DUMP] Assembly-CSharp not found!");
        return;
    }

    function dumpMethods(className: string) {
        try {
            const cls = acImg.class("AnimalCompany." + className);
            if (!cls) { console.log("[DUMP] " + className + " not found"); return; }
            const methods = cls.methods;
            const out: string[] = [];
            for (let i = 0; i < methods.length; i++) {
                try {
                    const m = methods[i];
                    const params = m.parameterCount;
                    const isStatic = m.isStatic;
                    const retType = m.returnType ? m.returnType.name : "?";
                    out.push((isStatic ? "static " : "") + retType + " " + m.name + "(" + params + ")");
                } catch(_) {}
            }
            console.log("\n[DUMP] === " + className + " (" + out.length + " methods) ===");
            console.log(out.join("\n"));
        } catch(e) {
            console.error("[DUMP] " + className + " failed: " + e);
        }
    }

    function dumpFields(className: string) {
        try {
            const cls = acImg.class("AnimalCompany." + className);
            if (!cls) return;
            const fields = cls.fields;
            const out: string[] = [];
            for (let i = 0; i < fields.length; i++) {
                try {
                    const f = fields[i];
                    const isStatic = f.isStatic;
                    const typeName = f.fieldType ? f.fieldType.name : "?";
                    out.push((isStatic ? "static " : "") + typeName + " " + f.name);
                } catch(_) {}
            }
            console.log("\n[DUMP] === " + className + " fields (" + out.length + ") ===");
            console.log(out.join("\n"));
        } catch(e) {
            console.error("[DUMP] " + className + " fields failed: " + e);
        }
    }

    function dumpProperties(className: string) {
        try {
            const cls = acImg.class("AnimalCompany." + className);
            if (!cls) return;
            const props = cls.properties;
            const out: string[] = [];
            for (let i = 0; i < props.length; i++) {
                try {
                    const p = props[i];
                    const typeName = p.type ? p.type.name : "?";
                    out.push(typeName + " " + p.name);
                } catch(_) {}
            }
            console.log("\n[DUMP] === " + className + " properties (" + out.length + ") ===");
            console.log(out.join("\n"));
        } catch(e) {
            console.error("[DUMP] " + className + " properties failed: " + e);
        }
    }

    dumpMethods("PrefabGenerator");
    dumpFields("PrefabGenerator");
    dumpProperties("PrefabGenerator");

    dumpMethods("GrabbableItem");
    dumpFields("GrabbableItem");

    dumpMethods("GrabbableObject");
    dumpFields("GrabbableObject");

    dumpMethods("NetPlayer");
    dumpFields("NetPlayer");

    dumpMethods("PickupManager");
    dumpFields("PickupManager");

    dumpMethods("BackpackItem");
    dumpFields("BackpackItem");

    dumpMethods("ArenaGameManager");

    dumpMethods("GorillaLocomotion");

    dumpMethods("ElevatorManager");

    dumpMethods("MobSpawnValidator");

    dumpMethods("ItemSellingMachineController");

    try {
        const enums = ["E_GrabbableItemPrefab", "MobID", "E_SFX"];
        for (const eName of enums) {
            try {
                const eCls = acImg.enum("AnimalCompany." + eName);
                const names = eCls.getNames();
                console.log("\n[DUMP] === " + eName + " (" + names.length + " values) ===");
                for (let i = 0; i < names.length; i++) {
                    try {
                        const val = eCls.getEntry(names[i]).value;
                        console.log("  " + names[i] + " = " + val);
                    } catch(_) {}
                }
            } catch(_) {}
        }
    } catch(e) {
        console.error("[DUMP] Enums failed: " + e);
    }

    try {
        const fusionImg = Il2Cpp.domain.assembly("Fusion.Runtime").image;
        const rpcClasses = ["NetworkBehaviour", "NetworkObject"];
        for (const rc of rpcClasses) {
            try {
                const cls = fusionImg.class("Fusion." + rc);
                if (!cls) continue;
                const methods = cls.methods;
                const out: string[] = [];
                for (let i = 0; i < methods.length; i++) {
                    try {
                        const m = methods[i];
                        if (m.name.toLowerCase().includes("spawn") || m.name.toLowerCase().includes("rpc") || m.name.toLowerCase().includes("player")) {
                            out.push((m.isStatic ? "static " : "") + (m.returnType ? m.returnType.name : "?") + " " + m.name + "(" + m.parameterCount + ")");
                        }
                    } catch(_) {}
                }
                if (out.length > 0) {
                    console.log("\n[DUMP] === Fusion." + rc + " (filtered) ===");
                    console.log(out.join("\n"));
                }
            } catch(_) {}
        }
    } catch(e) {
        console.error("[DUMP] Fusion dump failed: " + e);
    }

    try {
        const acClasses = acImg.classes;
        const spawnRelated: string[] = [];
        for (let i = 0; i < acClasses.length; i++) {
            try {
                const clsName = acClasses[i].name;
                if (clsName.toLowerCase().includes("spawn") || clsName.toLowerCase().includes("prefab") || clsName.toLowerCase().includes("item")) {
                    spawnRelated.push(clsName);
                }
            } catch(_) {}
        }
        console.log("\n[DUMP] === Spawn/Item/Prefab related classes ===");
        console.log(spawnRelated.join("\n"));
    } catch(e) {
        console.error("[DUMP] Class scan failed: " + e);
    }

    console.log("\n========== DUMP DONE ==========\n");
});
