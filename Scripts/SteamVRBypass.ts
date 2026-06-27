// @ts-nocheck
// SteamVR Bypass v5 — patches AppUtils + hooks new Unity XR subsystem API

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v5 By Sunny");

        const asm = Il2Cpp.domain.tryAssembly("AnimalCompany");
        if (!asm) { console.log("[-] AnimalCompany assembly not found"); return; }
        const image = asm.image;

        const appUtils = image.tryClass("AnimalCompany.AppUtils");
        if (!appUtils) { console.log("[-] AppUtils not found"); return; }

        const steamVRStatus = image.tryClass("AnimalCompany.AppUtils+SteamVRHeadsetStatus");

        let patchCount = 0;

        // ===== 1. Patch AppUtils methods (raw x86-64 bytes) =====
        try {
            const m = appUtils.method("IsSteamVRHeadsetActive");
            Memory.patchCode(m.virtualAddress, 16, function(code) {
                code.writeU8(0xB8); code.writeU32(1); code.writeU8(0xC3);
            });
            console.log("[+] IsSteamVRHeadsetActive -> return 1");
            patchCount++;
        } catch(e) { console.log("[-] " + e); }

        try {
            const m = appUtils.method("GetXRBackend");
            Memory.patchCode(m.virtualAddress, 16, function(code) {
                code.writeU8(0xB8); code.writeU32(2); code.writeU8(0xC3);
            });
            console.log("[+] GetXRBackend -> return 2");
            patchCount++;
        } catch(e) { console.log("[-] " + e); }

        try {
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
            console.log("[+] GetSteamVRHeadsetStatus struct spoofed");
            patchCount++;
        } catch(e) { console.log("[-] " + e); }

        // ===== 2. Hook Unity XR subsystem classes (new API) =====
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (xrMod) {
                const xrImg = xrMod.image;

                // XRInputSubsystem — hook all bool methods to return true
                try {
                    const cls = xrImg.class("UnityEngine.XR.XRInputSubsystem");
                    const boolMethods = ["get_running", "TryStart", "TryGetInputDevices",
                        "TryGetDevices", "GetSupportedDevices", "get_runningInBackground",
                        "get_disableLegacyInput", "get_disablePositionTracking"];
                    for (const name of boolMethods) {
                        try {
                            const m = cls.method(name);
                            if (m && m.returnType && m.returnType.name === "System.Boolean") {
                                m.implementation = function() { return true; };
                                console.log("[+] XRInputSubsystem." + name + " -> true");
                                patchCount++;
                            }
                        } catch(_) {}
                    }
                } catch(_) {}

                // XRDisplaySubsystem — hook all bool methods to return true
                try {
                    const cls = xrImg.class("UnityEngine.XR.XRDisplaySubsystem");
                    const boolMethods = ["get_running", "TryStart", "get_displayActive",
                        "TryGetDisplayDescs", "get_renderViewportScale",
                        "get_enabled", "get_isDisplayActive"];
                    for (const name of boolMethods) {
                        try {
                            const m = cls.method(name);
                            if (m && m.returnType && m.returnType.name === "System.Boolean") {
                                m.implementation = function() { return true; };
                                console.log("[+] XRDisplaySubsystem." + name + " -> true");
                                patchCount++;
                            }
                        } catch(_) {}
                    }
                } catch(_) {}

                // InputDevices — make GetDeviceAtXRNode return a valid device
                // (already used by menu but we reinforce it)
                try {
                    const cls = xrImg.class("UnityEngine.XR.InputDevices");
                    try {
                        const m = cls.method("get_devices");
                        if (m) {
                            m.implementation = function() {
                                // Return a list with one device
                                const listClass = Il2Cpp.domain.assembly("mscorlib").image.class("System.Collections.Generic.List`1");
                                const inputDeviceClass = xrImg.class("UnityEngine.XR.InputDevice");
                                const list = listClass.make_generic_instance_type(inputDeviceClass).object;
                                return list;
                            };
                            console.log("[+] InputDevices.get_devices -> spoofed list");
                            patchCount++;
                        }
                    } catch(_) {}
                } catch(_) {}
            }
        } catch(e) { console.log("[-] XR subsystem hooks: " + e); }

        // ===== 3. Hook Oculus Platform to think we're on Quest =====
        try {
            const oculusMod = Il2Cpp.domain.tryAssembly("Oculus.Platform");
            if (oculusMod) {
                const oImg = oculusMod.image;
                try {
                    const cls = oImg.tryClass("Oculus.Platform.PlatformSettings");
                    if (cls) {
                        // Make app think it's on a supported platform
                        try {
                            const m = cls.method("get-MobileAppID");
                            if (m) {
                                console.log("[+] Oculus PlatformSettings found");
                            }
                        } catch(_) {}
                    }
                } catch(_) {}
            }
        } catch(_) {}

        console.log("[+] SteamVR Bypass v5 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v5 failed: " + e);
    }
});
