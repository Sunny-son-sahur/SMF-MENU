import os
import sys
import shutil
import time
import subprocess

try:
    import psutil
except ImportError:
    print("Installing psutil...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "psutil"])
    import psutil

GAME_DIR = r"C:\Program Files (x86)\Steam\steamapps\common\Animal Company"
SCRIPT_DIR = os.path.dirname(os.path.abspath(sys.argv[0]))

PURPLE = "\033[38;5;242m"
LPURPLE = "\033[38;5;250m"
DPURPLE = "\033[38;5;236m"
WHITE = "\033[97m"
GRAY = "\033[90m"
RESET = "\033[0m"
BOLD = "\033[1m"

def spin_msg(msg, duration=1.0):
    frames = ["/", "-", "\\", "|"]
    end_time = time.time() + duration
    i = 0
    while time.time() < end_time:
        c = frames[i % 4]
        sys.stdout.write(f"\r\033[2K{GRAY}   [{c}]{RESET} {msg}")
        sys.stdout.flush()
        time.sleep(0.15)
        i += 1
    sys.stdout.write(f"\r\033[2K")
    sys.stdout.flush()

def is_process_running(name):
    for proc in psutil.process_iter(['name']):
        try:
            if proc.info['name'].lower() == name.lower():
                return True
        except:
            pass
    return False

def inject_frida():
    bridge = os.path.join(SCRIPT_DIR, "ac_bridge.js")
    bypass = os.path.join(SCRIPT_DIR, "bypass.js")
    quest = os.path.join(SCRIPT_DIR, "quest.ts")
    try:
        print(f"{LPURPLE}   [!] {RESET}Game detected! Injecting bypass...")
        print()
        subprocess.Popen(
            ['cmd', '/k', 'frida', '-l', bridge, '-l', bypass, '-l', quest, 'EACLauncher.exe'],
            creationflags=subprocess.CREATE_NEW_CONSOLE,
            cwd=SCRIPT_DIR
        )
        return True
    except Exception as e:
        print(f"{LPURPLE}   [x] {RESET}Injection failed: {e}")
        return False

def main():
    try:
        kernel32 = __import__('ctypes').windll.kernel32
        kernel32.SetConsoleMode(kernel32.GetStdHandle(-11), 7)
    except:
        pass

    os.system("cls")
    print()
    print(f"{DPURPLE}{BOLD}            ███████ ██    ██ ████████ ███████ {RESET}")
    print(f"{DPURPLE}{BOLD}            ██       ██  ██     ██    ██      {RESET}")
    print(f"{PURPLE}{BOLD}            ███████   ████      ██    █████   {RESET}")
    print(f"{PURPLE}{BOLD}                 ██    ██       ██    ██      {RESET}")
    print(f"{LPURPLE}{BOLD}            ███████    ██       ██    ███████ {RESET}")
    print()
    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
    print()
    print(f"{LPURPLE}               Complete EAC Bypass{RESET}")
    print(f"{GRAY}                   discord.gg/syte{RESET}")
    print()
    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
    print()

    eac_exe = os.path.join(GAME_DIR, "EACLauncher.exe")
    game_exe = os.path.join(GAME_DIR, "AnimalCompany.exe")
    eac_data = os.path.join(GAME_DIR, "EACLauncher_Data")
    game_data = os.path.join(GAME_DIR, "AnimalCompany_Data")

    if not os.path.exists(game_exe):
        print(f"{LPURPLE}   [+] {RESET}Already set up")
    else:
        spin_msg("Removing EAC launcher...")
        if os.path.exists(eac_exe):
            os.remove(eac_exe)
        print(f"{LPURPLE}   [+] {RESET}Deleted EACLauncher.exe")

        spin_msg("Renaming game executable...")
        if os.path.exists(game_exe) and not os.path.exists(eac_exe):
            os.rename(game_exe, eac_exe)
        print(f"{LPURPLE}   [+] {RESET}Renamed AnimalCompany.exe -> EACLauncher.exe")

        spin_msg("Renaming game data...")
        if os.path.exists(game_data) and not os.path.exists(eac_data):
            os.rename(game_data, eac_data)
        print(f"{LPURPLE}   [+] {RESET}Renamed AnimalCompany_Data -> EACLauncher_Data")

    print()
    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
    print(f"{WHITE}{BOLD}        Looking For EACLauncher...{RESET}")
    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
    print()
    print(f"{WHITE}   Launch Animal Company from Steam{RESET}")
    print()
    print(f"{GRAY}   Keep this window open!{RESET}")
    print()

    injected = False
    try:
        while True:
            if not injected and is_process_running("EACLauncher.exe"):
                time.sleep(1)
                if inject_frida():
                    injected = True
                    print(f"{LPURPLE}   [+] {RESET}Bypass injected!")
                    print()
                    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
                    print(f"{WHITE}{BOLD}                    BYPASSED{RESET}")
                    print(f"{GRAY}   ────────────────────────────────────────────────────{RESET}")
                    print()
                    print(f"{GRAY}   Waiting for game to close...{RESET}")
                    print()
            if injected and not is_process_running("EACLauncher.exe"):
                print(f"{DPURPLE}   Game closed. Exiting...{RESET}")
                print()
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        print()
        print(f"{DPURPLE}   Exiting...{RESET}")
        print()

if __name__ == "__main__":
    main()
