// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { locale } from 'dayjs';
import * as vscode from 'vscode';
import { DirektivManager } from './direktiv';
import { InstanceManager } from './instance';
import { InstancesProvider } from './instances';

const fs = require("fs")
const path = require("path")
const homedir = require("os").homedir()

const schemaFP: string = "SCHEMA_PATH"

// Call this whenever you want to append to schema
function appendSchema() {
	// Get Config
	const yamlCfg = vscode.workspace.getConfiguration("yaml")

	// Get Schema
	let yamlSchemas: Object | undefined = yamlCfg.get("schemas")

	// If scehma Key does not exists append direktiv schema
	if (yamlSchemas && !(schemaFP in yamlSchemas)) {
		console.log(schemaFP + " no exists")
		yamlCfg.update("schemas", {...yamlSchemas, [schemaFP]: "*.direktiv.yaml"}, 1)
	}
}

export const manifestDirektiv = ".direktiv.manifest.json"
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "direktiv" is now active!');

	let instances = new InstancesProvider()
	vscode.window.registerTreeDataProvider('instances', instances);

	appendSchema()

	
	let logs = vscode.window.createOutputChannel("Direktiv")

	let addInstanceManager = vscode.commands.registerCommand("direktiv.addInstanceManager", async()=>{
		// The code you place here will be executed every time your command is executed
		// TODO replace constant variables with strings
		// let url = await vscode.window.showInputBox({title:"Enter url to connect to", ignoreFocusOut: true})
		// if (url === undefined) {
		// 	return
		// }
		// let namespace = await vscode.window.showInputBox({title: "Enter namespace to fetch", ignoreFocusOut: true})
		// if (namespace === undefined) {
		// 	return
		// }
		// let token = await vscode.window.showInputBox({title: "Enter token for authenticated access", ignoreFocusOut: true})
		// if (token === undefined) {
		// 	return
		// }

		// TODO remove when completed only for testing
		let url = "https://oz.direktiv.io"
		let namespace = "trent"
		let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0b2tlbi1iNzFmMjBkYS01ODc3LTQzNmItOGNmMS04MWU4MDY4YzFmNmIiLCJncm91cHMiOlsidG9rZW4tYjcxZjIwZGEtNTg3Ny00MzZiLThjZjEtODFlODA2OGMxZjZiIl0sImV4cCI6MTkzNzc4MDU3OCwiaXNzIjoiZGlyZWt0aXYifQ.MplLYyL2wK2D5fQfP1Xi9YiuuiRwusTD80CslTp-gnQ"
	
		instances.add(url, token, namespace)
		// vscode.window.createTreeView("instances", {
		// 	treeDataProvider: new InstancesProvider(url, token, namespace)
		// })
	})

	context.subscriptions.push(addInstanceManager)


	let pushWorkflow = vscode.commands.registerCommand("direktiv.pushWorkflow", async(uri: vscode.Uri)=>{
		let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)
		
		if (fs.existsSync(manifest)) {
			const data = fs.readFileSync(manifest, {encoding:'utf8'})
			const json = JSON.parse(data)

			const tokenData = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding: 'utf8'})
			const jsonToken = JSON.parse(tokenData)

			const manager = new DirektivManager(json.url, json.namespace, jsonToken[json.url], uri)
			await manager.CreateWorkflow()
		} else {
			vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
		}
	})

	context.subscriptions.push(pushWorkflow)

	let updateWorkflow = vscode.commands.registerCommand('direktiv.updateWorkflow', async(uri: vscode.Uri) => {
		let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)

		if (fs.existsSync(manifest)) {
			const data = fs.readFileSync(manifest, {encoding:'utf8'});
			const json = JSON.parse(data)

			const tokenData = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding:'utf8'})
			const jsonToken = JSON.parse(tokenData)

			const manager = new DirektivManager(json.url, json.namespace, jsonToken[json.url], uri)
			await manager.UpdateWorkflow()
			vscode.window.showInformationMessage(`Successfully updated workflow`)
		} else {
			vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
		}
	})

	context.subscriptions.push(updateWorkflow)

	let executeWorkflow = vscode.commands.registerCommand("direktiv.executeWorkflow", async(uri: vscode.Uri)=>{
		let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)

		if (fs.existsSync(manifest)) {
			const data = fs.readFileSync(manifest, {encoding:'utf8'});
			const json = JSON.parse(data)

			const tokenData = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding: 'utf8'})
			const jsonToken = JSON.parse(tokenData)

			const manager = new DirektivManager(json.url, json.namespace, jsonToken[json.url], uri)
			let id = await manager.ExecuteWorkflow()

			if(id !== "") {
				// todo handle logging and other details
				const instanceManager = new InstanceManager(json.url, jsonToken[json.url], id, logs)
				vscode.window.withProgress({location: vscode.ProgressLocation.Notification, title: 'Waiting for Instance Completion', cancellable: true}, async (p, token)=>{
					token.onCancellationRequested(async () => {
						console.log("User canceled the long running operation");
						await instanceManager.cancelInstance()
					});
					p.report({increment: 0})
					await instanceManager.waitForInstanceCompletion()					
					p.report({increment: 100})
				})
			}

		} else {
			vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
		}
	})

	context.subscriptions.push(executeWorkflow)

	let downloadWorkflows = vscode.commands.registerCommand('direktiv.connect', async (uri: vscode.Uri) => {
		// The code you place here will be executed every time your command is executed
		// TODO replace constant variables with strings
		// let url = await vscode.window.showInputBox({title:"Enter url to connect to", ignoreFocusOut: true})
		// if (url === undefined) {
		// 	return
		// }
		// let namespace = await vscode.window.showInputBox({title: "Enter namespace to fetch", ignoreFocusOut: true})
		// if (namespace === undefined) {
		// 	return
		// }
		// let token = await vscode.window.showInputBox({title: "Enter token for authenticated access", ignoreFocusOut: true})
		// if (token === undefined) {
		// 	return
		// }

		// TODO remove when completed only for testing
		let url = "https://oz.direktiv.io"
		let namespace = "trent"
		let token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwcmVmZXJyZWRfdXNlcm5hbWUiOiJ0b2tlbi1iNzFmMjBkYS01ODc3LTQzNmItOGNmMS04MWU4MDY4YzFmNmIiLCJncm91cHMiOlsidG9rZW4tYjcxZjIwZGEtNTg3Ny00MzZiLThjZjEtODFlODA2OGMxZjZiIl0sImV4cCI6MTkzNzc4MDU3OCwiaXNzIjoiZGlyZWt0aXYifQ.MplLYyL2wK2D5fQfP1Xi9YiuuiRwusTD80CslTp-gnQ"

		const manager = new DirektivManager(url, namespace, token, uri)
		await manager.GetWorkflows()
	});

	context.subscriptions.push(downloadWorkflows);

	let deleteWorkflow = vscode.commands.registerCommand("direktiv.deleteWorkflow", async(uri: vscode.Uri)=>{
		let manifest = path.join(path.dirname(uri.path.toString()), manifestDirektiv)

		if (fs.existsSync(manifest)) {
			const data = fs.readFileSync(manifest, {encoding:'utf8'})
			const json = JSON.parse(data)

			const tokenData = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding: 'utf8'})
			const jsonToken = JSON.parse(tokenData)

			const manager = new DirektivManager(json.url, json.namespace, jsonToken[json.url], uri)
			await manager.DeleteWorkflow()
		} else {
			vscode.window.showErrorMessage("Manifest doesn't exist right-click on the folder to Download Workflows.")
		}
	})

	context.subscriptions.push(deleteWorkflow)

	let cancelInstance = vscode.commands.registerCommand("direktiv.cancelInstance", async(uri: vscode.Uri)=>{
		console.log("uri =", uri)
		return
	})

	context.subscriptions.push(cancelInstance)

}

// this method is called when your extension is deactivated
export function deactivate() {}
