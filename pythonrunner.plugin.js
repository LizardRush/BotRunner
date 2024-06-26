/**
 * @name PythonRunner
 * @description Runs a Python script on plugin start and provides settings to manage script parameters.
 * @version 1.0.0
 * @author Lizard Rush
 */

module.exports = (() => {
    const config = {
        info: {
            name: "PythonRunner",
            authors: [
                {
                    name: "Lizard Rush",
                    discord_id: "Your Discord ID",
                    github_username: "Your GitHub Username",
                    twitter_username: "Your Twitter Username"
                }
            ],
            version: "1.0.0",
            description: "Runs a Python script on plugin start and provides settings to manage script parameters.",
            github: "https://github.com/LizardRush/PythonRunner",
            github_raw: "https://raw.githubusercontent.com/LizardRush/PythonRunner/main/pythonrunner.plugin.js"
        },
        changelog: [
            {
                title: "Initial Release",
                type: "added",
                items: [
                    "First version of the plugin."
                ]
            }
        ],
        main: "pythonrunner.plugin.js"
    };

    const css = `
        .plugin-settings {
            padding: 10px;
            color: white;
        }

        .plugin-settings label {
            font-weight: bold;
        }

        .plugin-settings input[type="text"] {
            width: calc(100% - 20px);
            padding: 8px;
            margin-bottom: 10px;
            box-sizing: border-box;
        }

        .plugin-settings button {
            padding: 8px 16px;
            background-color: #7289da;
            color: white;
            border: none;
            cursor: pointer;
            transition: background-color 0.3s;
        }

        .plugin-settings button:hover {
            background-color: #5f73bc;
        }
    `;

    return !global.ZeresPluginLibrary ? class {
        constructor() { this._config = config; }
        getName() { return config.info.name; }
        getAuthor() { return config.info.authors.map(a => a.name).join(", "); }
        getDescription() { return config.info.description; }
        getVersion() { return config.info.version; }
        load() {
            BdApi.showConfirmationModal("Library Missing", `The library plugin needed for ${config.info.name} is missing. Please click Download Now to install it.`, {
                confirmText: "Download Now",
                cancelText: "Cancel",
                onConfirm: () => {
                    require("request").get("https://rauenzi.github.io/BDPluginLibrary/release/0PluginLibrary.plugin.js", async (err, res, body) => {
                        if (err) return require("electron").shell.openExternal("https://betterdiscord.app/Download?id=9");
                        await new Promise(r => require("fs").writeFile(require("path").join(BdApi.Plugins.folder, "0PluginLibrary.plugin.js"), body, r));
                    });
                }
            });

            this.checkForUpdates();
        }
        start() { }
        stop() { }

        checkForUpdates() {
            const currentVersion = config.info.version;
            const githubRawURL = config.info.github_raw;

            require("request").get(githubRawURL, (err, res, body) => {
                if (err) {
                    console.error(`Error checking for updates: ${err.message}`);
                    return;
                }

                try {
                    const remoteConfig = JSON.parse(body);
                    const latestVersion = remoteConfig.info.version;

                    if (latestVersion && latestVersion !== currentVersion) {
                        BdApi.showConfirmationModal("New Version Available", `A new version (${latestVersion}) of ${config.info.name} is available. Do you want to update?`, {
                            confirmText: "Update Now",
                            cancelText: "Later",
                            onConfirm: () => this.updatePlugin(remoteConfig)
                        });
                    }
                } catch (error) {
                    console.error(`Error parsing remote config: ${error.message}`);
                }
            });
        }

        updatePlugin(remoteConfig) {
            const pluginFile = require("path").join(BdApi.Plugins.folder, config.info.name + '.plugin.js');
            const updatedScript = remoteConfig.raw;

            require("fs").writeFile(pluginFile, updatedScript, (err) => {
                if (err) {
                    console.error(`Error updating plugin: ${err.message}`);
                    return;
                }

                BdApi.alert("Plugin Updated", `${config.info.name} has been updated to version ${remoteConfig.info.version}. Please restart Discord to apply the changes.`);
            });
        }
    } : (([Plugin, Library]) => {
        const { Settings } = Library;
        const fs = require('fs');
        const path = require('path');
        const { exec } = require('child_process');

        const PLUGIN_NAME = 'PythonRunner';
        const SETTINGS_FILE = path.join(BdApi.Plugins.folder, 'settings.json');
        const PYTHON_DIR = path.join(BdApi.Plugins.folder, 'bot');
        const PYTHON_FILE = path.join(PYTHON_DIR, 'main.py');

        return class PythonRunner extends Plugin {
            constructor() {
                super();
                this.settings = this.loadSettings();
            }

            onStart() {
                this.ensurePythonDirectory();

                if (!fs.existsSync(PYTHON_FILE)) {
                    this.disablePluginWithToast("Python script not found. Disabling the plugin.");
                } else {
                    this.runPythonScript();
                }
            }

            onStop() {
                console.log(`${PLUGIN_NAME} has stopped`);
            }

            ensurePythonDirectory() {
                if (!fs.existsSync(PYTHON_DIR)) {
                    fs.mkdirSync(PYTHON_DIR, { recursive: true });
                    this.disablePluginWithToast("Created 'bot' directory. Please add 'main.py' and re-enable the plugin.");
                }
            }

            disablePluginWithToast(message) {
                BdApi.Plugins.disable(config.info.name);
                BdApi.showToast(message, { type: "error" });
            }

            loadSettings() {
                if (!fs.existsSync(SETTINGS_FILE)) {
                    const defaultSettings = {
                        stringVar: 'defaultString',
                        intVar: 0,
                        boolVar: false,
                        confirmed: false
                    };
                    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2));
                    return defaultSettings;
                } else {
                    return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf-8'));
                }
            }

            saveSettings() {
                fs.writeFileSync(SETTINGS_FILE, JSON.stringify(this.settings, null, 2));
            }

            runPythonScript() {
                if (fs.existsSync(PYTHON_FILE)) {
                    exec(`python "${PYTHON_FILE}"`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error executing Python script: ${error.message}`);
                            return;
                        }
                        console.log(`Python script output: ${stdout}`);
                        if (stderr) {
                            console.error(`Python script error: ${stderr}`);
                        }
                    });
                } else {
                    this.disablePluginWithToast(`Python script at ${PYTHON_FILE} does not exist. Disabling plugin.`);
                }
            }

            getSettingsPanel() {
                const panel = document.createElement("div");
                panel.className = "plugin-settings";
                panel.innerHTML = `
                    <h3>Settings for ${PLUGIN_NAME}</h3>
                    <label for="pythonScriptLink">Enter Python Script Link:</label><br>
                    <input type="text" id="pythonScriptLink" name="pythonScriptLink" style="width: calc(100% - 20px); padding: 8px; margin-bottom: 10px; box-sizing: border-box;"><br><br>
                `;

                const importButton = document.createElement('button');
                importButton.innerText = "Import Python Script";
                importButton.onclick = () => {
                    const url = document.getElementById("pythonScriptLink").value;
                    this.importPythonScript(url);
                };
                panel.appendChild(importButton);

                BdApi.injectCSS(config.info.name, css);
                return panel;
            }

            importPythonScript(url) {
                require('request').get(url, (err, res, body) => {
                    if (err) {
                        BdApi.showToast(`Failed to download Python script: ${err.message}`, { type: "error" });
                        return;
                    }

                    fs.writeFile(PYTHON_FILE, body, (err) => {
                        if (err) {
                            BdApi.showToast(`Failed to save Python script: ${err.message}`, { type: "error" });
                            return;
                        }

                        BdApi.showToast('Python script imported successfully. Please restart the plugin.', { type: "success" });
                    });
                });
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
