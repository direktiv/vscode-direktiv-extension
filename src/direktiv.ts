import * as vscode from "vscode"

const fetch = require("node-fetch")
const path = require("path")
const fs = require("fs")
const yaml = require("yaml")
const homedir = require('os').homedir();


export class DirektivManager {
    public url
    public namespace
    public token

    public connection : string

    // key calue of workflow id to revision of remote
    public workflowRevisions: Map<string, string>

    // key value of workflow id to yaml
    public workflowdata : Map<string, string>

    constructor(url: string, namespace: string, token: string, uri: vscode.Uri) {
        this.url = url
        this.namespace = namespace
        this.token = token   
        this.workflowdata = new Map()
        this.workflowRevisions = new Map()
        this.connection = uri.path.toString()
    }

    async handleError(resp: any, summary: string, perm: string) {
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

    async DeleteWorkflow() {
        var x = path.basename(this.connection);
        let f = x.substr(0, x.lastIndexOf('.'));
        f = f.substr(0, f.lastIndexOf('.'))

        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${f}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if (!resp.ok) {
                await this.handleError(resp, "Delete Workflow", "deleteWorkflow")
            } else {
                // delete file locally :)
                fs.unlinkSync(this.connection)
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async CreateWorkflow() {
        let data = fs.readFileSync(this.connection, {encoding:'utf8'});
        let dataParse = yaml.parse(data)
        let f = this.connection.substr(0, this.connection.lastIndexOf('.'));
        f = f.substr(0, f.lastIndexOf('.'))

        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "text/yaml"
                },
                body: data
            })
            if (!resp.ok) {
                await this.handleError(resp, "Create Workflow", "createWorkflow")
            } else {
                // successfully uploaded change local manifest to have that revision
                let direktivManifest = fs.readFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), {encoding:'utf8'});
                let direktivJSON = JSON.parse(direktivManifest)
                direktivJSON[dataParse.id] = 0

                // rename file as id doesn't match filename
                if(dataParse.id !== f) {
                    // id has been changed lets rename the file
                    fs.renameSync(this.connection, path.join(path.dirname(this.connection), `${dataParse.id}.direktiv.yaml`))
                    fs.writeFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), JSON.stringify(direktivJSON))
                    await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
                    let doc = await vscode.workspace.openTextDocument(`${path.join(path.dirname(this.connection), `${dataParse.id}.direktiv.yaml`)}`)
                    await vscode.window.showTextDocument(doc)
                }

                fs.writeFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), JSON.stringify(direktivJSON))
            } 
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }


    }

    async ExecuteWorkflow(): Promise<string> {
        var x = path.basename(this.connection);
        let f = x.substr(0, x.lastIndexOf('.'));
        f = f.substr(0, f.lastIndexOf('.'))

        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${f}/execute`,{
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Execute Workflow", "invokeWorkflow")
            } else {
                let json = await resp.json()
                return json.instanceId
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async pushWorkflow(f: string, direktiv: any) {
        let data = fs.readFileSync(this.connection, {encoding:'utf8'});
        let dataParse = yaml.parse(data)

        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${f}`, {
                method: "PUT",
                body: data,
                headers: {
                    "Content-Type": "text/yaml",
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, 'Update Workflow', "updateWorkflow")
            } else {
                // Update revision locally as update was successful
                direktiv[f] = direktiv[f] + 1
                fs.writeFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), JSON.stringify(direktiv))
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }

        if(dataParse.id !== f) {
            // id has been changed lets rename the file
            fs.renameSync(this.connection, path.join(path.dirname(this.connection), `${dataParse.id}.direktiv.yaml`))

            // need to change the revision stored in the map aswell
            direktiv[dataParse.id] = direktiv[f] 
            delete direktiv[f]

            fs.writeFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), JSON.stringify(direktiv))

            await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
            let doc = await vscode.workspace.openTextDocument(`${path.join(path.dirname(this.connection), `${dataParse.id}.direktiv.yaml`)}`)
            await vscode.window.showTextDocument(doc)
        }
    }

    async UpdateWorkflow() {
        var x = path.basename(this.connection);
        let f = x.substr(0, x.lastIndexOf('.'));
        f = f.substr(0, f.lastIndexOf('.'))

        // read the .direktiv file to get revision
        let direktiv = fs.readFileSync(path.join(path.dirname(this.connection), ".direktiv.manifest.json"), {encoding: "utf8"})
        let direktivJSON = JSON.parse(direktiv)
        let revision = await this.GetWorkflowRevision(f)
        
        // check the revision id of the remote
        if(direktivJSON[f] < revision) {
            let x = await vscode.window.showInformationMessage("Remote revision is greater than the local YAML file. Do you want to still update?", "Yes", "No")
            if(x === "Yes") {
                // set revision to current remote one to update successfully.
                direktivJSON[f] = revision
                await this.pushWorkflow(f, direktivJSON)
            }    
        } else {
            await this.pushWorkflow(f, direktivJSON)
        }
    }

    async GetWorkflows() {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, 'Fetch Workflows', "getWorkflows")
            } else {
                let json = await resp.json()

                for (const workflow of json.workflows) {
                    let wfdata = await this.GetWorkflowData(workflow.id)
                    this.workflowdata.set(workflow.id, wfdata)
                }
                
                await this.ExportNamespace()
            }
        } catch(e) {
            // TODO show error message
            vscode.window.showErrorMessage(e.message)
        }
        return []
    }

    async GetWorkflowRevision(wf: string): Promise<string>{
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${wf}`, {
                method:"GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Fetch Workflow", "getWorkflow")
            } else {
                let json = await resp.json()
                return json.revision
            }
        } catch(e){
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async GetWorkflowData(wf: string): Promise<string> {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${wf}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, 'Fetch Workflows', "getWorkflows")
            } else {
                let json = await resp.json()
                this.workflowRevisions.set(wf, json.revision)
                return Buffer.from(json.workflow, 'base64').toString("ascii")
            }
        }catch(e) {
            // TODO show error message
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async ExportNamespace() {
        let nsContainer = path.join(this.connection,  ".direktiv.manifest.json")
        if (!fs.existsSync(nsContainer)) {
            this.CreateFiles()
        } else {
            let x = await vscode.window.showInformationMessage(`${nsContainer} already exists you may have already exported to this directory would you like to overwrite`, "Yes", "No")
            if (x === "Yes") {
                this.CreateFiles()
            }
        }
    }

    async CreateFiles() {
        // make home directory to store tokens
        if(fs.existsSync(path.join(homedir, ".direktiv"))){
            // read .direktiv file replace the url key 
            let data = fs.readFileSync(path.join(homedir, ".direktiv"), {encoding:'utf8'});
            let json = JSON.parse(data)
            json[this.url] = this.token
            fs.writeFileSync(path.join(homedir, ".direktiv"), JSON.stringify(json))
        } else {
            fs.writeFileSync(path.join(homedir, ".direktiv"), `{
"${this.url}": "${this.token}"
}`)
        }


        this.workflowdata.forEach((v: string, k:string)=>{
            fs.writeFileSync(path.join(this.connection, `${k}.direktiv.yaml`), v)
        })

        let revisions = ``

        this.workflowRevisions.forEach((v: string, k:string)=>{
            revisions += `"${k}": ${v},\n\t`
        })

        // trim the last ,\n from revisions for valid json
        revisions = revisions.substr(0, revisions.lastIndexOf(',\n\t'));

        // create a manifest file
        fs.writeFileSync(path.join(this.connection, `.direktiv.manifest.json`), `{
    "url": "${this.url}",
    "namespace": "${this.namespace}",
    ${revisions}
}`)
    }
}