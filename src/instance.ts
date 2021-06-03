import * as vscode from "vscode"

const fetch = require("node-fetch")
const mkdirp = require("mkdirp")
const path = require("path")
const fs = require('fs')
const dayjs = require('dayjs')

const search = '/'  
const replacer = new RegExp(search, 'g')


export class InstanceManager {
    public id 
    public token
    public url

    public timer: any

    public outputChannel

    constructor(url:string, token: string, id: string, outputChannel: vscode.OutputChannel | undefined) {
        this.id = id
        this.token = token
        this.url = url
        this.timer = null
        this.outputChannel = outputChannel
        if(this.outputChannel !== undefined) {
            this.outputChannel.appendLine(`Reading '${this.id}' logs...`)
            this.outputChannel.show()
        }

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

    async cancelInstance() {
        try {
            let resp = await fetch(`${this.url}/api/instances/${this.id}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Cancel Instance", "cancelInstance")
            } else {
                console.log("cancelled instance")
                clearInterval(this.timer)
            }
        } catch(e){
            vscode.window.showErrorMessage(e.message)
        }
    }

    async waitForInstanceCompletion() {
        return await new Promise((resolve, reject) => {
            this.timer = setInterval(() => {
                this.getInstanceDetails(resolve, reject)
            }, 1000);
        });
    }
    
    async getInstanceStatus(): Promise<string> {
        try {
            let resp = await fetch(`${this.url}/api/instances/${this.id}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Get Instance", "getInstance")
            } else {
                let json = await resp.json()
                return json.status
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async getInstanceDetails(resolve: any, reject: any) {
        try {
            let resp = await fetch(`${this.url}/api/instances/${this.id}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Get Instance", "getInstance")
            } else {
                let json = await resp.json()
                if(json.status !== "pending") {
                    clearInterval(this.timer)
                    await this.getLogsForInstance()
                    resolve()
                }
            }
        } catch(e) {
            clearInterval(this.timer)
            reject(e.message)
        }
    }

    async getLogsForInstance() {
        try {
            // TODO may need to handle pagination at some point.
            let resp = await fetch(`${this.url}/api/instances/${this.id}/logs?offset=0&limit=6000`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await this.handleError(resp, "Get Logs", "getLogs")
            } else {
                let json = await resp.json()
                if(this.outputChannel !== undefined) {
                    for(let i=0; i < json.workflowInstanceLogs.length; i++) {
                        let time = dayjs.unix(`${json.workflowInstanceLogs[i].timestamp.seconds}.${json.workflowInstanceLogs[i].timestamp.nanos}`).format("h:mm:ss.SSS")
                        
                        this.outputChannel.appendLine(`[${time}] ${json.workflowInstanceLogs[i].message}`)
                    }
                } else {
                    console.log('hello test')
                    // open the files temp for logs as this is coming from the activity bar 
                    let str = ``
                    for(let i=0; i < json.workflowInstanceLogs.length; i++) {
                        let time = dayjs.unix(`${json.workflowInstanceLogs[i].timestamp.seconds}.${json.workflowInstanceLogs[i].timestamp.nanos}`).format("h:mm:ss.SSS")
                        str += `[${time}] ${json.workflowInstanceLogs[i].message}\n`
                    }

                    let fpath = path.join("/tmp",".direktiv", this.id.replace(replacer, "-"))
                    // write file to directory
                    fs.writeFileSync(fpath, str)

                    // open str in vscode window
                    let td = await vscode.workspace.openTextDocument(fpath)
                    await vscode.window.showTextDocument(td, {preview: false})
                }
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }
}

