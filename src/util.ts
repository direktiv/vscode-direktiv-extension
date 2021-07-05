import * as vscode from 'vscode';
import { Schema } from './schema';

const homedir = require("os").homedir()
const path = require("path")
const fs = require("fs")

export const manifestDirektiv = ".direktiv.manifest.json"
const schemaFP: string = JSON.stringify(Schema)

interface Auth {
    url: string
    namespace: string
    token: string
}

export async function writeManifest(uri: vscode.Uri, data: string) {
    let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)
    if (process.platform === "win32") {
        manifest = manifest.substring(1);
    }
    fs.writeFileSync(manifest, data)
}

export async function readManifestForRevision(uri: vscode.Uri): Promise<any| undefined> {
    let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)
    if (process.platform === "win32") {
        manifest = manifest.substring(1);
    }
	if (fs.existsSync(manifest)) {
        const data = fs.readFileSync(manifest, {encoding: "utf8"})
        return JSON.parse(data)
    } else {
        vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
    }
}
export async function readManifest(uri: vscode.Uri): Promise<Auth | undefined>{
    let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)
    if (process.platform === "win32") {
        manifest = manifest.substring(1);
    }
	if (fs.existsSync(manifest)) {
        const data = fs.readFileSync(manifest, {encoding:'utf8'})
        const json = JSON.parse(data)
        const tokenData = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding: 'utf8'})
        const jsonToken = JSON.parse(tokenData)
        return {
            namespace: json.namespace,
            url: json.url,
            token: jsonToken[json.url]
        }
    } else {
        vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
    }
}

export async function handleError(resp: any, summary: string, perm: string) {
    const contentType = resp.headers.get('content-type');
    if(resp.status !== 403) {
        if (!contentType || !contentType.includes('application/json')) {
            let text = await resp.text()
            throw new Error (`${summary}: ${text}`)
        } else {
            let text = (await resp.json()).Message
            throw new Error (`${summary}: ${text}`)
        }
    } else {
        throw new Error(`You are unable to '${summary}', contact system admin or namespace owner to grant '${perm}'.`)
    }
}

export function appendSchema() {
	// check if the schema doesnt exist create it 
    // adding extra process here but it allows us to update the schema when pushing a new version 
	if(!fs.existsSync(path.join(homedir, ".direktiv.schema.json"))){
		// write schema to file
		fs.writeFileSync(path.join(homedir, ".direktiv.schema.json"), schemaFP)
		// Get Config
		const yamlCfg = vscode.workspace.getConfiguration("yaml")

		// Get Schema
		let yamlSchemas: Object | undefined = yamlCfg.get("schemas")

		// If schema Key does not exists append direktiv schema
		if (yamlSchemas && !(schemaFP in yamlSchemas)) {
			yamlCfg.update("schemas", {...yamlSchemas, [path.join(homedir, ".direktiv.schema.json")]: "*.direktiv.yaml"}, 1)
		}
        // force a reload
        vscode.commands.executeCommand("workbench.action.reloadWindow")
	} else {
        const data = fs.readFileSync(path.join(homedir, ".direktiv.schema.json"), {encoding: 'utf8'})
        if (data !== schemaFP) {
            fs.writeFileSync(path.join(homedir, ".direktiv.schema.json"), schemaFP)
            // force a reload
            setTimeout(()=>{
                vscode.commands.executeCommand("workbench.action.reloadWindow")
            },500)
        }
    }
}

export interface Input {
    url: string
    token: string
    namespace: string
}

export async function GetInput(): Promise<Input | undefined> {
    let url = await vscode.window.showInputBox({title:"Enter url to connect to", ignoreFocusOut: true})
    if (url === undefined) {
        return 
    }
    let namespace = await vscode.window.showInputBox({title: "Enter namespace to fetch", ignoreFocusOut: true})
    if (namespace === undefined) {
        return
    }
    let token = await vscode.window.showInputBox({title: "Enter token for authenticated access", ignoreFocusOut: true})
    if (token === undefined) {
        return
    }

    return {
        namespace: namespace,
        token: token,
        url: url
    }
}