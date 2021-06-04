import * as vscode from "vscode"
import { handleError } from "./util"

const fetch = require("node-fetch")
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
    public fpath: string

    constructor(url:string, token: string, id: string) {
        this.id = id
        this.token = token
        this.url = url
        this.timer = null

        this.fpath = ""
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
                await handleError(resp, "Cancel Instance", "cancelInstance")
            } else {
                clearInterval(this.timer)
            }
        } catch(e){
            vscode.window.showErrorMessage(e.message)
        }
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
                await handleError(resp, "Get Instance", "getInstance")
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
                await handleError(resp, "Get Instance", "getInstance")
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
    async createTempFile() {
        let fpath = path.join("/tmp",".direktiv", this.id.replace(replacer, "-"))
        this.fpath = fpath
      
        fs.writeFileSync(this.fpath, " ")
    }

    async openLogs(){
        // open str in vscode window
        let td = await vscode.workspace.openTextDocument(this.fpath)
        await vscode.window.showTextDocument(td, {preview: false})
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
                await handleError(resp, "Get Logs", "getLogs")
            } else {
                let json = await resp.json()
                // open the files temp for logs as this is coming from the activity bar 
                let str = ``
                for(let i=0; i < json.workflowInstanceLogs.length; i++) {
                    let time = dayjs.unix(`${json.workflowInstanceLogs[i].timestamp.seconds}.${json.workflowInstanceLogs[i].timestamp.nanos}`).format("h:mm:ss.SSS")
                    str += `[${time}] ${json.workflowInstanceLogs[i].message}\n`
                }
                // write file to directory
                fs.writeFileSync(this.fpath, str)

            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }
}

