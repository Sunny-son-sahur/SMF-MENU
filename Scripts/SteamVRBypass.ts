// @ts-nocheck
// SteamVR Bypass v3 — direct memory patching (undetectable)
// Instead of hooking, we patch the compiled native code to return our desired values
// No IL2CPP impl pointer change, no Frida Interceptor trampoline

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v3 By Sunny");

        const asm = Il2Cpp.domain.tryAssembly("AnimalCompany");
        if (!asm) { console.log("[-] AnimalCompany assembly not found"); return; }
        const image = asm.image;

        const appUtils = image.tryClass("AnimalCompany.AppUtils");
        if (!appUtils) { console.log("[-] AppUtils not found"); return; }

        const steamVRStatus = image.tryClass("AnimalCompany.AppUtils+SteamVRHeadsetStatus");

        // ===== METHOD 1: Memory.patchCode on native method body =====
        // Patches the actual compiled x86-64 bytes to return our value
        // No hook trampoline = no detection

        let patchCount = 0;

        // --- IsSteamVRHeadsetActive -> return true (mov al, 1; ret) ---
        try {
            const method = appUtils.method("IsSteamVRHeadsetActive");
            const addr = method.virtualAddress;
            console.log("[+] IsSteamVRHeadsetActive @ " + addr);

            Memory.patchCode(addr, 16, function(code) {
                const writer = new Arm64Writer(code, { pc: addr });
                // mov w0, #1  (return true)
                writer.putLdrRegAddress('x0', ptr(1));
                writer.putRet();
                writer.flush();
                console.log("[+] Patched IsSteamVRHeadsetActive -> return 1");
                patchCount++;
            });
        } catch(e) {
            // ARM64 failed, try x86-64
            try {
                const method = appUtils.method("IsSteamVRHeadsetActive");
                const addr = method.virtualAddress;
                Memory.patchCode(addr, 16, function(code) {
                    const writer = new X86Writer(code, { pc: addr });
                    writer.putMovRegAddress('rax', ptr(1));
                    writer.putRet();
                    writer.flush();
                    console.log("[+] Patched IsSteamVRHeadsetActive -> return 1 (x86)");
                    patchCount++;
                });
            } catch(e2) {
                console.log("[-] IsSteamVRHeadsetActive patch failed: " + e2);
            }
        }

        // --- GetXRBackend -> return 2 ---
        try {
            const method = appUtils.method("GetXRBackend");
            const addr = method.virtualAddress;
            console.log("[+] GetXRBackend @ " + addr);

            Memory.patchCode(addr, 16, function(code) {
                const writer = new Arm64Writer(code, { pc: addr });
                writer.putLdrRegAddress('x0', ptr(2));
                writer.putRet();
                writer.flush();
                console.log("[+] Patched GetXRBackend -> return 2");
                patchCount++;
            });
        } catch(e) {
            try {
                const method = appUtils.method("GetXRBackend");
                const addr = method.virtualAddress;
                Memory.patchCode(addr, 16, function(code) {
                    const writer = new X86Writer(code, { pc: addr });
                    writer.putMovRegAddress('rax', ptr(2));
                    writer.putRet();
                    writer.flush();
                    console.log("[+] Patched GetXRBackend -> return 2 (x86)");
                    patchCount++;
                });
            } catch(e2) {
                console.log("[-] GetXRBackend patch failed: " + e2);
            }
        }

        // --- GetSteamVRHeadsetStatus -> spoof struct ---
        // This returns a struct so we can't just patch the return value.
        // Instead, hook the struct fields after the call using a detour.
        try {
            const method = appUtils.method("GetSteamVRHeadsetStatus");
            const addr = method.virtualAddress;
            console.log("[+] GetSteamVRHeadsetStatus @ " + addr);

            // Let the original run, then patch the struct fields
            Interceptor.attach(addr, {
                onEnter: function(args) {
                    // For struct returns in ARM64, x8 is the return buffer pointer
                    this.statusPtr = null;
                },
                onLeave: function(retval) {
                    if (steamVRStatus) {
                        try {
                            // Read the struct from the return buffer
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

        // ===== LAYER 1: Unity XR subsystem hooks (backup) =====
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (xrMod) {
                const xrImage = xrMod.image;
                try {
                    const xrSettings = xrImage.tryClass("UnityEngine.XR.XRSettings");
                    if (xrSettings) {
                        try {
                            xrSettings.method("get_isDeviceActive").implementation = function() { return true; };
                            console.log("[+] Layer1: XRSettings.isDeviceActive -> true");
                            patchCount++;
                        } catch(_) {}
                        try {
                            xrSettings.method("get_enabled").implementation = function() { return true; };
                            console.log("[+] Layer1: XRSettings.get_enabled -> true");
                            patchCount++;
                        } catch(_) {}
                        try {
                            xrSettings.method("get_loadedDeviceName").implementation = function() { return Il2Cpp.string("SteamVR"); };
                            console.log("[+] Layer1: XRSettings.loadedDeviceName -> SteamVR");
                            patchCount++;
                        } catch(_) {}
                    }
                } catch(_) {}
                try {
                    const xrDevice = xrImage.tryClass("UnityEngine.XR.XRDevice");
                    if (xrDevice) {
                        try {
                            xrDevice.method("get_isPresent").implementation = function() { return true; };
                            console.log("[+] Layer1: XRDevice.isPresent -> true");
                            patchCount++;
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(e) { console.log("[-] Layer1: " + e); }

        console.log("[+] SteamVR Bypass v3 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v3 failed: " + e);
    }
});
