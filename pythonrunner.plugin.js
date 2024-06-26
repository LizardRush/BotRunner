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
            github: "https://github.com/LizardRush/BotRunner",
            github_raw: "https://raw.githubusercontent.com/LizardRush/BotRunner/main/pythonrunner.plugin.js"
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
        }
        start() { }
        stop() { }
    } : (([Plugin, Library]) => {
        const { Patcher, Settings } = Library;
        const fs = require('fs');
        const path = require('path');
        const { exec } = require('child_process');

        const PLUGIN_NAME = 'PythonRunner';
        const SETTINGS_FILE = path.join(__dirname, 'settings.json');
        const PYTHON_DIR = path.join(__dirname, 'bot');
        const PYTHON_FILE = path.join(PYTHON_DIR, 'main.py');

        return class PythonRunner extends Plugin {
            constructor() {
                super();
                this.settings = this.loadSettings();
            }

            onStart() {
                if (!this.settings.confirmed) {
                    BdApi.showConfirmationModal("This plugin may crash", "As this plugin is under development, do you wish to continue?", {
                        confirmText: "Yes",
                        cancelText: "No",
                        onCancel: () => this.selfDelete(),
                        onConfirm: () => {
                            this.settings.confirmed = true;
                            this.saveSettings();
                            this.ensurePythonScript();
                            this.runPythonScript();
                            console.log(`${PLUGIN_NAME} has started`);
                        }
                    });
                } else {
                    this.ensurePythonScript();
                    this.runPythonScript();
                    console.log(`${PLUGIN_NAME} has started`);
                }
            }

            onStop() {
                Patcher.unpatchAll(PLUGIN_NAME);
                console.log(`${PLUGIN_NAME} has stopped`);
            }

            selfDelete() {
                const pluginFile = path.join(BdApi.Plugins.folder, config.info.name + '.plugin.js');
                if (fs.existsSync(pluginFile)) {
                    fs.unlinkSync(pluginFile);
                    BdApi.Plugins.disable(config.info.name);
                }
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

            ensurePythonScript() {
                if (!fs.existsSync(PYTHON_DIR)) {
                    fs.mkdirSync(PYTHON_DIR, { recursive: true });
                }
            }

            runPythonScript() {
                if (fs.existsSync(PYTHON_FILE)) {
                    const code = fs.readFileSync(PYTHON_FILE, 'utf-8');
                    const replacedCode = this.replaceVariables(code);
                    exec(`python -c "${replacedCode.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Error executing Python script: ${error.message}`);
                            return;
                        }
                        if (stderr) {
                            console.error(`Python script stderr: ${stderr}`);
                            return;
                        }
                        console.log(`Python script output: ${stdout}`);
                    });
                } else {
                    BdApi.alert('Python Script Missing', `The Python script at ${PYTHON_FILE} does not exist.`);
                }
            }

            replaceVariables(code) {
                return code
                    .replace(/{{bd\.string\.(\w+)}}/g, (_, key) => `"${this.settings[key]}"`)
                    .replace(/{{bd\.int\.(\w+)}}/g, (_, key) => this.settings[key])
                    .replace(/{{bd\.bool\.(\w+)}}/g, (_, key) => this.settings[key]);
            }

            getSettingsPanel() {
                const panel = document.createElement("div");
                panel.innerHTML = `<h3>Settings for ${PLUGIN_NAME}</h3>`;

                const stringInput = document.createElement('input');
                stringInput.type = 'text';
                stringInput.value = this.settings.stringVar;
                stringInput.oninput = (e) => {
                    this.settings.stringVar = e.target.value;
                    this.saveSettings();
                };
                panel.appendChild(stringInput);

                const intInput = document.createElement('input');
                intInput.type = 'number';
                intInput.value = this.settings.intVar;
                intInput.oninput = (e) => {
                    this.settings.intVar = parseInt(e.target.value);
                    this.saveSettings();
                };
                panel.appendChild(intInput);

                const boolInput = document.createElement('input');
                boolInput.type = 'checkbox';
                boolInput.checked = this.settings.boolVar;
                boolInput.onchange = (e) => {
                    this.settings.boolVar = e.target.checked;
                    this.saveSettings();
                };
                panel.appendChild(boolInput);

                const runButton = document.createElement('button');
                runButton.innerText = 'Run';
                runButton.onclick = () => this.runPythonScript();
                panel.appendChild(runButton);

                return panel;
            }
        };
    })(global.ZeresPluginLibrary.buildPlugin(config));
})();
