// @ts-nocheck
// SteamVR Bypass v4 — patches AppUtils + hooks Unity XR initialization pipeline
// Game says "Cannot connect to VR" because it tries to init the actual XR subsystem

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v4 By Sunny");

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

        // ===== 2. Hook Unity XR initialization pipeline =====
        // These are the functions Unity calls to actually start XR
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (!xrMod) { console.log("[-] XRModule not found"); return; }
            const xrImg = xrMod.image;

            // XRSettings hooks
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.XRSettings");
                if (cls) {
                    try { cls.method("get_enabled").implementation = function() { return true; }; console.log("[+] XRSettings.enabled -> true"); patchCount++; } catch(_) {}
                    try { cls.method("get_isDeviceActive").implementation = function() { return true; }; console.log("[+] XRSettings.isDeviceActive -> true"); patchCount++; } catch(_) {}
                    try { cls.method("get_loadedDeviceName").implementation = function() { return Il2Cpp.string("OpenXR"); }; console.log("[+] XRSettings.loadedDeviceName -> OpenXR"); patchCount++; } catch(_) {}
                    try { cls.method("get_eyeTextureResolutionScale").implementation = function() { return 1.0; }; console.log("[+] XRSettings.eyeTextureResolutionScale -> 1.0"); patchCount++; } catch(_) {}
                    try { cls.method("get_stereoRenderingMode").implementation = function() { return 0; }; console.log("[+] XRSettings.stereoRenderingMode -> 0"); patchCount++; } catch(_) {}
                }
            } catch(_) {}

            // XRDevice hooks
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.XRDevice");
                if (cls) {
                    try { cls.method("get_isPresent").implementation = function() { return true; }; console.log("[+] XRDevice.isPresent -> true"); patchCount++; } catch(_) {}
                    try { cls.method("get_userPresence").implementation = function() { return 1; }; console.log("[+] XRDevice.userPresence -> 1"); patchCount++; } catch(_) {}
                }
            } catch(_) {}

            // XRGeneralSettings — controls the XR loader lifecycle
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.Management.XRGeneralSettings");
                if (cls) {
                    // get_Instance -> return a singleton
                    try {
                        const instField = cls.field("s_Settings");
                        const initMethod = cls.method("InitManagerOnStart");
                        if (initMethod) {
                            initMethod.implementation = function() {
                                console.log("[+] XRGeneralSettings.InitManagerOnStart intercepted — skipping real init");
                            };
                            console.log("[+] XRGeneralSettings.InitManagerOnStart -> no-op");
                            patchCount++;
                        }
                    } catch(_) {}
                }
            } catch(_) {}

            // XRManagerSettings — manages loader init/deinit
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.Management.XRManagerSettings");
                if (cls) {
                    try {
                        const m = cls.method("InitializeLoaderSync");
                        m.implementation = function() {
                            console.log("[+] XRManagerSettings.InitializeLoaderSync -> fake success");
                        };
                        console.log("[+] XRManagerSettings.InitializeLoaderSync -> no-op");
                        patchCount++;
                    } catch(_) {}
                    try {
                        const m = cls.method("StartSubsystems");
                        m.implementation = function() {
                            console.log("[+] XRManagerSettings.StartSubsystems -> no-op");
                        };
                        console.log("[+] XRManagerSettings.StartSubsystems -> no-op");
                        patchCount++;
                    } catch(_) {}
                    try {
                        const m = cls.method("StopSubsystems");
                        m.implementation = function() {};
                        console.log("[+] XRManagerSettings.StopSubsystems -> no-op");
                        patchCount++;
                    } catch(_) {}
                    try {
                        const m = cls.method("DeinitializeLoader");
                        m.implementation = function() {};
                        console.log("[+] XRManagerSettings.DeinitializeLoader -> no-op");
                        patchCount++;
                    } catch(_) {}
                }
            } catch(_) {}

            // OpenXR specific — XRLoaderHelper
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.Management.XRLoaderHelper");
                if (cls) {
                    try {
                        const m = cls.method("InitializeLoaderSync");
                        m.implementation = function() {
                            console.log("[+] XRLoaderHelper.InitializeLoaderSync -> fake success");
                        };
                        console.log("[+] XRLoaderHelper.InitializeLoaderSync -> no-op");
                        patchCount++;
                    } catch(_) {}
                }
            } catch(_) {}

            // XRInputSubsystem — some games check this to confirm VR is running
            try {
                const cls = xrImg.tryClass("UnityEngine.XR.XRInputSubsystem");
                if (cls) {
                    try {
                        const m = cls.method("get_running");
                        m.implementation = function() { return true; };
                        console.log("[+] XRInputSubsystem.running -> true");
                        patchCount++;
                    } catch(_) {}
                }
            } catch(_) {}

            // SubsystemManager — tries to get subsystems, hook to fake success
            try {
                const subsystemManagerClass = xrImg.tryClass("UnityEngine.XR.ManagementXRGeneralSettings");
            } catch(_) {}

        } catch(e) { console.log("[-] XR pipeline hooks: " + e); }

        console.log("[+] SteamVR Bypass v4 loaded! (" + patchCount + " patches active)");
    } catch(e) {
        console.log("[-] SteamVR Bypass v4 failed: " + e);
    }
});
