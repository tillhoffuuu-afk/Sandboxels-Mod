```javascript
/*
============================================================
 Sandboxels Mod Profiles
 Version 1.0.0

 Profile manager for the browser version of Sandboxels.

 Features:
  - Create profiles
  - Rename profiles
  - Delete profiles
  - Add/remove mods from profiles
  - Enable/disable mods
  - Import the currently enabled mods into a profile
  - Switch profiles
  - Persistent storage using localStorage
  - Automatically reload Sandboxels after switching
  - Backup/export profiles
  - Import profiles
============================================================
*/

(function () {
    "use strict";

    /* ========================================================
       CONFIGURATION
    ======================================================== */

    const STORAGE_KEY = "sandboxels_mod_profiles_v1";
    const ACTIVE_PROFILE_KEY = "sandboxels_active_mod_profile_v1";

    // Sandboxels currently uses this localStorage key for mods.
    const SANDBOXELS_MOD_KEY = "enabledMods";

    const DEFAULT_PROFILE = "Default";

    /* ========================================================
       STORAGE
    ======================================================== */

    function loadProfiles() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);

            if (!raw) {
                return {
                    [DEFAULT_PROFILE]: []
                };
            }

            const data = JSON.parse(raw);

            if (!data || typeof data !== "object") {
                return {
                    [DEFAULT_PROFILE]: []
                };
            }

            return data;
        } catch (error) {
            console.error(
                "[Mod Profiles] Failed to load profiles:",
                error
            );

            return {
                [DEFAULT_PROFILE]: []
            };
        }
    }

    function saveProfiles(profiles) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(profiles)
        );
    }

    function getActiveProfile() {
        return (
            localStorage.getItem(ACTIVE_PROFILE_KEY) ||
            DEFAULT_PROFILE
        );
    }

    function setActiveProfile(name) {
        localStorage.setItem(
            ACTIVE_PROFILE_KEY,
            name
        );
    }

    /* ========================================================
       SANDBOXELS MOD STORAGE
    ======================================================== */

    function getEnabledMods() {
        try {
            const raw =
                localStorage.getItem(SANDBOXELS_MOD_KEY);

            if (!raw) {
                return [];
            }

            const mods = JSON.parse(raw);

            if (Array.isArray(mods)) {
                return mods;
            }

            return [];
        } catch (error) {
            console.error(
                "[Mod Profiles] Could not read enabledMods:",
                error
            );

            return [];
        }
    }

    function setEnabledMods(mods) {
        localStorage.setItem(
            SANDBOXELS_MOD_KEY,
            JSON.stringify(mods)
        );
    }

    /* ========================================================
       MOD NORMALIZATION
    ======================================================== */

    function normalizeMod(mod) {
        if (typeof mod !== "string") {
            return null;
        }

        mod = mod.trim();

        if (!mod) {
            return null;
        }

        return mod;
    }

    function uniqueMods(mods) {
        const result = [];

        for (const mod of mods) {
            const normalized = normalizeMod(mod);

            if (
                normalized &&
                !result.includes(normalized)
            ) {
                result.push(normalized);
            }
        }

        return result;
    }

    /* ========================================================
       UI
    ======================================================== */

    let overlay = null;
    let currentSelectedProfile = null;

    function createElement(
        tag,
        properties = {},
        children = []
    ) {
        const el = document.createElement(tag);

        for (const key in properties) {
            if (key === "style") {
                Object.assign(
                    el.style,
                    properties.style
                );
            } else if (key === "className") {
                el.className = properties.className;
            } else if (key === "text") {
                el.textContent = properties.text;
            } else {
                el[key] = properties[key];
            }
        }

        for (const child of children) {
            if (child) {
                el.appendChild(child);
            }
        }

        return el;
    }

    function button(text, callback, className = "") {
        const btn = createElement(
            "button",
            {
                text: text,
                className:
                    "smp-button " + className
            }
        );

        btn.addEventListener(
            "click",
            callback
        );

        return btn;
    }

    /* ========================================================
       STYLES
    ======================================================== */

    function injectStyles() {
        if (
            document.getElementById(
                "sandboxels-mod-profiles-style"
            )
        ) {
            return;
        }

        const style = document.createElement("style");

        style.id =
            "sandboxels-mod-profiles-style";

        style.textContent = `
            #sandboxels-mod-profiles-overlay {
                position: fixed;
                inset: 0;
                z-index: 999999;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(0,0,0,.65);
                font-family: Arial, sans-serif;
            }

            #sandboxels-mod-profiles-window {
                width: min(900px, 94vw);
                max-height: 90vh;
                overflow: hidden;
                display: flex;
                flex-direction: column;
                background: #222;
                color: white;
                border: 3px solid #777;
                border-radius: 12px;
                box-shadow:
                    0 0 30px rgba(0,0,0,.8);
            }

            .smp-header {
                padding: 15px 18px;
                background: #333;
                border-bottom: 2px solid #555;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .smp-title {
                font-size: 22px;
                font-weight: bold;
            }

            .smp-content {
                display: grid;
                grid-template-columns:
                    260px 1fr;
                min-height: 450px;
                max-height: 65vh;
            }

            .smp-sidebar {
                overflow-y: auto;
                background: #292929;
                border-right: 2px solid #555;
                padding: 10px;
            }

            .smp-main {
                overflow-y: auto;
                padding: 16px;
            }

            .smp-profile {
                width: 100%;
                box-sizing: border-box;
                margin-bottom: 7px;
                padding: 11px;
                background: #3a3a3a;
                border: 1px solid #555;
                border-radius: 6px;
                color: white;
                text-align: left;
                cursor: pointer;
            }

            .smp-profile:hover {
                background: #484848;
            }

            .smp-profile.active {
                background: #4d704d;
                border-color: #83c783;
            }

            .smp-profile-name {
                font-weight: bold;
            }

            .smp-profile-count {
                margin-top: 4px;
                opacity: .7;
                font-size: 12px;
            }

            .smp-button {
                border: 1px solid #777;
                background: #444;
                color: white;
                padding: 9px 12px;
                margin: 3px;
                border-radius: 5px;
                cursor: pointer;
                font-size: 14px;
            }

            .smp-button:hover {
                background: #555;
            }

            .smp-button.primary {
                background: #39733f;
                border-color: #68a86f;
            }

            .smp-button.danger {
                background: #743939;
                border-color: #a65b5b;
            }

            .smp-button.blue {
                background: #315d85;
                border-color: #4f82b5;
            }

            .smp-input {
                box-sizing: border-box;
                width: 100%;
                padding: 10px;
                margin: 5px 0 10px;
                background: #111;
                border: 1px solid #666;
                color: white;
                border-radius: 5px;
            }

            .smp-section {
                margin-bottom: 18px;
            }

            .smp-section-title {
                font-size: 17px;
                font-weight: bold;
                margin-bottom: 8px;
            }

            .smp-mod {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
                padding: 9px;
                margin-bottom: 5px;
                background: #303030;
                border: 1px solid #4c4c4c;
                border-radius: 5px;
            }

            .smp-mod-name {
                word-break: break-all;
                font-family: monospace;
                font-size: 13px;
            }

            .smp-empty {
                opacity: .65;
                padding: 15px 0;
                text-align: center;
            }

            .smp-footer {
                padding: 10px;
                background: #292929;
                border-top: 2px solid #555;
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 5px;
            }

            .smp-info {
                padding: 10px;
                background: #333;
                border: 1px solid #555;
                border-radius: 5px;
                font-size: 13px;
                margin-bottom: 12px;
            }

            .smp-warning {
                color: #ffd66b;
            }

            @media (max-width: 650px) {
                .smp-content {
                    grid-template-columns: 1fr;
                }

                .smp-sidebar {
                    border-right: none;
                    border-bottom: 2px solid #555;
                    max-height: 180px;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /* ========================================================
       OPEN / CLOSE
    ======================================================== */

    function openManager() {
        if (overlay) {
            return;
        }

        injectStyles();

        overlay = createElement(
            "div",
            {
                id:
                    "sandboxels-mod-profiles-overlay"
            }
        );

        const windowElement =
            createElement(
                "div",
                {
                    id:
                        "sandboxels-mod-profiles-window"
                }
            );

        overlay.appendChild(
            windowElement
        );

        document.body.appendChild(
            overlay
        );

        renderManager();
    }

    function closeManager() {
        if (!overlay) {
            return;
        }

        overlay.remove();
        overlay = null;
    }

    /* ========================================================
       MAIN RENDER
    ======================================================== */

    function renderManager() {
        if (!overlay) {
            return;
        }

        const profiles =
            loadProfiles();

        const active =
            getActiveProfile();

        if (
            !profiles[active]
        ) {
            setActiveProfile(
                DEFAULT_PROFILE
            );
        }

        overlay.innerHTML = "";

        const windowElement =
            createElement(
                "div",
                {
                    id:
                        "sandboxels-mod-profiles-window"
                }
            );

        overlay.appendChild(
            windowElement
        );

        /* Header */

        const header =
            createElement(
                "div",
                {
                    className:
                        "smp-header"
                }
            );

        const title =
            createElement(
                "div",
                {
                    className:
                        "smp-title",
                    text:
                        "🧩 Mod Profiles"
                }
            );

        header.appendChild(title);

        header.appendChild(
            button(
                "✕",
                closeManager
            )
        );

        windowElement.appendChild(
            header
        );

        /* Content */

        const content =
            createElement(
                "div",
                {
                    className:
                        "smp-content"
                }
            );

        const sidebar =
            createElement(
                "div",
                {
                    className:
                        "smp-sidebar"
                }
            );

        const main =
            createElement(
                "div",
                {
                    className:
                        "smp-main"
                }
            );

        content.appendChild(
            sidebar
        );

        content.appendChild(
            main
        );

        windowElement.appendChild(
            content
        );

        /* Sidebar */

        const sidebarTitle =
            createElement(
                "div",
                {
                    className:
                        "smp-section-title",
                    text:
                        "Profiles"
                }
            );

        sidebar.appendChild(
            sidebarTitle
        );

        Object.keys(profiles)
            .forEach(name => {

                const mods =
                    profiles[name] || [];

                const profileButton =
                    createElement(
                        "button",
                        {
                            className:
                                "smp-profile"
                                +
                                (
                                    name === active
                                    ? " active"
                                    : ""
                                )
                        }
                    );

                profileButton.innerHTML =
                    `
                    <div class="smp-profile-name">
                        ${escapeHtml(name)}
                    </div>
                    <div class="smp-profile-count">
                        ${mods.length} Mod${mods.length === 1 ? "" : "s"}
                    </div>
                    `;

                profileButton.addEventListener(
                    "click",
                    () => {
                        currentSelectedProfile =
                            name;

                        renderManager();
                    }
                );

                sidebar.appendChild(
                    profileButton
                );
            });

        sidebar.appendChild(
            button(
                "＋ Neues Profil",
                createProfile,
                "primary"
            )
        );

        /* Selected profile */

        const selected =
            currentSelectedProfile &&
            profiles[currentSelectedProfile]
                ? currentSelectedProfile
                : active;

        currentSelectedProfile =
            selected;

        renderProfileMain(
            main,
            selected,
            profiles
        );

        /* Footer */

        const footer =
            createElement(
                "div",
                {
                    className:
                        "smp-footer"
                }
            );

        const leftFooter =
            createElement(
                "div"
            );

        leftFooter.appendChild(
            button(
                "📥 Importieren",
                importProfiles
            )
        );

        leftFooter.appendChild(
            button(
                "📤 Exportieren",
                exportProfiles
            )
        );

        const rightFooter =
            createElement(
                "div"
            );

        rightFooter.appendChild(
            button(
                "Schließen",
                closeManager
            )
        );

        footer.appendChild(
            leftFooter
        );

        footer.appendChild(
            rightFooter
        );

        windowElement.appendChild(
            footer
        );
    }

    /* ========================================================
       PROFILE MAIN
    ======================================================== */

    function renderProfileMain(
        main,
        profileName,
        profiles
    ) {
        const mods =
            profiles[profileName] || [];

        const active =
            getActiveProfile();

        main.innerHTML = "";

        const heading =
            createElement(
                "div",
                {
                    className:
                        "smp-section-title",
                    text:
                        "📁 " + profileName
                }
            );

        main.appendChild(
            heading
        );

        const info =
            createElement(
                "div",
                {
                    className:
                        "smp-info"
                }
            );

        if (profileName === active) {
            info.innerHTML =
                `🟢 Dieses Profil ist aktuell aktiv.`;
        } else {
            info.innerHTML =
                `⚪ Dieses Profil ist nicht aktiv.`;
        }

        main.appendChild(info);

        /* Buttons */

        const controls =
            createElement(
                "div",
                {
                    className:
                        "smp-section"
                }
            );

        if (profileName !== active) {
            controls.appendChild(
                button(
                    "▶ Profil aktivieren",
                    () =>
                        activateProfile(
                            profileName
                        ),
                    "primary"
                )
            );
        }

        controls.appendChild(
            button(
                "✏ Umbenennen",
                () =>
                    renameProfile(
                        profileName
                    )
            )
        );

        if (
            profileName !== DEFAULT_PROFILE
        ) {
            controls.appendChild(
                button(
                    "🗑 Löschen",
                    () =>
                        deleteProfile(
                            profileName
                        ),
                    "danger"
                )
            );
        }

        controls.appendChild(
            button(
                "🔄 Aktuelle Mods übernehmen",
                () =>
                    importCurrentMods(
                        profileName
                    ),
                "blue"
            )
        );

        main.appendChild(
            controls
        );

        /* Add mod */

        const addSection =
            createElement(
                "div",
                {
                    className:
                        "smp-section"
                }
            );

        addSection.appendChild(
            createElement(
                "div",
                {
                    className:
                        "smp-section-title",
                    text:
                        "➕ Mod hinzufügen"
                }
            )
        );

        const input =
            createElement(
                "input",
                {
                    className:
                        "smp-input",
                    placeholder:
                        "z.B. chem.js oder https://example.com/mod.js"
                }
            );

        addSection.appendChild(
            input
        );

        addSection.appendChild(
            button(
                "Mod hinzufügen",
                () => {
                    addMod(
                        profileName,
                        input.value
                    );
                },
                "primary"
            )
        );

        main.appendChild(
            addSection
        );

        /* Mod list */

        const modSection =
            createElement(
                "div",
                {
                    className:
                        "smp-section"
                }
            );

        modSection.appendChild(
            createElement(
                "div",
                {
                    className:
                        "smp-section-title",
                    text:
                        `Mods (${mods.length})`
                }
            )
        );

        if (mods.length === 0) {
            modSection.appendChild(
                createElement(
                    "div",
                    {
                        className:
                            "smp-empty",
                        text:
                            "Dieses Profil enthält noch keine Mods."
                    }
                )
            );
        }

        mods.forEach(
            (mod, index) => {

                const row =
                    createElement(
                        "div",
                        {
                            className:
                                "smp-mod"
                        }
                    );

                const name =
                    createElement(
                        "div",
                        {
                            className:
                                "smp-mod-name",
                            text:
                                mod
                        }
                    );

                const remove =
                    button(
                        "✕",
                        () =>
                            removeMod(
                                profileName,
                                index
                            ),
                        "danger"
                    );

                row.appendChild(
                    name
                );

                row.appendChild(
                    remove
                );

                modSection.appendChild(
                    row
                );
            }
        );

        main.appendChild(
            modSection
        );
    }

    /* ========================================================
       PROFILE OPERATIONS
    ======================================================== */

    function createProfile() {
        const name =
            prompt(
                "Name des neuen Profils:"
            );

        if (!name) {
            return;
        }

        const cleanName =
            name.trim();

        if (!cleanName) {
            return;
        }

        const profiles =
            loadProfiles();

        if (
            profiles[cleanName]
        ) {
            alert(
                "Dieses Profil existiert bereits."
            );
            return;
        }

        profiles[cleanName] = [];

        saveProfiles(
            profiles
        );

        currentSelectedProfile =
            cleanName;

        renderManager();
    }

    function renameProfile(
        oldName
    ) {
        const newName =
            prompt(
                "Neuer Profilname:",
                oldName
            );

        if (!newName) {
            return;
        }

        const cleanName =
            newName.trim();

        if (
            !cleanName ||
            cleanName === oldName
        ) {
            return;
        }

        const profiles =
            loadProfiles();

        if (
            profiles[cleanName]
        ) {
            alert(
                "Dieses Profil existiert bereits."
            );
            return;
        }

        profiles[cleanName] =
            profiles[oldName];

        delete profiles[oldName];

        saveProfiles(
            profiles
        );

        if (
            getActiveProfile() ===
            oldName
        ) {
            setActiveProfile(
                cleanName
            );
        }

        currentSelectedProfile =
            cleanName;

        renderManager();
    }

    function deleteProfile(
        name
    ) {
        const profiles =
            loadProfiles();

        if (
            name === DEFAULT_PROFILE
        ) {
            alert(
                "Das Standard-Profil kann nicht gelöscht werden."
            );
            return;
        }

        if (
            !confirm(
                `Profil "${name}" wirklich löschen?`
            )
        ) {
            return;
        }

        delete profiles[name];

        saveProfiles(
            profiles
        );

        if (
            getActiveProfile() ===
            name
        ) {
            setActiveProfile(
                DEFAULT_PROFILE
            );
        }

        currentSelectedProfile =
            getActiveProfile();

        renderManager();
    }

    /* ========================================================
       MOD OPERATIONS
    ======================================================== */

    function addMod(
        profileName,
        mod
    ) {
        const normalized =
            normalizeMod(mod);

        if (!normalized) {
            alert(
                "Bitte einen Mod-Dateinamen oder eine URL eingeben."
            );
            return;
        }

        const profiles =
            loadProfiles();

        if (
            !profiles[profileName]
        ) {
            return;
        }

        if (
            profiles[profileName]
                .includes(normalized)
        ) {
            alert(
                "Dieser Mod ist bereits im Profil."
            );
            return;
        }

        profiles[profileName]
            .push(normalized);

        saveProfiles(
            profiles
        );

        renderManager();
    }

    function removeMod(
        profileName,
        index
    ) {
        const profiles =
            loadProfiles();

        if (
            !profiles[profileName]
        ) {
            return;
        }

        profiles[profileName]
            .splice(index, 1);

        saveProfiles(
            profiles
        );

        renderManager();
    }

    function importCurrentMods(
        profileName
    ) {
        const currentMods =
            getEnabledMods();

        const profiles =
            loadProfiles();

        profiles[profileName] =
            uniqueMods(
                currentMods
            );

        saveProfiles(
            profiles
        );

        alert(
            `${profiles[profileName].length} Mods wurden in "${profileName}" übernommen.`
        );

        renderManager();
    }

    /* ========================================================
       PROFILE ACTIVATION
    ======================================================== */

    function activateProfile(
        profileName
    ) {
        const profiles =
            loadProfiles();

        if (
            !profiles[profileName]
        ) {
            alert(
                "Profil nicht gefunden."
            );
            return;
        }

        const mods =
            uniqueMods(
                profiles[profileName]
            );

        if (
            !confirm(
                `Profil "${profileName}" aktivieren?\n\n` +
                `${mods.length} Mod(s) werden geladen.\n\n` +
                `Sandboxels wird danach neu geladen.`
            )
        ) {
            return;
        }

        /*
         * Save the selected profile first.
         */
        setActiveProfile(
            profileName
        );

        /*
         * Tell Sandboxels which mods should
         * be loaded on the next page load.
         */
        setEnabledMods(
            mods
        );

        /*
         * Reload.
         */
        location.reload();
    }

    /* ========================================================
       EXPORT / IMPORT
    ======================================================== */

    function exportProfiles() {
        const profiles =
            loadProfiles();

        const data = {
            format:
                "Sandboxels Mod Profiles",
            version:
                1,
            activeProfile:
                getActiveProfile(),
            profiles:
                profiles
        };

        const json =
            JSON.stringify(
                data,
                null,
                2
            );

        const blob =
            new Blob(
                [json],
                {
                    type:
                        "application/json"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const a =
            document.createElement(
                "a"
            );

        a.href = url;

        a.download =
            "sandboxels_mod_profiles.json";

        a.click();

        URL.revokeObjectURL(
            url
        );
    }

    function importProfiles() {
        const input =
            document.createElement(
                "input"
            );

        input.type = "file";
        input.accept =
            ".json,application/json";

        input.addEventListener(
            "change",
            () => {

                const file =
                    input.files[0];

                if (!file) {
                    return;
                }

                const reader =
                    new FileReader();

                reader.onload =
                    function () {

                        try {

                            const data =
                                JSON.parse(
                                    reader.result
                                );

                            if (
                                !data ||
                                !data.profiles
                            ) {
                                throw new Error(
                                    "Ungültiges Profilformat"
                                );
                            }

                            const imported =
                                data.profiles;

                            const profiles =
                                loadProfiles();

                            for (
                                const name
                                in imported
                            ) {

                                if (
                                    !Array.isArray(
                                        imported[name]
                                    )
                                ) {
                                    continue;
                                }

                                profiles[name] =
                                    uniqueMods(
                                        imported[name]
                                    );
                            }

                            saveProfiles(
                                profiles
                            );

                            if (
                                data.activeProfile &&
                                profiles[
                                    data.activeProfile
                                ]
                            ) {
                                setActiveProfile(
                                    data.activeProfile
                                );
                            }

                            alert(
                                "Profile erfolgreich importiert."
                            );

                            renderManager();

                        } catch (error) {

                            console.error(
                                error
                            );

                            alert(
                                "Die Datei konnte nicht importiert werden."
                            );
                        }
                    };

                reader.readAsText(
                    file
                );
            }
        );

        input.click();
    }

    /* ========================================================
       ESCAPE HTML
    ======================================================== */

    function escapeHtml(
        text
    ) {
        return String(text)
            .replaceAll(
                "&",
                "&amp;"
            )
            .replaceAll(
                "<",
                "&lt;"
            )
            .replaceAll(
                ">",
                "&gt;"
            )
            .replaceAll(
                '"',
                "&quot;"
            )
            .replaceAll(
                "'",
                "&#039;"
            );
    }

    /* ========================================================
       MOD BUTTON
    ======================================================== */

    function createToolbarButton() {

        /*
         * Sandboxels toolbar can change between versions.
         * We therefore create a floating button instead of
         * modifying the game's internal toolbar.
         */

        if (
            document.getElementById(
                "sandboxels-mod-profiles-button"
            )
        ) {
            return;
        }

        const btn =
            document.createElement(
                "button"
            );

        btn.id =
            "sandboxels-mod-profiles-button";

        btn.textContent =
            "🧩 Profiles";

        Object.assign(
            btn.style,
            {
                position: "fixed",
                right: "10px",
                bottom: "10px",
                zIndex: "999998",
                padding: "9px 13px",
                border: "2px solid #777",
                borderRadius: "6px",
                background: "#333",
                color: "#fff",
                cursor: "pointer",
                fontFamily:
                    "Arial, sans-serif",
                fontSize: "14px",
                boxShadow:
                    "0 2px 8px rgba(0,0,0,.4)"
            }
        );

        btn.addEventListener(
            "mouseenter",
            () => {
                btn.style.background =
                    "#4a4a4a";
            }
        );

        btn.addEventListener(
            "mouseleave",
            () => {
                btn.style.background =
                    "#333";
            }
        );

        btn.addEventListener(
            "click",
            openManager
        );

        document.body.appendChild(
            btn
        );
    }

    /* ========================================================
       KEYBOARD SHORTCUT
    ======================================================== */

    function setupKeyboard() {
        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.ctrlKey &&
                    event.shiftKey &&
                    event.code ===
                        "KeyM"
                ) {

                    event.preventDefault();

                    openManager();
                }

                if (
                    event.code ===
                        "Escape" &&
                    overlay
                ) {

                    closeManager();
                }
            }
        );
    }

    /* ========================================================
       INITIALIZATION
    ======================================================== */

    function init() {

        /*
         * Make sure the default profile exists.
         */

        const profiles =
            loadProfiles();

        if (
            !profiles[DEFAULT_PROFILE]
        ) {
            profiles[
                DEFAULT_PROFILE
            ] = [];

            saveProfiles(
                profiles
            );
        }

        /*
         * Make sure active profile is valid.
         */

        const active =
            getActiveProfile();

        if (
            !profiles[active]
        ) {
            setActiveProfile(
                DEFAULT_PROFILE
            );
        }

        /*
         * Wait until Sandboxels has
         * created its page.
         */

        setTimeout(
            () => {

                createToolbarButton();
                setupKeyboard();

                console.log(
                    "[Mod Profiles] Loaded."
                );

                console.log(
                    "[Mod Profiles] Current profile:",
                    getActiveProfile()
                );

                console.log(
                    "[Mod Profiles] Enabled mods:",
                    getEnabledMods()
                );

            },
            1000
        );
    }

    /*
     * Start the manager.
     */

    if (
        document.readyState ===
        "loading"
    ) {

        document.addEventListener(
            "DOMContentLoaded",
            init
        );

    } else {

        init();

    }

})();
```
