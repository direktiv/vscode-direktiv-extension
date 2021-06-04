import * as vscode from 'vscode';
import { handleError } from './util';
const fetch = require("node-fetch")
const path = require("path")

export class InstancesProvider implements vscode.TreeDataProvider<Instance> {

// manages each connection
public manager: Map<string, any>

  constructor() {
    this.manager = new Map()   
  }
  
  private _onDidChangeTreeData: vscode.EventEmitter<Instance | undefined | null | void> = new vscode.EventEmitter<Instance | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<Instance | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }


  add(url: string, token: string, namespace: string) {
    this.manager.set(`${url}/${namespace}`, {namespace: namespace, token: token})
    this.refresh()
  }

  getTreeItem(element: Instance): vscode.TreeItem {
    return element;
  }

  getChildren(element?: Instance): Thenable<Instance[]> {
    if(element) {
        let url = element.label.substr(0, element.label.lastIndexOf(`/${element.values.namespace}`))
        return Promise.resolve(this.getInstancesForNamespace(url, element.values.token, element.values.namespace))
    } else {
        let arr: Array<Instance> = []
        if (this.manager.size > 0){
            this.manager.forEach((v, k)=>{
                // Root Element
                arr.push(new Instance(`${k}`, v, vscode.TreeItemCollapsibleState.Collapsed, true))
            })
        }  
        return Promise.resolve(arr)
    }
  }

  private async getInstancesForNamespace(url: string, token: string, namespace: string): Promise<Instance[]> {
    try {
        // TODO replace pagination with full fetch
        let resp = await fetch(`${url}/api/instances/${namespace}?offset=0&limit=1000`,{
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        })
        if(!resp.ok) {
            await handleError(resp, "List Instances", "listInstances")
        } else {
            let json = await resp.json()
            let arr = []
            if(json.workflowInstances) {
                for(let i=0; i < json.workflowInstances.length; i++) {
                    arr.push(new Instance(json.workflowInstances[i].id, {url: url, token: token, namespace: namespace, status: json.workflowInstances[i].status}, vscode.TreeItemCollapsibleState.None))
                }
            }
            return arr
        }
    } catch(e) {
        vscode.window.showErrorMessage(e.message)
    }
    return []
  }

}

export class Instance extends vscode.TreeItem {

  constructor(
    public readonly label: string,
    public readonly values: any,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isRoot: boolean = false,
  ) {
    super(label, collapsibleState);
        this.tooltip = `${this.label}`;
        this.contextValue = !isRoot ? "instance" : undefined;

        // Initial Icon Selection
        if (values.status && !isRoot) {
          this.iconPath = {
            light: path.join(__filename, '..', '..', 'resources', `status-${values.status}.svg`),
            dark: path.join(__filename, '..', '..', 'resources', `status-${values.status}.svg`)
          }
        } else if (!isRoot) {
          this.iconPath = {
            light: path.join(__filename, '..', '..', 'resources', 'status-unknown.svg'),
            dark: path.join(__filename, '..', '..', 'resources', 'status-unknown.svg')
          }
        }

        // command to open the text editor
        this.command = !isRoot ? {
          "command": "direktiv.openLogs",
          "title": "Open Logs",
          "tooltip": "Open Logs",
          "arguments": [this]
        }: undefined
  }
}
