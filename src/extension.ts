// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { locale } from 'dayjs';
import * as vscode from 'vscode';
import { DirektivManager } from './direktiv';
import { InstanceManager } from './instance';
import { InstancesProvider, Instance } from './instances';
import { Schema } from './schema';

const fs = require("fs")
const path = require("path")
const mkdirp = require("mkdirp")
const homedir = require("os").homedir()

const schemaFP: string = JSON.stringify(Schema)

// Call this whenever you want to append to schema
function appendSchema() {
	// check if the schema doesnt exist create it
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

	// Todo clean up files i made in the deactivate vscode
	// make all directories
	let dirpath = path.join("/tmp", ".direktiv")
	mkdirp.sync(dirpath)

	// append json shema to yaml files
	appendSchema()
                    
	vscode.window.registerTreeDataProvider('instances', instances);

	let openLogs = vscode.commands.registerCommand("direktiv.openLogs", async(instance: Instance)=>{
		const instanceManager = new InstanceManager(instance.values.url, instance.values.token, instance.label)
		// await instanceManager.waitForInstanceCompletion()
		await instanceManager.createTempFile()
		await instanceManager.getLogsForInstance()
		await instanceManager.openLogs()
		
		let status = await instanceManager.getInstanceStatus()
		if (status === "pending") {
			let pollForNotPending = setInterval(async()=>{
				status = await instanceManager.getInstanceStatus()
				if (status !== "pending"){
					setTimeout(()=>{
						clearInterval(pollForNotPending)					
					},4000)
				} 
				await instanceManager.getLogsForInstance()
			},2000)
		}
	})

	context.subscriptions.push(openLogs)

	let refreshInstanceManager = vscode.commands.registerCommand("direktiv.refreshInstances", async()=>{
		instances.refresh()
	})
	
	context.subscriptions.push(refreshInstanceManager)

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
				const instanceManager = new InstanceManager(json.url, jsonToken[json.url], id)
				await instanceManager.createTempFile()
				await instanceManager.openLogs()
				let timer = setInterval(async()=>{
					let status = await instanceManager.getInstanceStatus()
					if (status !== "pending"){
						setTimeout(()=>{
							clearInterval(timer)			
						},4000)
					} 
					await instanceManager.getLogsForInstance()
				},2000)
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

	let cancelInstance = vscode.commands.registerCommand("direktiv.cancelInstance", async(inst: Instance)=>{
		const instanceManager = new InstanceManager(inst.values["url"], inst.values["token"], inst.label)
		await instanceManager.cancelInstance()
		instances.refresh()
	})

	context.subscriptions.push(cancelInstance)

}

// this method is called when your extension is deactivated
export function deactivate() {
	// TODO handle "/tmp" to be os friendly
	fs.rmdirSync(path.join("/tmp", ".direktiv"), { recursive: true });
}
