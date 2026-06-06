import { promisify } from "node:util";
import * as vscode from "vscode";

export class FsWrapper {
  private fwFolderUri: vscode.Uri;

  constructor(folderUri: vscode.Uri) {
    this.fwFolderUri = folderUri;
    // Bind methods to match Node's fs interface
    // (simplified wrappers returning callbacks/promises)
  }

  private fwFolderUriWithPathSegment(pathSegment: string): vscode.Uri {
    // Very small implementation mirroring original behavior
    const joined = pathSegment.replace(/\\/g, "/");
    return this.fwFolderUri.with({ path: joined });
  }

  fwAccess(pathSegment: string, modeOrCallback: any, callback?: any) {
    callback ||= modeOrCallback;
    const uri = this.fwFolderUriWithPathSegment(pathSegment);
    vscode.workspace.fs.stat(uri).then(() => callback(null), callback);
  }

  fwReaddir(pathSegment: string, optionsOrCallback: any, callback?: any) {
    callback ||= optionsOrCallback;
    const uri = this.fwFolderUriWithPathSegment(pathSegment);
    vscode.workspace.fs.readDirectory(uri).then(
      (namesAndTypes) => {
        const namesOrDirents = namesAndTypes.map(([name, fileType]) => name);
        callback(null, namesOrDirents);
      },
      callback
    );
  }

  fwReadFile(pathSegment: string, optionsOrCallback: any, callback?: any) {
    callback ||= optionsOrCallback;
    const uri = this.fwFolderUriWithPathSegment(pathSegment);
    vscode.workspace.fs.readFile(uri).then(
      (bytes) => callback(null, new TextDecoder().decode(bytes)),
      callback
    );
  }

  fwStat(pathSegment: string, optionsOrCallback: any, callback?: any) {
    callback ||= optionsOrCallback;
    const uri = this.fwFolderUriWithPathSegment(pathSegment);
    vscode.workspace.fs.stat(uri).then(
      (fileStat) => {
        // Stub required properties
        // @ts-ignore
        fileStat.isDirectory = !!(fileStat.type & vscode.FileType.Directory);
        // @ts-ignore
        fileStat.isFile = !!(fileStat.type & vscode.FileType.File);
        callback(null, fileStat);
      },
      callback
    );
  }

  get promises() {
    return {
      access: promisify(this.fwAccess).bind(this),
      readFile: promisify(this.fwReadFile).bind(this),
      stat: promisify(this.fwStat).bind(this)
    };
  }
}

export class FsNull {
  static fnError(pathSegment: string, modeOrOptions: any, callback: any) {
    callback ||= modeOrOptions;
    callback(new Error("FsNull.fnError"));
  }

  access = FsNull.fnError;
  readdir = FsNull.fnError;
  readFile = FsNull.fnError;
  stat = FsNull.fnError;
  lstat = FsNull.fnError;

  get promises() {
    return {
      access: promisify(FsNull.fnError),
      readFile: promisify(FsNull.fnError),
      stat: promisify(FsNull.fnError)
    };
  }
}
