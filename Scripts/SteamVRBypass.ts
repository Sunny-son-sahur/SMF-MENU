// @ts-nocheck
// SteamVR Bypass v2 — anti-detection VR spoof
// Layer 1: Unity XR subsystem hooks (game can't detect these)
// Layer 2: Native Interceptor on game methods (no IL2CPP impl pointer change)
// Layer 3: Original .implementation as last resort fallback

Il2Cpp.perform(() => {
    try {
        console.log("[+] VR Bypass v2 By Sunny");

        const asm = Il2Cpp.domain.tryAssembly("AnimalCompany");
        if (!asm) { console.log("[-] AnimalCompany assembly not found"); return; }
        const image = asm.image;

        const appUtils = image.tryClass("AnimalCompany.AppUtils");
        if (!appUtils) { console.log("[-] AppUtils not found"); return; }

        const steamVRStatus = image.tryClass("AnimalCompany.AppUtils+SteamVRHeadsetStatus");

        let hookCount = 0;

        // ===== LAYER 1: Unity XR subsystem hooks =====
        try {
            const xrMod = Il2Cpp.domain.tryAssembly("UnityEngine.XRModule");
            if (xrMod) {
                const xrImage = xrMod.image;

                try {
                    const xrSettingsClass = xrImage.tryClass("UnityEngine.XR.XRSettings");
                    if (xrSettingsClass) {
                        const isDeviceActive = xrSettingsClass.method("get_isDeviceActive");
                        if (isDeviceActive) {
                            isDeviceActive.implementation = function () { return true; };
                            console.log("[+] Layer1: XRSettings.isDeviceActive -> true");
                            hookCount++;
                        }
                        const getEnabled = xrSettingsClass.method("get_enabled");
                        if (getEnabled) {
                            getEnabled.implementation = function () { return true; };
                            console.log("[+] Layer1: XRSettings.get_enabled -> true");
                            hookCount++;
                        }
                        const getLoadedDeviceName = xrSettingsClass.method("get_loadedDeviceName");
                        if (getLoadedDeviceName) {
                            getLoadedDeviceName.implementation = function () { return Il2Cpp.string("SteamVR"); };
                            console.log("[+] Layer1: XRSettings.get_loadedDeviceName -> SteamVR");
                            hookCount++;
                        }
                    }
                } catch (e) { console.log("[-] Layer1 XRSettings: " + e); }

                try {
                    const xrDeviceClass = xrImage.tryClass("UnityEngine.XR.XRDevice");
                    if (xrDeviceClass) {
                        const isPresent = xrDeviceClass.method("get_isPresent");
                        if (isPresent) {
                            isPresent.implementation = function () { return true; };
                            console.log("[+] Layer1: XRDevice.isPresent -> true");
                            hookCount++;
                        }
                    }
                } catch (e) { console.log("[-] Layer1 XRDevice: " + e); }
            }
        } catch (e) { console.log("[-] Layer1 failed: " + e); }

        // ===== LAYER 2: Native Interceptor on game methods =====
        try {
            const method = appUtils.method("IsSteamVRHeadsetActive");
            if (method && method.virtualAddress && !method.virtualAddress.isNull()) {
                Interceptor.attach(method.virtualAddress, {
                    onLeave(retval) {
                        retval.replace(ptr(1));
                    }
                });
                console.log("[+] Layer2: IsSteamVRHeadsetActive native hooked -> true");
                hookCount++;
            }
        } catch (e) { console.log("[-] Layer2 IsSteamVRHeadsetActive: " + e); }

        try {
            const method = appUtils.method("GetXRBackend");
            if (method && method.virtualAddress && !method.virtualAddress.isNull()) {
                Interceptor.attach(method.virtualAddress, {
                    onLeave(retval) {
                        retval.replace(ptr(2));
                    }
                });
                console.log("[+] Layer2: GetXRBackend native hooked -> 2");
                hookCount++;
            }
        } catch (e) { console.log("[-] Layer2 GetXRBackend: " + e); }

        try {
            const method = appUtils.method("GetSteamVRHeadsetStatus");
            if (steamVRStatus && method && method.virtualAddress && !method.virtualAddress.isNull()) {
                Interceptor.attach(method.virtualAddress, {
                    onLeave(retval) {
                        try {
                            const st = steamVRStatus.new().unbox();
                            st.field("activeLoaderPresent").value = true;
                            st.field("xrDisplayRunning").value = true;
                            st.field("headDeviceValid").value = true;
                            st.field("userPresenceKnown").value = true;
                            st.field("userPresent").value = true;
                        } catch (_) {}
                    }
                });
                console.log("[+] Layer2: GetSteamVRHeadsetStatus native hooked");
                hookCount++;
            }
        } catch (e) { console.log("[-] Layer2 GetSteamVRHeadsetStatus: " + e); }

        // ===== LAYER 3: Original .implementation fallback =====
        if (hookCount < 3) {
            console.log("[!] Layer2 only got " + hookCount + " hooks, falling back to Layer3");

            try {
                appUtils.method("IsSteamVRHeadsetActive").implementation = function () {
                    return true;
                };
                console.log("[+] Layer3: IsSteamVRHeadsetActive -> true");
            } catch (e) { console.log("[-] Layer3 IsSteamVRHeadsetActive: " + e); }

            try {
                appUtils.method("GetXRBackend").implementation = function () {
                    return 2;
                };
                console.log("[+] Layer3: GetXRBackend -> 2");
            } catch (e) { console.log("[-] Layer3 GetXRBackend: " + e); }

            try {
                appUtils.method("GetSteamVRHeadsetStatus").implementation = function () {
                    if (!steamVRStatus) return null;
                    const status = steamVRStatus.new().unbox();
                    status.field("activeLoaderPresent").value = true;
                    status.field("xrDisplayRunning").value = true;
                    status.field("headDeviceValid").value = true;
                    status.field("userPresenceKnown").value = true;
                    status.field("userPresent").value = true;
                    return status;
                };
                console.log("[+] Layer3: GetSteamVRHeadsetStatus spoofed");
            } catch (e) { console.log("[-] Layer3 GetSteamVRHeadsetStatus: " + e); }
        }

        console.log("[+] SteamVR Bypass v2 loaded! (" + hookCount + " hooks active)");
    } catch (e) {
        console.log("[-] SteamVR Bypass v2 failed: " + e);
    }
});
