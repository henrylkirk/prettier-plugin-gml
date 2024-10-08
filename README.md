# GameMaker Language Parser

A parser and Prettier plugin for GameMaker Language (GML) implemented in Antlr4.

<p align="center">
  <a href="https://github.com/henrylkirk/prettier-plugin-gml/issues">
    <img alt="Github Issues" src="https://img.shields.io/github/issues/henrylkirk/prettier-plugin-gml">
  </a>
</p>

## Prettier GML Plugin

- [Overview](#overview)
  - [Example](#example)
- [Installation](#installation)
  - [Prerequisites](#prerequisites)
  - [Global Install](#global-install)
  - [Local Install](#local-install)
- [Usage](#usage)
  - [⚠️IMPORTANT NOTICE⚠️](#important-notice)
  - [VS Code](#vs-code)
  - [Command Line](#command-line)
- [Troubleshooting](#troubleshooting)
- [Development](#development)

## Overview

This plugin enhances [Prettier](https://prettier.io/), a tool for automatically formatting your code in an opinionated way. This adds Game Maker Language (.gml file) support in the context of Game Maker Studio.

This repo uses the GmlSpec.xml found in /Users/Shared/GameMakerStudio2/Cache/runtimes/runtime-2022.6.1.40/GmlSpec.xml

## Example

### Before

```
var enemy = argument0; var damage = argument1

with(enemy)
{

	  self.hp-=damage
	if(self.hp<=0){instance_destroy(self)}
}
```

### After

```
var enemy = argument0;
var damage = argument1;

with (enemy) {
  self.hp -= damage;
  if (self.hp <= 0) {
    instance_destroy(self);
  }
}
```

## Installation

Install the prequisites, then follow either the global or local install below.

## Prerequisites

Node and npm must be installed. They can be installed together from here: https://nodejs.org/

You can then verify that Node and npm have been installed correctly by entering the following commands into any terminal such as Powershell:

```
node -v
npm -v
```

If you see a version number for each of them, success! Otherwise, try uninstalling your current version of Node and reinstall it.

## Global Install

This will install Prettier and the Prettier GML plugin globally on your machine, meaning it can be used for all of your projects.

```
npm install -g --save-exact prettier prettier-plugin-gml
```

## Local Install

This will install Prettier and the Prettier GML plugin ONLY for a single Game Maker project. Open up a terminal in the directory of your Game Maker project and run the following commands:

```
npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe" && npm run install:recursive:windows
bpm run install:recursive
```

### Windows
```bash
npm config set script-shell "C:\\Program Files\\git\\bin\\bash.exe"
npm run install:recursive
npm run prettier:plugin --path=C:\Users\henry\Documents\colmesh
```


## IMPORTANT NOTICE

This extension is still experimental, please be sure to commit your code into version control or have a backup before using this! There may be uncaught bugs that have the potential to delete code. If using VS Code, this is fixable with an "undo" command after saving.

## VS Code

Prettier integrates directly into VS Code! Once you have done the above setup, just install the "Prettier" and "GML Support" VS Code extensions. You may need to enable "editor.formatOnSave" in your VS Code preferences, and now when you save a GML file it should automatically format itself!

**WARNING**: If you followed the global install, this will cause Prettier to start formatting all files you open with VS Code that are supported with Prettier (such as HTML, JS, and CSS files).

## Command Line

To use without VS Code, simply follow the installation above and open up a terminal in the directory of your Game Maker project. Then just run

```
prettier --write .
```

For more advanced configurations, the Prettier docs have fantastic explanations of the command line options: https://prettier.io/docs/en/cli.html

## Troubleshooting

- One of the most common fixes may be to simply reinstall Node and npm from https://nodejs.org/
- If your Node and/or npm versions are very old (<12 or <6.14 respectively), uninstall and reinstall them with more up to date versions
- If you cannot find an answer to your issue after carefully reading through the installation and usage instructions, file an issue [right here!](https://github.com/henrylkirk/prettier-plugin-gml/issues)

## Development

Create a new folder and add a sample GML file to it. Inside that folder, git clone this repository. Then run

```
npm init
npm install --save-dev prettier
```

Once changes are made, the plugin can be tested with:

```
npx prettier --plugin .\prettier-plugin-gml\ .\TEST.gml
```

Or, run the development plugin version on a whole directory:

```
npm run write --path=/Users/henrykirk/GameMakerStudio2/ColMesh
```

## Tests

### Run all the tests for both the parser and the Prettier plugin

```
npm run test
```

### Run Prettier plugin tests

```
npm run test:plugin
```

### Run parser tests

```
npm run test:parser
```

## Generate code from grammar files via ANTLR
1. Download and install ANTLR4: https://www.antlr.org/download.html
2. ANTLR required Java, so install Java if you don't have it already: https://www.java.com/en/download/
3. Add ANTLR to your PATH. 
  * On Unix: ```export PATH=$PATH:/path/to/antlr/bin```
  * On Windows, add the ANTLR's bin directory to the system's PATH using the Environment Variables settings
4. Confirm installation: ```antlr -version```
5. Generate the parser and lexer files: ```antlr4 -Dlanguage=JavaScript -visitor -o ../src GameMakerLanguageLexer.g4 && antlr4 -Dlanguage=JavaScript -visitor -o ../src GameMakerLanguageParser.g4```

## Useful VSCode extensions

- ANTLR4 Grammar Syntax Support
