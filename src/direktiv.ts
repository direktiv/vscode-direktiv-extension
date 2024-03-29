import * as vscode from "vscode"
import {getWorkspaceFolder, handleError} from "./util"

const fetch = require("node-fetch")
const path = require("path")
const fs = require("fs")
const yaml = require("yaml")
const process = require("process")
const homedir = require('os').homedir();

export class DirektivManager {
    public url
    public namespace
    public token
    public folder

    public connection : string

    // key value of workflow id to revision of remote
    public workflowRevisions: Map<string, string>

    // key value of workflow id to yaml
    public workflowdata : Map<string, string>

    constructor(url: string, namespace: string, token: string, folder: string, uri: vscode.Uri) {
        this.url = url
        this.namespace = namespace
        this.token = token   
        this.folder = folder
        this.workflowdata = new Map()
        this.workflowRevisions = new Map()

        let fpath = uri.path.toString()
        if (process.platform === "win32") {
            fpath = fpath.substring(1);
        }
        this.connection = fpath
    }

    getID() {
        var x = path.basename(this.connection);
        let f = x.substr(0, x.lastIndexOf('.'));
        f = f.substr(0, f.lastIndexOf('.'))
        return f
    }

    async doesWorkflowExist(id: string) {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${id}`,{
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(resp.ok){
                if(resp.status == 404) {
                    return false
                } else {
                    return true
                }
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async DeleteWorkflow() {

        let f = this.connection.split(this.folder)[1].split(".direktiv.yaml")[0]

        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${f}?op=delete-node`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if (!resp.ok) {
                await handleError(resp, "Delete Workflow", "deleteWorkflow")
            } else {
                // delete file locally :)
                fs.unlinkSync(this.connection)
                vscode.window.showInformationMessage(`Successfully deleted ${f} locally and remotely.`)
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }
    

    async CreateDirectory(dir: string) {
        try {
            let fpath = path.join(this.connection, dir)
            let rpath = path.join(this.connection.split(this.folder)[1], dir)
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${rpath}?op=create-directory`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                },
            })
            if (!resp.ok) {
                await handleError(resp, "Create Directory", "createDirectory")
            } else {
                let json = await resp.json()
                // successfully uploaded change local manifest to have that revision
                // let manifestPath = path.join(path.dirname(this.connection), ".direktiv.manifest.json")
                // // if (process.platform === "win32") {
                // //     manifestPath = manifestPath.substring(1);
                // // }
                // let direktivManifest = fs.readFileSync(manifestPath, {encoding:'utf8'});
                // let direktivJSON = JSON.parse(direktivManifest)
                // direktivJSON[dataParse.id] = 0

                // await this.checkFileNeedsChanged(dataParse, f, direktivJSON)

                // fs.writeFileSync(manifestPath, JSON.stringify(direktivJSON))
                if (!fs.existsSync(`${fpath}`)){
                    fs.mkdirSync(`${fpath}`)
                }

                vscode.window.showInformationMessage("Successfully created new Directory locally and remotely.")
            } 
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    
    async CreateWorkflow() {
        try {
            let data = fs.readFileSync(this.connection, {encoding:'utf8'});
            let dataParse = yaml.parse(data)
            let fpath = this.connection.split(this.folder)[1].split(".direktiv.yaml")[0]

            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${fpath}?op=create-workflow`, {
                method: "PUT",
                headers: {
                    "Authorization": `Bearer ${this.token}`,
                    "Content-Type": "text/yaml"
                },
                body: data
            })
            if (!resp.ok) {
                if(resp.status === 409) {
                    // ignore error as its already there
                    return
                } else {
                    await handleError(resp, "Create Workflow", "createWorkflow")
                }
            } else {
                let json = await resp.json()
                // successfully uploaded change local manifest to have that revision
                // let manifestPath = path.join(path.dirname(this.connection), ".direktiv.manifest.json")
                // // if (process.platform === "win32") {
                // //     manifestPath = manifestPath.substring(1);
                // // }
                // let direktivManifest = fs.readFileSync(manifestPath, {encoding:'utf8'});
                // let direktivJSON = JSON.parse(direktivManifest)
                // direktivJSON[dataParse.id] = 0

                // await this.checkFileNeedsChanged(dataParse, f, direktivJSON)

                // fs.writeFileSync(manifestPath, JSON.stringify(direktivJSON))

                vscode.window.showInformationMessage("Successfully created new Workflow remotely.")
            } 
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async ExecuteWorkflow(): Promise<string> {
        let f =  this.connection.split(this.folder)[1].split(".direktiv.yaml")[0]
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${f}?op=execute`,{
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await handleError(resp, "Execute Workflow", "invokeWorkflow")
            } else {
                let json = await resp.json()
                return json.instance
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async pushWorkflow(f: string, direktiv: any) {


        try {
            let fpath = this.connection.split(this.folder)[1].split(".direktiv.yaml")[0]
            let data = fs.readFileSync(this.connection, {encoding:'utf8'});
            let dataParse = yaml.parse(data)    
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${fpath}?op=update-workflow`, {
                method: "POST",
                body: data,
                headers: {
                    "Content-Type": "text/yaml",
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                if (resp.status === 404) {
                    // create the workflow instead
                    await this.CreateWorkflow()
                } else {
                    await handleError(resp, 'Update Workflow', "updateWorkflow")
                }
            } else {
                // Update revision locally as update was successful
                // direktiv[f] = direktiv[f] + 1
                // let manifestPath = path.join(path.dirname(this.connection), ".direktiv.manifest.json")
                // if (process.platform === "win32") {
                //     manifestPath = manifestPath.substring(1);
                // }
                // fs.writeFileSync(manifestPath, JSON.stringify(direktiv))
                vscode.window.showInformationMessage(`Successfully updated ${f} remotely.`)
            }
        // await this.checkFileNeedsChanged(dataParse, f, direktiv)

        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async checkFileNeedsChanged(dataParse: any, f: string, direktiv: any) {
        if(dataParse.id !== f) {
            // id has been changed lets rename the file
            let newpath =  path.join(path.dirname(this.connection), `${dataParse.id}.direktiv.yaml`)
            // if (process.platform === "win32") {
            //     newpath = newpath.substring(1);
            // }
            fs.renameSync(this.connection, newpath)

            // need to change the revision stored in the map aswell
            direktiv[dataParse.id] = direktiv[f] 
            delete direktiv[f]

            let manifestPath = path.join(path.dirname(this.connection), ".direktiv.manifest.json")
            // if (process.platform === "win32") {
            //     manifestPath = manifestPath.substring(1);
            // }
            fs.writeFileSync(manifestPath, JSON.stringify(direktiv))

            await vscode.commands.executeCommand("workbench.action.closeActiveEditor")
            let doc = await vscode.workspace.openTextDocument(`${newpath}`)
            await vscode.window.showTextDocument(doc)
        }
    }

    async UpdateWorkflow() {
        let f = this.getID()
        let wspacefolder = await getWorkspaceFolder()
        let manifestPath = path.join(wspacefolder, ".direktiv.manifest.json")
        // if (process.platform === "win32") {
        //     manifestPath = manifestPath.substring(1);
        // }
        let direktiv = fs.readFileSync(manifestPath, {encoding: "utf8"})
        let direktivJSON = JSON.parse(direktiv)
        
        await this.pushWorkflow(f, direktivJSON)
    }

    async GetWorkflows(path: string) {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${path}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await handleError(resp, 'Fetch Tree', "getWorkflows")
            } else {
                let json = await resp.json()
                // loop through directories
                for (let i=0; i < json.children.edges.length; i++) {
                    if(json.children.edges[i].node.type === "workflow"){
                        // write the file 
                        let wfdata = await this.GetWFData(json.children.edges[i].node.path)
                        this.workflowdata.set(json.children.edges[i].node.path, wfdata)
                    } else {
                        // create a directory at the path
                        if (!fs.existsSync(`${this.connection}/${json.children.edges[i].node.path}`)){
                            fs.mkdirSync(`${this.connection}/${json.children.edges[i].node.path}`)
                        }
                        // refetch details about that directory to see if workflows exist here
                        await this.GetWorkflows(`${json.children.edges[i].node.path}`)
                    }
                }
                await this.ExportNamespace()
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        // try {
        //     let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/`, {
        //         method: "GET",
        //         headers: {
        //             "Authorization": `Bearer ${this.token}`
        //         }
        //     })
        //     if(!resp.ok) {
        //         await handleError(resp, 'Fetch Workflows', "getWorkflows")
        //     } else {
        //         let json = await resp.json()

        //         if (json.workflows) {
        //             for (const workflow of json.workflows) {
        //                 let wfdata = await this.GetWorkflowData(workflow.id)
        //                 this.workflowdata.set(workflow.id, wfdata)
        //             }
        //         }

        //         await this.ExportNamespace()
        //     }
        // } catch(e) {
        //     vscode.window.showErrorMessage(e.message)
        // }
        // return []
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
                if (resp.status == 404) {
                    // ignore this error as we will be creating the workflow.
                } else {
                    await handleError(resp, "Fetch Workflow", "getWorkflow")
                }
            } else {
                let json = await resp.json()
                return json.revision
            }
        } catch(e){
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async GetWFData(wfpath: string) : Promise<string> {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree/${wfpath}`, {
                method :"GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if (!resp.ok) {
                await handleError(resp, 'Fetch Workflows', "getWorkflows")
            } else {
                let json = await resp.json()
                this.workflowRevisions.set(wfpath, json.revision.hash)
                return Buffer.from(json.revision.source, 'base64').toString("ascii")
            }
        }catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    // async GetWorkflowData(wf: string): Promise<string> {
    //     try {
    //         let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/workflows/${wf}`, {
    //             method: "GET",
    //             headers: {
    //                 "Authorization": `Bearer ${this.token}`
    //             }
    //         })
    //         if(!resp.ok) {
    //             await handleError(resp, 'Fetch Workflows', "getWorkflows")
    //         } else {
    //             let json = await resp.json()
    //             this.workflowRevisions.set(wf, json.revision)
    //             return Buffer.from(json.workflow, 'base64').toString("ascii")
    //         }
    //     }catch(e) {
    //         vscode.window.showErrorMessage(e.message)
    //     }
    //     return ""
    // }

    async ExportNamespace() {
        let nsContainer = path.join(this.connection,  ".direktiv.manifest.json")
        // if (process.platform === "win32") {
        //     nsContainer = nsContainer.substring(1);
        // }
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
            revisions += `"${k}": "${v}",\n\t`
        })

        // trim the last ,\n from revisions for valid json
        revisions = revisions.substr(0, revisions.lastIndexOf(',\n\t'));

        if (revisions !== "") {
            revisions = ",\n\t" + revisions
        } 

        // create a manifest file
        fs.writeFileSync(path.join(this.connection, `.direktiv.manifest.json`), `{
    "url": "${this.url}",
    "namespace": "${this.namespace}",
    "folder": "${this.connection}"
    ${revisions}
}`)
    }
}