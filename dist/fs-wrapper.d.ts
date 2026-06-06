import * as vscode from "vscode";
export declare class FsWrapper {
    private fwFolderUri;
    constructor(folderUri: vscode.Uri);
    private fwFolderUriWithPathSegment;
    fwAccess(pathSegment: string, modeOrCallback: any, callback?: any): void;
    fwReaddir(pathSegment: string, optionsOrCallback: any, callback?: any): void;
    fwReadFile(pathSegment: string, optionsOrCallback: any, callback?: any): void;
    fwStat(pathSegment: string, optionsOrCallback: any, callback?: any): void;
    get promises(): {
        access: any;
        readFile: any;
        stat: any;
    };
}
export declare class FsNull {
    static fnError(pathSegment: string, modeOrOptions: any, callback: any): void;
    access: typeof FsNull.fnError;
    readdir: typeof FsNull.fnError;
    readFile: typeof FsNull.fnError;
    stat: typeof FsNull.fnError;
    lstat: typeof FsNull.fnError;
    get promises(): {
        access: any;
        readFile: any;
        stat: any;
    };
}
