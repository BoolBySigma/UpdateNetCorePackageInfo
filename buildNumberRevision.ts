import * as task from 'vsts-task-lib/task';
import * as request from 'request';
import * as rpn from 'request-promise-native';

export class BuildNumberRevision {
    static get = function (): Promise<Number> {
        task.debug('BuildNumberRevision.get');
        var accountUri = task.getVariable('system.teamFoundationCollectionUri');
        var projectId = task.getVariable('System.TeamProjectId');
        var projectUri = accountUri + projectId;
        var buildId = task.getVariable('build.buildId');
        var buildUri = projectUri + '/_apis/build/builds/' + buildId;

        var options = {
            uri: buildUri,
            rejectUnauthorized: false,
            auth: {
                bearer: task.getVariable('system.accessToken')
            },
            json: true,
            qs: {
                'api-version': '2.0'
            }
        }
        task.debug('options: ' + JSON.stringify(options));

        return rpn(options).then(function (build: any) {
            if (!build) {
                throw new Error('Could not get current build details');
            }

            if (!build.buildNumberRevision) {
                throw new Error('\'Build number format\' must contain $(Rev:r) when using variable $(Rev:r)');
            }

            return build.buildNumberRevision;
        });
    }
}