// @ts-nocheck
// SteamVR Bypass v6 — find and disable the VR connection retry loop

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v6 By Sunny");

        const asm = Il2Cpp.domain.tryAssembly("AnimalCompany");
        if (!asm) { console.log("[-] AnimalCompany assembly not found"); return; }
        const image = asm.image;

        let patchCount = 0;

        // ===== 1. Patch AppUtils (raw bytes) =====
        const appUtils = image.tryClass("AnimalCompany.AppUtils");
        if (appUtils) {
            try {
                const m = appUtils.method("IsSteamVRHeadsetActive");
                Memory.patchCode(m.virtualAddress, 16, function(code) {
                    code.writeU8(0xB8); code.writeU32(1); code.writeU8(0xC3);
                });
                console.log("[+] IsSteamVRHeadsetActive -> 1");
                patchCount++;
            } catch(e) { console.log("[-] " + e); }

            try {
                const m = appUtils.method("GetXRBackend");
                Memory.patchCode(m.virtualAddress, 16, function(code) {
                    code.writeU8(0xB8); code.writeU32(2); code.writeU8(0xC3);
                });
                console.log("[+] GetXRBackend -> 2");
                patchCount++;
            } catch(e) { console.log("[-] " + e); }

            try {
                const steamVRStatus = image.tryClass("AnimalCompany.AppUtils+SteamVRHeadsetStatus");
                const m = appUtils.method("GetSteamVRHeadsetStatus");
                Interceptor.attach(m.virtualAddress, {
                    onLeave: function(retval) {
                        if (steamVRStatus) {
                            try {
                                const st = steamVRStatus.new().unbox();
                                st.field("activeLoaderPresent").value = true;
                                st.field("xrDisplayRunning").value = true;
                                st.field("headDeviceValid").value = true;
                                st.field("userPresenceKnown").value = true;
                                st.field("userPresent").value = true;
                            } catch(_) {}
                        }
                    }
                });
                console.log("[+] GetSteamVRHeadsetStatus spoofed");
                patchCount++;
            } catch(e) { console.log("[-] " + e); }
        }

        // ===== 2. Find ALL types that reference "Cannot connect to VR" =====
        // Search for types with VR-related methods and hook their coroutines
        console.log("\n[+] Scanning for VR connection types...");

        image.types.forEach(function(type) {
            try {
                const typeName = type.name.toLowerCase();
                const fullName = type.fullName.toLowerCase();

                // Look for VR initialization / connection types
                if (typeName.includes("vr") || typeName.includes("connect") || typeName.includes("init") ||
                    typeName.includes("steam") || typeName.includes("headset") || typeName.includes("startup")) {
                    console.log("[TYPE] " + type.fullName);
                    try {
                        type.methods.forEach(function(m) {
                            try {
                                console.log("    " + m.name + " -> " + (m.returnType ? m.returnType.name : "?"));
                            } catch(_) {}
                        });
                    } catch(_) {}
                }
            } catch(_) {}
        });

        // ===== 3. Search for ALL methods containing "VR" in their name =====
        console.log("\n[+] Methods containing 'VR' or 'Steam' or 'Headset':");
        image.types.forEach(function(type) {
            try {
                type.methods.forEach(function(m) {
                    try {
                        const name = m.name.toLowerCase();
                        if (name.includes("vr") || name.includes("steam") || name.includes("headset") || name.includes("xr")) {
                            console.log("[METHOD] " + type.name + "." + m.name + " -> " + (m.returnType ? m.returnType.name : "?"));
                        }
                    } catch(_) {}
                });
            } catch(_) {}
        });

        // ===== 4. Find VR-related MonoBehaviours and disable them =====
        console.log("\n[+] Searching for VR MonoBehaviours to disable...");
        try {
            const goClass = Il2Cpp.domain.assembly("UnityEngine.CoreModule").class("UnityEngine.GameObject");
            const findObjects = Il2Cpp.domain.assembly("UnityEngine.CoreModule").class("UnityEngine.Object").method("FindObjectsOfType", 1);

            // Find all MonoBehaviours
            const mbClass = Il2Cpp.domain.assembly("UnityEngine.CoreModule").class("UnityEngine.MonoBehaviour");
            const allMBs = findObjects.invoke(mbClass, null).toArray();
            console.log("[+] Total MonoBehaviours: " + allMBs.length);

            for (const mb of allMBs) {
                try {
                    const go = mb.method("get_gameObject").invoke();
                    const goName = go.method("get_name").invoke().toString();
                    const typeName = mb.object.getClass().name;

                    if (goName.toLowerCase().includes("vr") || goName.toLowerCase().includes("steam") ||
                        typeName.toLowerCase().includes("vr") || typeName.toLowerCase().includes("steam") ||
                        typeName.toLowerCase().includes("xr") || typeName.toLowerCase().includes("connect")) {
                        console.log("[VR MB] " + typeName + " on " + goName);

                        // Try to disable it
                        try {
                            const enabled = mb.method("get_enabled").invoke().toInt32();
                            if (enabled) {
                                mb.method("set_enabled").invoke(Il2Cpp.boolean(false));
                                console.log("  -> DISABLED!");
                                patchCount++;
                            }
                        } catch(_) {}

                        // List its methods
                        try {
                            mb.object.getClass().methods.forEach(function(m) {
                                try {
                                    console.log("    Method: " + m.name);
                                } catch(_) {}
                            });
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(e) { console.log("[-] MonoBehaviour scan error: " + e); }

        // ===== 5. Hook Application.dataPath to log VR asset paths =====
        try {
            const appClass = Il2Cpp.domain.assembly("UnityEngine.CoreModule").class("UnityEngine.Application");
            const getDataPath = appClass.method("get_dataPath");
            Interceptor.attach(getDataPath.virtualAddress, {
                onLeave: function(retval) {
                    // Don't spam
                }
            });
        } catch(_) {}

        console.log("\n[+] SteamVR Bypass v6 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v6 failed: " + e);
    }
});
