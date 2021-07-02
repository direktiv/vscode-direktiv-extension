// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DirektivManager } from './direktiv';
import { InstanceManager } from './instance';
import { InstancesProvider, Instance } from './instances';
import { setupKeybinds } from './keybinds';
import { GetInput, appendSchema, readManifest, readManifestForRevision, writeManifest } from './util';

const fs = require("fs")
const path = require("path")
const mkdirp = require("mkdirp")
const yaml = require("yaml")

const tempdir = require("os").tmpdir()
const { exec } = require("child_process");

const process = require("process")

let binName = ""
let isMac =  process.platform === "darwin"
let isWindows = process.platform === "win32"
let isLinux = process.platform === "linux"

if(isWindows) {
	binName = "direktion-windows.exe"
}
if (isMac) {
	binName = "direktion-darwin"
}
if (isLinux){
	binName = "direktion-linux"
}

export const manifestDirektiv = ".direktiv.manifest.json"
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "direktiv" is now active!');
	let direktionPath = path.join(__filename, '..', '..', 'resources', binName)


	let instances = new InstancesProvider(context.globalState)
	// Pull any services from storage
	instances.syncManagersToStorage()

	// make all directories
	let dirpath = path.join(tempdir, ".direktiv")
	mkdirp.sync(dirpath)

	// append json shema to yaml files
	appendSchema()
                    
	vscode.window.registerTreeDataProvider('instances', instances);

	// create diagnostics collection for direktion
	const direktionDiagnostics = vscode.languages.createDiagnosticCollection("direktion")
	context.subscriptions.push(direktionDiagnostics)

    context = setupKeybinds(context)

	// on save check for errors
	let onSave = vscode.workspace.onDidSaveTextDocument(async (e: vscode.TextDocument) => {
		if (path.extname(e.fileName) === ".direktion"){
			// todo check if its not a direktion file then skip this step
			exec(`${direktionPath} diagnostic ${e.uri.path}`, (error: Error, stdout: string, stderr: string)=>{
				if (error) {
					vscode.window.showErrorMessage(`${error}`)
					return;
				}
				if (stderr) {
					vscode.window.showErrorMessage(`${stderr}`)
					return;
				}
				if (stdout) {
					let arr: Array<vscode.Diagnostic> = []

					let output = JSON.parse(stdout)
					for(let i=0; i < output.length; i++) {
						let range = new vscode.Range(output[i].StartLine-1, output[i].StartColumn, output[i].EndLine-1, output[i].EndColumn)
						let dig = new vscode.Diagnostic(range , output[i].Msg, undefined)
						arr.push(dig)
					}
					direktionDiagnostics.set(e.uri, arr)
				} else {
					exec(`${direktionPath} format ${e.uri.path}`, (error: Error, stdout: string, stderr: string )=>{
						if (error) {
							vscode.window.showErrorMessage(`${error}`)
							return;
						}
						if(stderr) {
							vscode.window.showErrorMessage(`${stderr}`)
						}
						
					})
				}
				
			})
		}
        let split = e.fileName.split(".")
        if(split[1] === "direktiv" && split[2] === "yaml") {
            try {
                let maniData = fs.readFileSync(e.uri.path, {encoding:'utf8'});
                let ydata = yaml.parse(maniData)
                console.log(ydata)
                // if (maniData !== ""){
                    // manifestData exist we should try upload the file
                    let auth = await readManifest(e.uri)
                    if(auth === undefined){
                        return
                    }
                    const manager = new DirektivManager(auth.url, auth.namespace, auth.token, e.uri)
                    let exist = await manager.doesWorkflowExist(ydata.id)
                    if (!exist) {
                        await manager.CreateWorkflow()
                    }
                // }
            } catch(e) {
                vscode.window.showErrorMessage(e.message)
            }
        }
	})

	context.subscriptions.push(onSave)

	let compileToYAML = vscode.commands.registerCommand("direktion.compileToYAML", async(uri: vscode.Uri) => {

        // Todo use direktion tokens to find the workflow id and then replace 'basename' currently with what the workflow id would be.

		// check if file already exists
		let basename = path.basename(uri.path).split(path.extname(uri.path))[0]
		let newYAMLPath = path.join(path.dirname(uri.path), `${basename}.direktiv.yaml`)

		if (fs.existsSync(newYAMLPath)) {
			let result = await vscode.window.showInformationMessage("File already exists would you like to override?", "Yes", "No")
			if (result == "No" || result == undefined) {
				return
			}
		}

		exec(`${direktionPath} compile ${uri.path}`, (error: Error, stdout: string, stderr: string)=> {
			if (error) {
				vscode.window.showErrorMessage(`${error}`)
				return;
			}
			if (stderr) {
				vscode.window.showErrorMessage(`${stderr}`)
				return;
			}
			fs.writeFileSync(newYAMLPath, stdout)
		})
	})

	context.subscriptions.push(compileToYAML)

	let openLogs = vscode.commands.registerCommand("direktiv.openLogs", async(instance: Instance)=>{
		const instanceManager = new InstanceManager(instance.values.url, instance.values.token, instance.label)
		await instanceManager.createTempFile()
		await instanceManager.openLogs()

	    // write the input
        // make sure input gets stored globally before we start getting logs to add input at the front
        await instanceManager.getExtraDataForInstanceString("input")
        let fetchedOutput = false
		let status = await instanceManager.getInstanceStatus()
  
		await instanceManager.getLogsForInstance()

		if (status === "pending") {
			let pollForNotPending = setInterval(async()=>{
				status = await instanceManager.getInstanceStatus()
				if (status !== "pending"){
					setTimeout(()=>{
                        if (!fetchedOutput){                              
                            clearInterval(pollForNotPending)	
                            setTimeout(async()=>{
                                await instanceManager.getExtraDataForInstanceString("output")
                                await instanceManager.writeOutput() 
                            }, 500)
                        }
                        fetchedOutput = true
                    },4000)
				} 
				await instanceManager.getLogsForInstance()
			},2000)
		} else {
            await instanceManager.getExtraDataForInstanceString("output")
            await instanceManager.writeOutput() 
        }
	})

	context.subscriptions.push(openLogs)

	let refreshInstanceManager = vscode.commands.registerCommand("direktiv.refreshInstances", async()=>{
		instances.refresh()
	})
	
	context.subscriptions.push(refreshInstanceManager)

	let addInstanceManager = vscode.commands.registerCommand("direktiv.addInstanceManager", async()=>{
		let input = await GetInput()
		if (input === undefined) {
			return
		}
		instances.add(input.url, input.token, input.namespace)
	})

	context.subscriptions.push(addInstanceManager)

	let pushWorkflow = vscode.commands.registerCommand("direktiv.pushWorkflow", async(uri: vscode.Uri)=>{
		let auth = await readManifest(uri)
		if(auth === undefined){
			return
		}
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, uri)
		await manager.CreateWorkflow()
	})

	context.subscriptions.push(pushWorkflow)

    let pullWorkflow = vscode.commands.registerCommand('direktiv.pullWorkflow', async(uri: vscode.Uri) => {
        let auth = await readManifest(uri)
        if(auth === undefined) {
            return
        }

        const manager = new DirektivManager(auth.url, auth.namespace, auth.token, uri)

        // get workflowid from filepath
        const id = await manager.getID()
        // get workflowRevision 
        const revision = await manager.GetWorkflowRevision(id)

        console.log('hey')
        // get workflow data
        const yaml = await manager.GetWorkflowData(id)
        console.log(yaml)
        // get local manifest to update manifest when pulling
        const manifest = await readManifestForRevision(uri)

        // update to new revision we're pulling
        manifest[id] = revision

        // write yaml out
        fs.writeFileSync(uri.path, yaml)

        // write manifest out
        writeManifest(uri, JSON.stringify(manifest))
    })

    context.subscriptions.push(pullWorkflow)

	let updateWorkflow = vscode.commands.registerCommand('direktiv.updateWorkflow', async(uri: vscode.Uri) => {
		let auth = await readManifest(uri)
		if(auth === undefined) {
			return
		}
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, uri)
		await manager.UpdateWorkflow()
	})

	context.subscriptions.push(updateWorkflow)

	let executeWorkflow = vscode.commands.registerCommand("direktiv.executeWorkflow", async(uri: vscode.Uri)=>{
			let auth = await readManifest(uri)
			if (auth === undefined) {
				return
			}

			const manager = new DirektivManager(auth.url, auth.namespace, auth.token, uri)
			let id = await manager.ExecuteWorkflow()

			if(id !== "") {
				// todo handle logging and other details
				const instanceManager = new InstanceManager(auth.url, auth.token, id)
				await instanceManager.createTempFile()
				await instanceManager.openLogs()

                // make sure input gets stored globally before we start getting logs to add input at the front
                await instanceManager.getExtraDataForInstanceString("input")
                let fetchedOutput = false
				let timer = setInterval(async()=>{
					let status = await instanceManager.getInstanceStatus()
					if (status !== "pending"){
						setTimeout(async ()=>{
                            if (!fetchedOutput){                              
    							clearInterval(timer)	
                                setTimeout(async()=>{
                                    await instanceManager.getExtraDataForInstanceString("output")
                                    await instanceManager.writeOutput() 
                                }, 500)
                            }
                            fetchedOutput = true
                        },1000)
					} 
					await instanceManager.getLogsForInstance()
				},2000)
			}
	})

	context.subscriptions.push(executeWorkflow)

	let downloadWorkflows = vscode.commands.registerCommand('direktiv.connect', async (uri: vscode.Uri) => {
		let input = await GetInput()
		if (input === undefined) {
			return
		}
		const manager = new DirektivManager(input.url, input.namespace, input.token, uri)
		await manager.GetWorkflows()
	});

	context.subscriptions.push(downloadWorkflows);

	let deleteWorkflow = vscode.commands.registerCommand("direktiv.deleteWorkflow", async(uri: vscode.Uri)=>{
		let auth = await readManifest(uri)
		if (auth === undefined) {
			return
		}
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, uri)
		await manager.DeleteWorkflow()
	})

	context.subscriptions.push(deleteWorkflow)

	let cancelInstance = vscode.commands.registerCommand("direktiv.cancelInstance", async(inst: Instance)=>{
		const instanceManager = new InstanceManager(inst.values["url"], inst.values["token"], inst.label)
		await instanceManager.cancelInstance()
		instances.refresh()
	})

	context.subscriptions.push(cancelInstance)

	let removeInstancesManager = vscode.commands.registerCommand("direktiv.removeInstanceManager", async(inst: Instance)=>{
		instances.remove(inst.label)
	})

	context.subscriptions.push(removeInstancesManager)

	let rerunInstance = vscode.commands.registerCommand("direktiv.rerunInstance", async(inst: any)=>{
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.label)
		instanceManager.rerunInstance().then(async () => {
			await instanceManager.createTempFile()
			await instanceManager.openLogs()

			// refresh instance list
			instances.refresh()
            // write the input
             // make sure input gets stored globally before we start getting logs to add input at the front
             await instanceManager.getExtraDataForInstanceString("input")
             let fetchedOutput = false
			let timer = setInterval(async()=>{
				let status = await instanceManager.getInstanceStatus()
				if (status !== "pending"){
					setTimeout(()=>{
                        if (!fetchedOutput){                              
                            clearInterval(timer)	
                            setTimeout(async()=>{
                                await instanceManager.getExtraDataForInstanceString("output")
                                await instanceManager.writeOutput() 
                            }, 500)
                        }
                        fetchedOutput = true
					},1000)
				} 
				await instanceManager.getLogsForInstance()
			},2000)
		}).catch((e) => {
			console.log("failed to rerun, ", e)
		})
		
	})

	context.subscriptions.push(rerunInstance)

	let getInputInstance = vscode.commands.registerCommand("direktiv.getInputInstance", async(inst: any)=>{
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.label)
		await instanceManager.createExtraTempFiles()
		await instanceManager.getExtraDataForInstance("input")
		await instanceManager.openInput()
	})

	context.subscriptions.push(getInputInstance)

	let getOutputInstance = vscode.commands.registerCommand("direktiv.getOutputInstance", async(inst: any)=>{
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.label)
		await instanceManager.createExtraTempFiles()
		await instanceManager.getExtraDataForInstance("output")
		await instanceManager.openOutput()
	})

	context.subscriptions.push(getOutputInstance)

}

// this method is called when your extension is deactivated
export function deactivate() {
	fs.rmdirSync(path.join(tempdir, ".direktiv"), { recursive: true });
}
