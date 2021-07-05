import * as vscode from 'vscode';

const util = require('util');
const execp = util.promisify(require('child_process').exec);

export async function getDirektionName(fpath: string, direktionPath: string) {
    const {stdout, stderr} = await execp(`${direktionPath} tokens ${fpath}`)
		if (stderr) {
			vscode.window.showErrorMessage(`${stderr}`)
			return;
		}
		let tokens = stdout.split("\n")
		for (let i=0; i < tokens.length; i++) {
			if(tokens[i].includes("WORKFLOW")){
				if (tokens[i+1]){
					if (tokens[i+1].includes("IDENT")){
						return tokens[i+1].split("IDENT")[1].replace(/\s/g, "")
					}
				}
			}
		}
}