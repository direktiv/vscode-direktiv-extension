// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DirektivManager } from './direktiv';
import { InstanceManager } from './instance';

const fs = require("fs")
const path = require("path")
const homedir = require("os").homedir()

export const manifestDirektiv = ".direktiv.manifest.json"
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "direktiv" is now active!');

	
	let logs = vscode.window.createOutputChannel("Direktiv")

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
				vscode.window.withProgress({location: vscode.ProgressLocation.Window, title: 'Waiting for Instance Completion'}, async (p)=>{
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

}

// this method is called when your extension is deactivated
export function deactivate() {}
