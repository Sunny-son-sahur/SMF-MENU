// @ts-nocheck
// SteamVR Bypass v3 — direct memory patching (undetectable)
// Patches compiled x86-64 bytes directly — no hooks, no trampolines

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v3 By Sunny");

        const asm = Il2Cpp.domain.tryAssembly("AnimalCompany");
        if (!asm) { console.log("[-] AnimalCompany assembly not found"); return; }
        const image = asm.image;

        const appUtils = image.tryClass("AnimalCompany.AppUtils");
        if (!appUtils) { console.log("[-] AppUtils not found"); return; }

        const steamVRStatus = image.tryClass("AnimalCompany.AppUtils+SteamVRHeadsetStatus");

        let patchCount = 0;

        // --- IsSteamVRHeadsetActive -> return true ---
        // x86-64: mov eax, 1; ret  = B8 01 00 00 00 C3
        try {
            const method = appUtils.method("IsSteamVRHeadsetActive");
            const addr = method.virtualAddress;
            console.log("[+] IsSteamVRHeadsetActive @ " + addr);
            Memory.patchCode(addr, 16, function(code) {
                code.writeU8(0xB8);
                code.writeU32(1);
                code.writeU8(0xC3);
            });
            console.log("[+] Patched IsSteamVRHeadsetActive -> return 1");
            patchCount++;
        } catch(e) {
            console.log("[-] IsSteamVRHeadsetActive patch failed: " + e);
        }

        // --- GetXRBackend -> return 2 ---
        // x86-64: mov eax, 2; ret  = B8 02 00 00 00 C3
        try {
            const method = appUtils.method("GetXRBackend");
            const addr = method.virtualAddress;
            console.log("[+] GetXRBackend @ " + addr);
            Memory.patchCode(addr, 16, function(code) {
                code.writeU8(0xB8);
                code.writeU32(2);
                code.writeU8(0xC3);
            });
            console.log("[+] Patched GetXRBackend -> return 2");
            patchCount++;
        } catch(e) {
            console.log("[-] GetXRBackend patch failed: " + e);
        }

        // --- GetSteamVRHeadsetStatus -> spoof struct ---
        // Returns a struct, can't just patch return value — use Interceptor
        try {
            const method = appUtils.method("GetSteamVRHeadsetStatus");
            const addr = method.virtualAddress;
            console.log("[+] GetSteamVRHeadsetStatus @ " + addr);

            Interceptor.attach(addr, {
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
            console.log("[+] Hooked GetSteamVRHeadsetStatus struct fields");
            patchCount++;
        } catch(e) {
            console.log("[-] GetSteamVRHeadsetStatus failed: " + e);
        }

        // ===== Unity XR subsystem hooks (backup) =====
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (xrMod) {
                const xrImage = xrMod.image;
                try {
                    const xrSettings = xrImage.tryClass("UnityEngine.XR.XRSettings");
                    if (xrSettings) {
                        try {
                            xrSettings.method("get_isDeviceActive").implementation = function() { return true; };
                            console.log("[+] XRSettings.isDeviceActive -> true");
                            patchCount++;
                        } catch(_) {}
                        try {
                            xrSettings.method("get_enabled").implementation = function() { return true; };
                            console.log("[+] XRSettings.get_enabled -> true");
                            patchCount++;
                        } catch(_) {}
                        try {
                            xrSettings.method("get_loadedDeviceName").implementation = function() { return Il2Cpp.string("SteamVR"); };
                            console.log("[+] XRSettings.loadedDeviceName -> SteamVR");
                            patchCount++;
                        } catch(_) {}
                    }
                } catch(_) {}
                try {
                    const xrDevice = xrImage.tryClass("UnityEngine.XR.XRDevice");
                    if (xrDevice) {
                        try {
                            xrDevice.method("get_isPresent").implementation = function() { return true; };
                            console.log("[+] XRDevice.isPresent -> true");
                            patchCount++;
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(e) { console.log("[-] XR hooks: " + e); }

        console.log("[+] SteamVR Bypass v3 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v3 failed: " + e);
    }
});
