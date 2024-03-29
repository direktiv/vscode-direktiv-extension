import * as vscode from "vscode"
import { handleError } from "./util"

const tempdir = require('os').tmpdir()
const fetch = require("node-fetch")
const path = require("path")
const fs = require('fs')
const dayjs = require('dayjs')
var utc = require('dayjs/plugin/utc')
dayjs.extend(utc)

const search = '/'  
const replacer = new RegExp(search, 'g')

export class InstanceManager {
    public id 
    public token
    public url

    public timer: any
    public fpath: string

    public namespace: string
    public input: string
    public as: string
    public output: string

    constructor(url:string, token: string, namespace: string, id: string) {
        this.id = id
        this.token = token
        this.url = url
        this.namespace = namespace
        this.timer = null

        this.as = ""
        this.input = ""
        this.output = ""

        this.fpath = path.join(tempdir,".direktiv", this.id.replace(replacer, "-"))
    }

    async cancelInstance() {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/instances/${this.id}/cancel`, {
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
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/instances/${this.id}`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await handleError(resp, "Get Instance", "getInstance")
            } else {
                let json = await resp.json()
                this.as = json.instance.as
                return json.instance.status
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
        return ""
    }

    async getInstanceDetails(resolve: any, reject: any) {
        try {
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/instances/${this.id}`, {
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

    // Create temp file for instance logs
    async createTempFile() {   
        fs.writeFileSync(this.fpath, " ")
    }

    // Create temp files for input and output data
    async createExtraTempFiles() {
        fs.writeFileSync(`${this.fpath}-input`, " ")
        fs.writeFileSync(`${this.fpath}-output`, " ")
    }

    async openInput(){
        // open input in vscode window
        let td = await vscode.workspace.openTextDocument(`${this.fpath}-input`)
        await vscode.window.showTextDocument(td, {preview: false})
    }

    async openOutput(){
        // open output in vscode window
        let td = await vscode.workspace.openTextDocument(`${this.fpath}-output`)
        await vscode.window.showTextDocument(td, {preview: false})
    }

    async getExtraDataForInstance(field: string) {
        try {
            if (field == "input") {
                let str = await this.getExtraDataForInstanceString("input")
                // write file to input temp file
                fs.writeFileSync(`${this.fpath}-input`, str)
            } else if (field == "output"){
                let str = await this.getExtraDataForInstanceString("output")
                // write file to output temp file
                fs.writeFileSync(`${this.fpath}-output`, str)
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async getExtraDataForInstanceString(field: string) {
            let urli = `${this.url}/api/namespaces/${this.namespace}/instances/${this.id}/input`    
            if(field === "output") {
                urli =`${this.url}/api/namespaces/${this.namespace}/instances/${this.id}/output`
            }
            let resp = await fetch(urli, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })
            if(!resp.ok) {
                await handleError(resp, "Get Input / Output", "getInstance")
            } else {
                let json = await resp.json()   
                if (field == "input") {
                    this.input = Buffer.from(json.data, 'base64').toString("ascii")
                    return this.input
                } else if (field == "output"){
                    this.output = Buffer.from(json.data, 'base64').toString("ascii")
                    return this.output
                }
            }
    }

    async openLogs(){
        // open str in vscode window
        let td = await vscode.workspace.openTextDocument(this.fpath)
        await vscode.window.showTextDocument(td, {preview: false})
    }

    async writeOutput() {
        let data = fs.readFileSync(this.fpath, {encoding: "utf8"})
        data = `${data}\n------OUTPUT------\n${this.output}`
        fs.writeFileSync(this.fpath, data)
    }

    async getLogsForInstance() {
        try {
            // TODO may need to handle pagination at some point.
            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/instances/${this.id}/logs`, {
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
                for(let i=0; i < json.edges.length; i++) {
                    let time = dayjs.utc(json.edges[i].node.t).local().format("HH:mm:ss.SSS")
                    str += `[${time}] ${json.edges[i].node.msg}\n`
                }
                // write file to directory
                str = `------INPUT-------\n${this.input}\n------LOGS--------\n${str}`
                fs.writeFileSync(this.fpath, str)
            }
        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }

    async rerunInstance() {
        // Split id - {Namesapce}/{Workflow}/{uid}
        // const splitID = this.id.split("/")
        // const ns = splitID[0]
        // const wf = splitID[1]

        try {
            let inputBody = await this.getExtraDataForInstanceString("input")

            let resp = await fetch(`${this.url}/api/namespaces/${this.namespace}/tree//${this.as}?op=execute`,{
                method: "POST",
                body: inputBody,
                headers: {
                    "Authorization": `Bearer ${this.token}`
                }
            })

            if(!resp.ok) {
                await handleError(resp, "Execute Workflow", "invokeWorkflow")
            } else {
                let json = await resp.json()

                // Set new id and new path
                this.id = json.instance
                this.fpath = path.join(tempdir,".direktiv", this.id.replace(replacer, "-"))
                return
            }

        } catch(e) {
            vscode.window.showErrorMessage(e.message)
        }
    }
}

