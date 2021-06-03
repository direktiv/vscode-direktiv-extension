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
        console.log("yyyy")
        console.log(this.url)
        console.log(this.token)
        console.log(this.id)
        try {
            // TODO may need to handle pagination at some point.
            let resp = await fetch(`${this.url}/api/instances/${this.id}/logs?offset=0&limit=6000`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
        console.log("yyyyfffff")

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

                    // Todo clean up files i made in the deactivate vscode
                    // make all directories
                    let dirpath = path.join("/tmp", ".direktiv")

                    mkdirp.sync(dirpath)
                    

                    // write file to directory
                    fs.writeFileSync(path.join(dirpath, this.id.replace(replacer, "-")), str)

                    // open str in vscode window
                    let td = await vscode.workspace.openTextDocument(path.join(dirpath, this.id.replace(replacer, "-")))
                    await vscode.window.showTextDocument(td, {preview: false})
                    
                }
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }
}

