alert("TEST: Die Mod wird ausgeführt!");
console.log("TEST: Die Mod wird ausgeführt!");

(() => {
    "use strict";

    /*
     * Sandboxels Mod Profile Manager
     * Zielversion: Sandboxels v1.15
     */

    const PROFILE_STORAGE_KEY = "sandboxels_mod_profiles_v1";
    const ACTIVE_PROFILE_KEY = "sandboxels_active_mod_profile_v1";

    /*
     * Mögliche localStorage-Schlüssel für die Mod-Liste.
     * Sandboxels-Versionen können hier unterschiedliche Namen verwenden.
     */
    const MOD_STORAGE_KEYS = [
        "enabledMods",
        "sandboxels_enabled_mods",
        "mods",
        "modList",
        "loadedMods"
    ];

    function getProfiles() {
        try {
            const savedProfiles = localStorage.getItem(PROFILE_STORAGE_KEY);

            if (!savedProfiles) {
                return {
                    Standard: []
                };
            }

            const profiles = JSON.parse(savedProfiles);

            if (!profiles || typeof profiles !== "object") {
                return {
                    Standard: []
                };
            }

            if (!profiles.Standard) {
                profiles.Standard = [];
            }

            return profiles;
        } catch (error) {
            console.error(
                "Mod Profile Manager: Profile konnten nicht geladen werden.",
                error
            );

            return {
                Standard: []
            };
        }
    }

    function saveProfiles(profiles) {
        localStorage.setItem(
            PROFILE_STORAGE_KEY,
            JSON.stringify(profiles)
        );
    }

    function getActiveProfileName() {
        return (
            localStorage.getItem(ACTIVE_PROFILE_KEY) ||
            "Standard"
        );
    }

    function setActiveProfileName(name) {
        localStorage.setItem(ACTIVE_PROFILE_KEY, name);
    }

    /*
     * Aktuelle Sandboxels-Mods aus dem Browser-Speicher lesen.
     */
    function getCurrentMods() {
        for (const key of MOD_STORAGE_KEYS) {
            const rawValue = localStorage.getItem(key);

            if (!rawValue) {
                continue;
            }

            try {
                const value = JSON.parse(rawValue);

                if (Array.isArray(value)) {
                    return value;
                }
            } catch {
                /*
                 * Der Wert war kein JSON.
                 * Dann wird der nächste mögliche Schlüssel probiert.
                 */
            }
        }

        return [];
    }

    /*
     * Mod-Liste für das nächste Laden von Sandboxels speichern.
     *
     * Für v1.15 wird zuerst "enabledMods" verwendet.
     * Die anderen Schlüssel dienen als Fallback.
     */
    function setCurrentMods(mods) {
        localStorage.setItem(
            "enabledMods",
            JSON.stringify(mods)
        );

        /*
         * Falls deine v1.15-Version einen anderen Schlüssel verwendet,
         * werden zusätzlich die anderen möglichen Schlüssel gesetzt.
         */
        localStorage.setItem(
            "sandboxels_enabled_mods",
            JSON.stringify(mods)
        );

        localStorage.setItem(
            "mods",
            JSON.stringify(mods)
        );
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => {
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

    function createDefaultProfileIfNeeded() {
        const profiles = getProfiles();

        if (!profiles.Standard) {
            profiles.Standard = getCurrentMods();
            saveProfiles(profiles);
        }
    }

    function createNewProfile(name) {
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

        /*
         * Ein neues Profil startet zunächst ohne Mods.
         */
        profiles[name] = [];

        saveProfiles(profiles);
        setActiveProfileName(name);

        closeProfileWindow();
        openProfileWindow();
    }

    function saveCurrentModsToActiveProfile() {
        const profiles = getProfiles();
        const activeProfile = getActiveProfileName();

        profiles[activeProfile] = getCurrentMods();

        saveProfiles(profiles);

        alert(
            `Profil „${activeProfile}“ gespeichert.\n\n` +
            `${profiles[activeProfile].length} Mods wurden gespeichert.`
        );

        closeProfileWindow();
        openProfileWindow();
    }

    function switchToProfile(profileName) {
        const profiles = getProfiles();

        if (!profiles[profileName]) {
            alert("Dieses Profil wurde nicht gefunden.");
            return;
        }

        const confirmed = confirm(
            `Zum Profil „${profileName}“ wechseln?\n\n` +
            "Sandboxels wird danach neu geladen."
        );

        if (!confirmed) {
            return;
        }

        const modsForProfile = profiles[profileName];

        setActiveProfileName(profileName);
        setCurrentMods(modsForProfile);

        location.reload();
    }

    function deleteProfile(profileName) {
        if (profileName === "Standard") {
            alert("Das Standard-Profil kann nicht gelöscht werden.");
            return;
        }

        const profiles = getProfiles();

        if (!profiles[profileName]) {
            return;
        }

        const confirmed = confirm(
            `Profil „${profileName}“ wirklich löschen?`
        );

        if (!confirmed) {
            return;
        }

        delete profiles[profileName];

        if (getActiveProfileName() === profileName) {
            setActiveProfileName("Standard");
        }

        saveProfiles(profiles);

        closeProfileWindow();
        openProfileWindow();
    }

    function addStyles() {
        if (document.getElementById("spm-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "spm-styles";

        style.textContent = `
            #sandboxels-profile-window {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0, 0, 0, 0.65);
                font-family: Arial, sans-serif;
            }

            #sandboxels-profile-window .spm-box {
                width: min(420px, calc(100vw - 30px));
                max-height: 85vh;
                overflow-y: auto;
                padding: 18px;
                color: white;
                background: #20242b;
                border: 2px solid #697386;
                border-radius: 8px;
                box-shadow: 0 8px 35px rgba(0, 0, 0, 0.7);
            }

            #sandboxels-profile-window h2 {
                margin-top: 0;
                margin-bottom: 10px;
            }

            #sandboxels-profile-window input,
            #sandboxels-profile-window button {
                box-sizing: border-box;
                width: 100%;
                margin: 4px 0;
                padding: 8px;
                font-family: inherit;
                font-size: 14px;
                border: 1px solid #707b8d;
                border-radius: 4px;
            }

            #sandboxels-profile-window button {
                color: white;
                background: #3c4859;
                cursor: pointer;
            }

            #sandboxels-profile-window button:hover {
                background: #52627a;
            }

            #sandboxels-profile-window .spm-active {
                color: #79e08b;
            }

            #sandboxels-profile-window .spm-profile {
                display: flex;
                gap: 5px;
                margin: 5px 0;
            }

            #sandboxels-profile-window .spm-profile-select {
                flex: 1;
                width: auto;
                margin: 0;
            }

            #sandboxels-profile-window .spm-delete {
                width: 38px;
                margin: 0;
                background: #853939;
            }

            #sandboxels-profile-window .spm-delete:hover {
                background: #a94747;
            }

            #sandboxels-profile-window #spm-close {
                margin-top: 12px;
                background: #555d68;
            }
        `;

        document.head.appendChild(style);
    }

    function closeProfileWindow() {
        const profileWindow = document.getElementById(
            "sandboxels-profile-window"
        );

        if (profileWindow) {
            profileWindow.remove();
        }
    }

    function openProfileWindow() {
        closeProfileWindow();

        const profiles = getProfiles();
        const activeProfile = getActiveProfileName();

        const profileWindow = document.createElement("div");
        profileWindow.id = "sandboxels-profile-window";

        const profileEntries = Object.keys(profiles)
            .map(profileName => {
                const escapedName = escapeHTML(profileName);
                const modCount = Array.isArray(profiles[profileName])
                    ? profiles[profileName].length
                    : 0;

                return `
                    <div class="spm-profile">
                        <button
                            class="spm-profile-select"
                            data-profile="${escapedName}">
                            ${escapedName}
                            (${modCount} Mods)
                        </button>

                        ${
                            profileName !== "Standard"
                                ? `
                                    <button
                                        class="spm-delete"
                                        data-delete="${escapedName}">
                                        X
                                    </button>
                                `
                                : ""
                        }
                    </div>
                `;
            })
            .join("");

        profileWindow.innerHTML = `
            <div class="spm-box">
                <h2>Mod-Profile</h2>

                <p>
                    Aktives Profil:
                    <span class="spm-active">
                        ${escapeHTML(activeProfile)}
                    </span>
                </p>

                <input
                    id="spm-new-profile-name"
                    type="text"
                    placeholder="Neuer Profilname"
                >

                <button id="spm-create-profile">
                    Neues Profil erstellen
                </button>

                <button id="spm-save-current-profile">
                    Aktuelle Mods in Profil speichern
                </button>

                <hr>

                <div>
                    ${profileEntries}
                </div>

                <button id="spm-close">
                    Schließen
                </button>
            </div>
        `;

        document.body.appendChild(profileWindow);

        document
            .getElementById("spm-close")
            .addEventListener("click", closeProfileWindow);

        document
            .getElementById("spm-create-profile")
            .addEventListener("click", () => {
                const input = document.getElementById(
                    "spm-new-profile-name"
                );

                createNewProfile(input.value);
            });

        document
            .getElementById("spm-save-current-profile")
            .addEventListener(
                "click",
                saveCurrentModsToActiveProfile
            );

        document
            .querySelectorAll("[data-profile]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    switchToProfile(button.dataset.profile);
                });
            });

        document
            .querySelectorAll("[data-delete]")
            .forEach(button => {
                button.addEventListener("click", () => {
                    deleteProfile(button.dataset.delete);
                });
            });

        profileWindow.addEventListener("click", event => {
            if (event.target === profileWindow) {
                closeProfileWindow();
            }
        });
    }

    function findSandboxelsToolbar() {
        const elements = [
            ...document.querySelectorAll("button, div, span")
        ];

        const knownElement = elements.find(element => {
            const text = element.textContent
                .trim()
                .toLowerCase();

            const title = (element.title || "")
                .trim()
                .toLowerCase();

            return (
                text === "saves" ||
                text === "mods" ||
                text === "settings" ||
                title === "saves" ||
                title === "mods" ||
                title === "settings"
            );
        });

        if (!knownElement) {
            return null;
        }

        let currentElement = knownElement;

        /*
         * Höchstens vier Ebenen nach oben suchen.
         * So wird nicht versehentlich der gesamte Body ausgewählt.
         */
        for (let level = 0; level < 4; level++) {
            if (!currentElement.parentElement) {
                break;
            }

            const parent = currentElement.parentElement;
            const children = [...parent.children];

            const hasToolbarButton = children.some(child => {
                const text = child.textContent
                    .trim()
                    .toLowerCase();

                return (
                    text === "saves" ||
                    text === "mods" ||
                    text === "settings"
                );
            });

            if (hasToolbarButton) {
                return parent;
            }

            currentElement = parent;
        }

        return knownElement.parentElement;
    }

    function addToolbarButton() {
        if (document.getElementById("spm-toolbar-button")) {
            return true;
        }

        const toolbar = findSandboxelsToolbar();

        if (!toolbar) {
            return false;
        }

        const profileButton = document.createElement("button");

        profileButton.id = "spm-toolbar-button";
        profileButton.textContent = "Profiles";
        profileButton.title = "Mod-Profile öffnen";

        profileButton.style.cursor = "pointer";
        profileButton.style.marginLeft = "3px";

        profileButton.addEventListener(
            "click",
            openProfileWindow
        );

        /*
         * Der Button wird in derselben Reihe wie Saves, Mods
         * und Settings angehängt.
         */
        toolbar.appendChild(profileButton);

        return true;
    }

    function initialize() {
        console.log("Mod-Profile-Manager v1.15 wird geladen.");

        addStyles();
        createDefaultProfileIfNeeded();

        addToolbarButton();
    }

    /*
     * Sandboxels erstellt manche Elemente erst nach dem Laden
     * der Mod. Deshalb wird wiederholt nach der Toolbar gesucht.
     */
    let attempts = 0;

    const toolbarTimer = setInterval(() => {
        initialize();

        attempts++;

        if (
            document.getElementById("spm-toolbar-button") ||
            attempts >= 60
        ) {
            clearInterval(toolbarTimer);
        }
    }, 500);
})();
