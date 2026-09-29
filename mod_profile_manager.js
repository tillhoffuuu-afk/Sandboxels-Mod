(function () {
    "use strict";

    const STORAGE_KEY = "sandboxels_mod_profiles_v1";
    const ACTIVE_PROFILE_KEY = "sandboxels_active_mod_profile_v1";

    function getProfiles() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
        } catch (error) {
            console.error("Mod Profile Manager: Profile konnten nicht geladen werden.", error);
            return {};
        }
    }

    function saveProfiles(profiles) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    }

    function getActiveProfileName() {
        return localStorage.getItem(ACTIVE_PROFILE_KEY) || "Standard";
    }

    function setActiveProfileName(name) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, name);
    }

    function getCurrentMods() {
        /*
         * Sandboxels speichert die geladenen Mods normalerweise in
         * localStorage. Je nach Version kann sich der interne Schlüssel
         * ändern. Deshalb werden mehrere bekannte Schlüssel ausprobiert.
         */
        const possibleKeys = [
            "mods",
            "sandboxels_mods",
            "modList",
            "loadedMods"
        ];

        for (const key of possibleKeys) {
            const value = localStorage.getItem(key);

            if (!value) continue;

            try {
                const parsed = JSON.parse(value);

                if (Array.isArray(parsed)) {
                    return parsed;
                }
            } catch {
                // Kein JSON, nächstes Format ausprobieren
            }
        }

        return [];
    }

    function setCurrentMods(mods) {
        /*
         * Der wichtigste Schlüssel muss gegebenenfalls an die
         * verwendete Sandboxels-Version angepasst werden.
         */
        localStorage.setItem("mods", JSON.stringify(mods));
    }

    function createDefaultProfile() {
        const profiles = getProfiles();

        if (!profiles["Standard"]) {
            profiles["Standard"] = getCurrentMods();
            saveProfiles(profiles);
        }
    }

    function createProfile(name) {
        name = name.trim();

        if (!name) {
            alert("Bitte gib einen Profilnamen ein.");
            return;
        }

        const profiles = getProfiles();

        if (profiles[name]) {
            alert("Dieses Profil existiert bereits.");
            return;
        }

        profiles[name] = [];
        saveProfiles(profiles);
        setActiveProfileName(name);
        renderProfileManager();
    }

    function saveCurrentProfile() {
        const profileName = getActiveProfileName();
        const profiles = getProfiles();

        profiles[profileName] = getCurrentMods();
        saveProfiles(profiles);

        alert(`Profil „${profileName}“ wurde gespeichert.`);
    }

    function switchProfile(name) {
        const profiles = getProfiles();

        if (!profiles[name]) {
            alert("Dieses Profil existiert nicht.");
            return;
        }

        const confirmed = confirm(
            `Zu „${name}“ wechseln?\n\n` +
            "Sandboxels wird danach neu geladen."
        );

        if (!confirmed) return;

        setActiveProfileName(name);
        setCurrentMods(profiles[name]);

        location.reload();
    }

    function deleteProfile(name) {
        if (name === "Standard") {
            alert("Das Standard-Profil kann nicht gelöscht werden.");
            return;
        }

        const profiles = getProfiles();

        if (!profiles[name]) return;

        const confirmed = confirm(
            `Profil „${name}“ wirklich löschen?`
        );

        if (!confirmed) return;

        delete profiles[name];
        saveProfiles(profiles);

        if (getActiveProfileName() === name) {
            setActiveProfileName("Standard");
        }

        renderProfileManager();
    }

    function addStyles() {
        if (document.getElementById("mod-profile-manager-style")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "mod-profile-manager-style";

        style.textContent = `
            #mod-profile-manager {
                position: fixed;
                z-index: 999999;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: min(420px, calc(100vw - 30px));
                max-height: 80vh;
                overflow-y: auto;
                padding: 18px;
                color: white;
                background: #20242b;
                border: 2px solid #596273;
                border-radius: 10px;
                box-shadow: 0 8px 35px rgba(0,0,0,.6);
                font-family: Arial, sans-serif;
            }

            #mod-profile-manager h2 {
                margin-top: 0;
            }

            #mod-profile-manager input,
            #mod-profile-manager button {
                box-sizing: border-box;
                width: 100%;
                margin: 5px 0;
                padding: 9px;
                border-radius: 5px;
                border: 1px solid #687386;
            }

            #mod-profile-manager button {
                cursor: pointer;
                color: white;
                background: #394454;
            }

            #mod-profile-manager button:hover {
                background: #4d5b70;
            }

            .mod-profile-entry {
                display: grid;
                grid-template-columns: 1fr auto;
                gap: 6px;
                margin: 7px 0;
            }

            .mod-profile-entry button {
                width: auto;
                margin: 0;
            }

            .mod-profile-active {
                color: #79e08b;
                font-size: 13px;
            }

            #mod-profile-close {
                background: #713d3d !important;
            }
        `;

        document.head.appendChild(style);
    }

    function renderProfileManager() {
        let panel = document.getElementById("mod-profile-manager");

        if (!panel) {
            panel = document.createElement("div");
            panel.id = "mod-profile-manager";
            document.body.appendChild(panel);
        }

        const profiles = getProfiles();
        const activeProfile = getActiveProfileName();

        panel.innerHTML = `
            <h2>Mod-Profile</h2>

            <p>
                Aktives Profil:
                <span class="mod-profile-active">
                    ${escapeHtml(activeProfile)}
                </span>
            </p>

            <input
                id="mod-profile-name"
                type="text"
                placeholder="Neues Profil, z. B. Chemie"
            >

            <button id="mod-profile-create">
                Neues Profil erstellen
            </button>

            <button id="mod-profile-save">
                Aktuelle Mods in diesem Profil speichern
            </button>

            <hr>

            <div id="mod-profile-list"></div>

            <button id="mod-profile-close">
                Schließen
            </button>
        `;

        const list = panel.querySelector("#mod-profile-list");

        for (const name of Object.keys(profiles)) {
            const entry = document.createElement("div");
            entry.className = "mod-profile-entry";

            const profileButton = document.createElement("button");
            profileButton.textContent =
                `${name} (${profiles[name].length} Mods)`;

            profileButton.addEventListener("click", () => {
                switchProfile(name);
            });

            entry.appendChild(profileButton);

            if (name !== "Standard") {
                const deleteButton = document.createElement("button");
                deleteButton.textContent = "Löschen";
                deleteButton.addEventListener("click", () => {
                    deleteProfile(name);
                });

                entry.appendChild(deleteButton);
            }

            list.appendChild(entry);
        }

        panel.querySelector("#mod-profile-create")
            .addEventListener("click", () => {
                const input = panel.querySelector("#mod-profile-name");
                createProfile(input.value);
                input.value = "";
            });

        panel.querySelector("#mod-profile-save")
            .addEventListener("click", saveCurrentProfile);

        panel.querySelector("#mod-profile-close")
            .addEventListener("click", () => {
                panel.remove();
            });
    }

    function escapeHtml(value) {
        return value.replace(/[&<>"']/g, character => {
            const replacements = {
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            };

            return replacements[character];
        });
    }

    function addOpenButton() {
        const button = document.createElement("button");

        button.textContent = "Mod-Profile";
        button.title = "Mod-Profile öffnen";

        button.style.position = "fixed";
        button.style.zIndex = "999998";
        button.style.right = "12px";
        button.style.bottom = "12px";
        button.style.padding = "10px";
        button.style.cursor = "pointer";

        button.addEventListener("click", renderProfileManager);

        document.body.appendChild(button);
    }

    function init() {
        createDefaultProfile();
        addStyles();
        addOpenButton();

        console.log(
            "Mod Profile Manager geladen. Aktives Profil:",
            getActiveProfileName()
        );
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
