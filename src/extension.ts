// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { DirektivManager } from './direktiv';
import { InstanceManager } from './instance';
import { InstancesProvider, Instance } from './instances';
import { setupKeybinds } from './keybinds';
import { getDirektionName } from './direktion';
import { GetInput, appendSchema, readManifest, readManifestForRevision, writeManifest } from './util';
const https = require('https')

const fs = require("fs")
const path = require("path")
const mkdirp = require("mkdirp")
const yaml = require("yaml")

const util = require('util');
const execp = util.promisify(require('child_process').exec);

const tempdir = require("os").tmpdir()
const { exec } = require("child_process");

const process = require("process")

let binName = ""
let isMac =  process.platform === "darwin"
let isWindows = process.platform === "win32"
let isLinux = process.platform === "linux"

// const dlurl = "https://downloads.vorteil.io/direktion-release/"

if(isWindows) {
	binName = "direktion.exe"
}
if (isMac) {
	binName = "direktion-darwin"
}
if (isLinux){
	binName = "direktion"
}

export const manifestDirektiv = ".direktiv.manifest.json"
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "direktiv" is now active!');
	// let direktionPath = path.join(__filename, '..', '..', 'resources', binName)

	// check if direktionPath exists
	// if (!fs.existsSync(direktionPath)) {
	// 	console.log("direktion binary doesn't exist downloading...")
	// 	https.get(`${dlurl}${binName}`, (resp:any)=>{
	// 		console.log('piping data to stream')
	// 		resp.pipe(fs.createWriteStream(direktionPath))
    //         console.log('chowning')
    //         fs.chmodSync(direktionPath, 0o755)
	// 	})
	// }

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
	// const direktionDiagnostics = vscode.languages.createDiagnosticCollection("direktion")
	// context.subscriptions.push(direktionDiagnostics)

    context = setupKeybinds(context)

	// on save check for errors
	let onSave = vscode.workspace.onDidSaveTextDocument(async (e: vscode.TextDocument) => {
		if (path.extname(e.fileName) === ".direktion"){
			let fpath = e.uri.path
			if (process.platform === "win32") {
				fpath = fpath.substring(1);
			}
			// todo check if its not a direktion file then skip this step
		// 	exec(`${direktionPath} diagnostic ${fpath}`, (error: Error, stdout: string, stderr: string)=>{
		// 		if (error) {
		// 			vscode.window.showErrorMessage(`${error}`)
		// 			return;
		// 		}
		// 		if (stderr) {
		// 			vscode.window.showErrorMessage(`${stderr}`)
		// 			return;
		// 		}
		// 		if (stdout) {
		// 			let arr: Array<vscode.Diagnostic> = []

		// 			let output = JSON.parse(stdout)
		// 			for(let i=0; i < output.length; i++) {
		// 				let range = new vscode.Range(output[i].StartLine-1, output[i].StartColumn, output[i].EndLine-1, output[i].EndColumn)
		// 				let dig = new vscode.Diagnostic(range , output[i].Msg, undefined)
		// 				arr.push(dig)
		// 			}
		// 			direktionDiagnostics.set(e.uri, arr)
		// 		} else {
		// 			exec(`${direktionPath} format ${fpath}`, (error: Error, stdout: string, stderr: string )=>{
		// 				if (error) {
		// 					vscode.window.showErrorMessage(`${error}`)
		// 					return;
		// 				}
		// 				if(stderr) {
		// 					vscode.window.showErrorMessage(`${stderr}`)
		// 				}
						
		// 			})
		// 		}
				
		// 	})
		}
        let split = e.fileName.split(".")
        if(split[1] === "direktiv" && split[2] === "yaml") {
            try {
				let fpath = e.uri.path
				if (process.platform === "win32") {
                    fpath = fpath.substring(1);
                }
                let maniData = fs.readFileSync(fpath, {encoding:'utf8'});
                let ydata = yaml.parse(maniData)
                // if (maniData !== ""){
                    // manifestData exist we should try upload the file
                    let auth = await readManifest(e.uri)
                    if(auth === undefined){
                        return
                    }
                    const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, e.uri)
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

	// let compileToYAML = vscode.commands.registerCommand("direktion.compileToYAML", async(uri: vscode.Uri) => {
	// 	let fpath = uri.path
	// 	if (process.platform === "win32") {
	// 	    fpath = fpath.substring(1);
	// 	}

	// 	let wfname = await getDirektionName(fpath, direktionPath);
    //     // Todo use direktion tokens to find the workflow id and then replace 'basename' currently with what the workflow id would be.
	// 	let newYAMLPath = path.join(path.dirname(uri.path), `${wfname}.direktiv.yaml`)
	// 	if (process.platform === "win32") {
	// 		newYAMLPath = newYAMLPath.substring(1);
	// 	}
	// 	if (fs.existsSync(newYAMLPath)) {
	// 		let result = await vscode.window.showInformationMessage("File already exists would you like to override?", "Yes", "No")
	// 		if (result == "No" || result == undefined) {
	// 			return
	// 		}
	// 	}

	// 	const {stdout, stderr} = await execp(`${direktionPath} compile ${fpath}`)
	// 	if (stderr) {
	// 		vscode.window.showErrorMessage(`${stderr}`)
	// 		return;
	// 	}
	// 	fs.writeFileSync(newYAMLPath, stdout)
	// 	return newYAMLPath
	// })

	// context.subscriptions.push(compileToYAML)

	let openLogs = vscode.commands.registerCommand("direktiv.openLogs", async(instance: Instance)=>{
		const instanceManager = new InstanceManager(instance.values.url, instance.values.token, instance.values.namespace, instance.values.id)
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
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
        await manager.CreateWorkflow()
	})

	context.subscriptions.push(pushWorkflow)

    let createDirectory = vscode.commands.registerCommand("direktiv.createDirectory", async(uri: vscode.Uri) =>{
        let auth = await readManifest(uri)
		if(auth === undefined){
			return
		}
        const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
        let dir = await vscode.window.showInputBox({title: "Enter name of directory to create", ignoreFocusOut: true})
        if(dir === undefined){
            dir = ""
        }
        await manager.CreateDirectory(dir)
    })

    context.subscriptions.push(createDirectory)

    let pullWorkflow = vscode.commands.registerCommand('direktiv.pullWorkflow', async(uri: vscode.Uri) => {
        let auth = await readManifest(uri)
        if(auth === undefined) {
            return
        }

        const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
        // get workflow path from filepath
        const id = uri.path.split(auth.folder)[1].split(".direktiv.yaml")[0]
        const yaml = await manager.GetWFData(id)
		let fpath = uri.path
		if (process.platform === "win32") {
            fpath = fpath.substring(1);
        }
        // write yaml out
        fs.writeFileSync(fpath, yaml)
        vscode.window.showInformationMessage("Successfully pulled workflow")
    })

    context.subscriptions.push(pullWorkflow)

	let updateWorkflow = vscode.commands.registerCommand('direktiv.updateWorkflow', async(uri: vscode.Uri) => {
		let auth = await readManifest(uri)
		if(auth === undefined) {
			return
		}
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
		await manager.UpdateWorkflow()
	})

	context.subscriptions.push(updateWorkflow)

	let executeWorkflow = vscode.commands.registerCommand("direktiv.executeWorkflow", async(uri: vscode.Uri)=>{
			let auth = await readManifest(uri)
			if (auth === undefined) {
				return
			}

			const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
			let id = await manager.ExecuteWorkflow()
			if(id !== "") {
			// 	// todo handle logging and other details
				const instanceManager = new InstanceManager(auth.url, auth.token, auth.namespace, id)
				
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
		// let input = await GetInput()
		// if (input === undefined) {
		// 	return
		// }
        let input = {
            url: "http://192.168.1.40",
            namespace: "test",
            token: "",
            folder: "/home/trentis/test"
        }
		const manager = new DirektivManager(input.url, input.namespace, input.token, input.folder, uri)
		await manager.GetWorkflows("")
	});

	context.subscriptions.push(downloadWorkflows);

	let deleteWorkflow = vscode.commands.registerCommand("direktiv.deleteWorkflow", async(uri: vscode.Uri)=>{
		let auth = await readManifest(uri)
		if (auth === undefined) {
			return
		}
		const manager = new DirektivManager(auth.url, auth.namespace, auth.token, auth.folder, uri)
		await manager.DeleteWorkflow()
	})

	context.subscriptions.push(deleteWorkflow)

	let cancelInstance = vscode.commands.registerCommand("direktiv.cancelInstance", async(inst: Instance)=>{
		const instanceManager = new InstanceManager(inst.values["url"], inst.values["token"], inst.values.namespace, inst.values.id)
		await instanceManager.cancelInstance()
		instances.refresh()
	})

	context.subscriptions.push(cancelInstance)

	let removeInstancesManager = vscode.commands.registerCommand("direktiv.removeInstanceManager", async(inst: Instance)=>{
		instances.remove(inst.label)
	})

	context.subscriptions.push(removeInstancesManager)

	let rerunInstance = vscode.commands.registerCommand("direktiv.rerunInstance", async(inst: any)=>{
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.values.namespace, inst.values.id)
        await instanceManager.getInstanceStatus()
		
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
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.values.namespace, inst.label)
		await instanceManager.createExtraTempFiles()
		await instanceManager.getExtraDataForInstance("input")
		await instanceManager.openInput()
	})

	context.subscriptions.push(getInputInstance)

	let getOutputInstance = vscode.commands.registerCommand("direktiv.getOutputInstance", async(inst: any)=>{
		const instanceManager = new InstanceManager(inst.values.url, inst.values.token, inst.values.namespace, inst.label)
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
