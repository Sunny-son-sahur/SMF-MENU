// @ts-nocheck
// SteamVR Bypass v6 — scan for VR init MonoBehaviour at runtime

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

        // ===== 2. Hook Unity XR subsystem classes =====
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (xrMod) {
                const xrImg = xrMod.image;

                try {
                    const cls = xrImg.class("UnityEngine.XR.XRInputSubsystem");
                    const m = cls.method("get_running");
                    m.implementation = function() { return true; };
                    console.log("[+] XRInputSubsystem.get_running -> true");
                    patchCount++;
                } catch(_) {}

                try {
                    const cls = xrImg.class("UnityEngine.XR.XRDisplaySubsystem");
                    const m = cls.method("get_running");
                    m.implementation = function() { return true; };
                    console.log("[+] XRDisplaySubsystem.get_running -> true");
                    patchCount++;
                } catch(_) {}
            }
        } catch(e) { console.log("[-] XR hooks: " + e); }

        // ===== 3. Find ALL GameObjects and scan for VR-related ones =====
        console.log("\n[+] Scanning scene GameObjects for VR components...");

        const coreAsm = Il2Cpp.domain.tryAssembly("UnityEngine.CoreModule");
        if (!coreAsm) { console.log("[-] CoreModule not found"); return; }

        const objectClass = coreAsm.class("UnityEngine.Object");
        const goClass = coreAsm.class("UnityEngine.GameObject");
        const mbClass = coreAsm.class("UnityEngine.MonoBehaviour");
        const transformClass = coreAsm.class("UnityEngine.Transform");
        const textClass = coreAsm.tryClass("UnityEngine.UI.Text");

        // Find all GameObjects
        const findAllGO = objectClass.method("FindObjectsOfType", 1);

        try {
            const allGOs = findAllGO.invoke(goClass, null).toArray();
            console.log("[+] Total GameObjects in scene: " + allGOs.length);

            for (const go of allGOs) {
                try {
                    const nameMethod = go.method("get_name");
                    const name = nameMethod.invoke().toString().toLowerCase();

                    if (name.includes("vr") || name.includes("steam") || name.includes("xr") ||
                        name.includes("headset") || name.includes("connect") || name.includes("retry") ||
                        name.includes("network") || name.includes("photon")) {

                        // Get full path
                        let path = "";
                        try {
                            const t = go.method("get_transform").invoke();
                            let current = t;
                            while (current) {
                                try {
                                    const pGo = current.method("get_gameObject").invoke();
                                    const pName = pGo.method("get_name").invoke().toString();
                                    path = path ? pName + "/" + path : pName;
                                    current = current.method("get_parent").invoke();
                                } catch(_) { break; }
                            }
                        } catch(_) {}

                        console.log("[GO] " + go.method("get_name").invoke().toString() + " -> " + path);

                        // List all components
                        try {
                            const components = go.method("GetComponents", 1).invoke(
                                Il2Cpp.domain.assembly("mscorlib").class("System.Type").array(0), null
                            );
                        } catch(_) {}

                        // Try GetComponents<Component>
                        try {
                            const componentClass = coreAsm.class("UnityEngine.Component");
                            const getComps = go.method("GetComponentsInChildren", 1);
                            const comps = getComps.invoke(componentClass, null).toArray();
                            for (const comp of comps) {
                                try {
                                    const compType = comp.method("GetType").invoke();
                                    const typeName = compType.method("get_Name").invoke().toString();
                                    console.log("  Component: " + typeName);

                                    // If it's a MonoBehaviour, try to disable it
                                    if (typeName.toLowerCase().includes("vr") || typeName.toLowerCase().includes("steam") ||
                                        typeName.toLowerCase().includes("xr") || typeName.toLowerCase().includes("connect")) {
                                        try {
                                            const enabled = comp.method("get_enabled").invoke().toInt32();
                                            console.log("    enabled=" + enabled);
                                        } catch(_) {}
                                    }
                                } catch(_) {}
                            }
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(e) { console.log("[-] GO scan error: " + e); }

        // ===== 4. Find Text components with VR message =====
        if (textClass) {
            try {
                const allTexts = findAllGO.invoke(textClass, null).toArray();
                console.log("\n[+] Text components with 'VR' or 'connect': " + allTexts.length + " total");
                for (const t of allTexts) {
                    try {
                        const textVal = t.method("get_text").invoke();
                        if (textVal) {
                            const str = textVal.toString();
                            if (str.toLowerCase().includes("vr") || str.toLowerCase().includes("connect") || str.toLowerCase().includes("retry")) {
                                console.log("[TEXT] \"" + str + "\"");
                                try {
                                    const go = t.method("get_gameObject").invoke();
                                    const goName = go.method("get_name").invoke().toString();
                                    console.log("  On GameObject: " + goName);

                                    // Disable the GameObject to hide the message
                                    go.method("set_active").invoke(Il2Cpp.boolean(false));
                                    console.log("  -> GameObject DISABLED!");
                                    patchCount++;
                                } catch(_) {}
                            }
                        }
                    } catch(_) {}
                }
            } catch(e) { console.log("[-] Text scan error: " + e); }
        }

        // ===== 5. Find MonoBehaviours with VR-related class names =====
        try {
            const allMBs = findAllGO.invoke(mbClass, null).toArray();
            console.log("\n[+] Scanning " + allMBs.length + " MonoBehaviours for VR...");
            for (const mb of allMBs) {
                try {
                    const mbType = mb.method("GetType").invoke();
                    const typeName = mbType.method("get_Name").invoke().toString().toLowerCase();
                    const fullTypeName = "";
                    try {
                        const ns = mbType.method("get_Namespace").invoke();
                        const nsStr = ns ? ns.toString() : "";
                        const asmName = mbType.method("get_Assembly").invoke().method("get.GetName").invoke().method("get_Name").invoke().toString();
                        fullTypeName = nsStr + "." + typeName + " [" + asmName + "]";
                    } catch(_) {}

                    if (typeName.includes("vr") || typeName.includes("steam") || typeName.includes("xr") ||
                        typeName.includes("headset") || typeName.includes("connect") || typeName.includes("retry") ||
                        typeName.includes("openvr") || typeName.includes("openxr")) {
                        console.log("[VR MB] " + (fullTypeName || typeName));
                        try {
                            const go = mb.method("get_gameObject").invoke();
                            const goName = go.method("get_name").invoke().toString();
                            console.log("  GameObject: " + goName);
                            const enabled = mb.method("get_enabled").invoke().toInt32();
                            console.log("  enabled=" + enabled);

                            // List methods
                            try {
                                const methods = mbType.method("GetMethods", 1).invoke(
                                    Il2Cpp.domain.assembly("mscorlib").class("System.Reflection.BindingFlags").box(0x3FF), null
                                ).toArray();
                                for (const m of methods) {
                                    const mName = m.method("get_Name").invoke().toString();
                                    if (!mName.startsWith("get_") && !mName.startsWith("set_") && !mName.startsWith("add_") && !mName.startsWith("remove_") && !mName.startsWith("Equals") && !mName.startsWith("GetHash") && !mName.startsWith("ToString")) {
                                        console.log("    Method: " + mName);
                                    }
                                }
                            } catch(_) {}
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(e) { console.log("[-] MB scan error: " + e); }

        console.log("\n[+] SteamVR Bypass v6 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v6 failed: " + e);
    }
});
