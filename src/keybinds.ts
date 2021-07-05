import * as vscode from 'vscode'

export function setupKeybinds(context: vscode.ExtensionContext) {

    // convertDirektion to a YAML File
    let convertDirektiv = vscode.commands.registerCommand('direktiv.convertToYAML', async ()=>{
        if(vscode.window.activeTextEditor) {
            await vscode.commands.executeCommand('direktion.compileToYAML', vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
        }
    })
    context.subscriptions.push(convertDirektiv)

    // convertDirektion to a YAML File and then upload the file
    let convertAndUploadDirektiv = vscode.commands.registerCommand('direktiv.convertAndUpload', async ()=> {
        if(vscode.window.activeTextEditor) {
            const fpath = await vscode.commands.executeCommand('direktion.compileToYAML', vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
            await vscode.commands.executeCommand('direktiv.updateWorkflow',vscode.Uri.file(<string>fpath))
        }
    })
    context.subscriptions.push(convertAndUploadDirektiv)

    // convertDirektion to a YAML file, upload the file and execute the yaml file
    let convertUploadAndExecute = vscode.commands.registerCommand('direktiv.convertUploadAndExecute', async ()=> {
        if(vscode.window.activeTextEditor) {
            const fpath = await vscode.commands.executeCommand('direktion.compileToYAML', vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
            await vscode.commands.executeCommand('direktiv.updateWorkflow', vscode.Uri.file(<string>fpath))
            await vscode.commands.executeCommand('direktiv.executeWorkflow', vscode.Uri.file(<string>fpath))
        }
    })
    context.subscriptions.push(convertUploadAndExecute)

    // Execute a yaml file
    let execDirektiv = vscode.commands.registerCommand('direktiv.exec', async ()=>{
		if(vscode.window.activeTextEditor){
			await vscode.commands.executeCommand("direktiv.executeWorkflow", vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
		}
	})
    context.subscriptions.push(execDirektiv)

    // Save and update workflow remotely
	let saveAndUpdate = vscode.commands.registerCommand('direktiv.saveAndUpdate', async()=>{
		if(vscode.window.activeTextEditor){
			await vscode.window.activeTextEditor.document.save()
			await vscode.commands.executeCommand("direktiv.updateWorkflow", vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
		}
	})
	context.subscriptions.push(saveAndUpdate)

    // Save, Update and execute workflow remotely
    let saveAndUpdateAndExecute = vscode.commands.registerCommand('direktiv.saveUpdateAndExecute', async() => {
		if(vscode.window.activeTextEditor){
			await vscode.window.activeTextEditor.document.save()
			await vscode.commands.executeCommand("direktiv.updateWorkflow", vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
			await vscode.commands.executeCommand("direktiv.executeWorkflow", vscode.Uri.file(vscode.window.activeTextEditor.document.fileName))
		}
	})
	context.subscriptions.push(saveAndUpdateAndExecute)

    return context
}