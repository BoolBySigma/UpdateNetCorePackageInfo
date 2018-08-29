import * as task from 'vsts-task-lib/task';
import * as xmlMapping from 'xml-mapping';
import * as fs from 'fs';

export interface IProjectFile {
    Project: IProject;
}

export interface IProject {
    PropertyGroup: IPropertyGroup;
}

export interface IPropertyGroup {
    PackageRequireLicenseAcceptance?: IAttribute;
    GeneratePackageOnBuild?: IAttribute;
    PackageId?: IAttribute;
    Authors?: IAttribute;
    Company?: IAttribute;
    Product?: IAttribute;
    Description?: IAttribute;
    Copyright?: IAttribute;
    PackageLicenseUrl?: IAttribute;
    PackageProjectUrl?: IAttribute;
    PackageIconUrl?: IAttribute;
    RepositoryUrl?: IAttribute;
    RepositoryType?: IAttribute;
    PackageTags?: IAttribute;
    PackageReleaseNotes?: IAttribute;
    NeutralLanguage?: IAttribute;
    Version?: IAttribute;
    AssemblyVersion?: IAttribute;
    FileVersion?: IAttribute;
}

export interface IAttribute extends Object {
    $text: string;
}

export class ProjectFile {
    private static debugFile = function (data: string) {
        task.debug('ProjectFile.debugFile');
        task.debug('file begin');

        var lines = data.split(/\n/);
        for (let line of lines) {
            task.debug(line);
        }

        task.debug('file end');
    }

    static createAttribute = function(): IAttribute{
        return { $text: null }
    }

    static read = function (filePath: string): IProjectFile {
        task.debug('ProjectFile.read');
        task.debug('filePath: ' + filePath);

        if (!fs.existsSync(filePath)) {
            throw new Error('File \'' + filePath + '\' does not exist')
        }

        var data = fs.readFileSync(filePath, { encoding: 'utf8' });
        ProjectFile.debugFile(data);
        var file: IProjectFile = xmlMapping.load(data, { nested: true, longTag: true });

        return file;
    }

    static write = function (filePath: string, data: IProjectFile) {
        task.debug('ProjectFile.write');
        task.debug('filePath: ' + filePath);

        var xml = xmlMapping.dump(data, { indent: true });
        ProjectFile.debugFile(xml);

        fs.writeFileSync(filePath, xml, { encoding: 'utf8' });
    }
}