import * as vscode from "vscode";
import * as os from "node:os";
import * as path from "node:path";
import { FsWrapper, FsNull } from "./fs-wrapper";

export const defaultConfig = { MD013: false };

export async function getConfig(fs: FsWrapper | FsNull, configuration: vscode.WorkspaceConfiguration, uri: vscode.Uri) {
  // Simplified: merge workspace config with defaults; full "extends" handling omitted here
  const userWorkspaceConfig = configuration.get<any>("config");
  return {
    ...defaultConfig,
    ...(userWorkspaceConfig || {})
  };
}

export function getConfigFileArguments(configuration: vscode.WorkspaceConfiguration) {
  const configFile = configuration.get<string>("configFile");
  return (configFile && configFile.length > 0) ? ["--config", configFile] : [];
}

export function getCustomRules(configuration: vscode.WorkspaceConfiguration) {
  const customRulesPaths = configuration.get<string[]>("customRules") || [];
  return customRulesPaths.map((p) => p);
}

export async function getOptionsDefault(fs: FsWrapper | FsNull, workspaceConfiguration: vscode.WorkspaceConfiguration, config?: any) {
  return {
    config: config || await getConfig(fs, workspaceConfiguration, vscode.Uri.parse("file:/")),
    customRules: getCustomRules(workspaceConfiguration)
  };
}

export function getOptionsOverride() {
  return { fix: false };
}

export function getNoImport(scheme: string) {
  const isTrusted = vscode.workspace.isTrusted;
  const isSchemeFile = scheme === "file";
  const isDesktop = Boolean(os && os.platform && os.platform());
  return !isTrusted || !isSchemeFile || !isDesktop;
}
