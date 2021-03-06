import { join, normalize } from '@angular-devkit/core';
import {
  chain,
  Rule,
  SchematicContext,
  Tree,
} from '@angular-devkit/schematics';
import { NodePackageInstallTask } from '@angular-devkit/schematics/tasks';
import {
  createRootESLintConfigFile,
  sortObjectByKeys,
  updateJsonInTree,
} from '../utils';

export default function (options: { name: string }): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      // Remove TSLint related dependencies
      updateJsonInTree(
        join(normalize(options.name || '/'), 'package.json'),
        (json) => {
          for (const devDep of Object.keys(json.devDependencies)) {
            if (devDep === 'codelyzer' || devDep === 'tslint') {
              delete json.devDependencies[devDep];
            }
          }
          json.devDependencies = sortObjectByKeys(json.devDependencies);
          return json;
        },
      ),
      // Create the root ESLint config file for the workspace
      createRootESLintConfigFile(options.name),
      // Delete the root tslint.json and schedule an install so that the TSLint dependencies are fully removed
      (tree) => {
        tree.delete(join(normalize(options.name || '/'), 'tslint.json'));
        context.addTask(new NodePackageInstallTask());
      },
      /**
       * Update the default schematics collection to @angular-eslint so that future projects within
       * the same workspace will also use ESLint
       */
      updateJsonInTree(
        join(normalize(options.name || '/'), 'angular.json'),
        (json) => {
          json.cli = json.cli || {};
          json.cli.defaultCollection = '@angular-eslint/schematics';
          return json;
        },
      ),
    ])(host, context);
  };
}
