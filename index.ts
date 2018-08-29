import * as task from 'vsts-task-lib/task';
import * as glob from 'glob';
import * as dateformat from 'dateformat';
import * as dayOfYear from 'current-day-number';
import * as numeral from 'numeral';

import { Version } from './version';
import { ProjectFile, IAttribute } from './projectfile';
import { AttributeUpdateOptions } from './attributeUpdateOptions';
import { BuildNumberRevision } from './buildNumberRevision';

var ensureAttribute = false;
var buildNumberRevision: Number = Number.NaN;

function stringIsNullOrEmpty(value: string): boolean {
    task.debug('stringIsNullOrEmpty');
    task.debug('value: ' + value);
    return value === null || value.length === 0;
}

function isBuildNumberRevisionVariableUsed(parameters: string[]): boolean {
    task.debug('isBuildNumberRevisionVariableUsed');
    var variableFormat = RegExp(/(\$\(Rev:([^\)]*)\))/g);
    for (let parameter of parameters) {
        if (variableFormat.test(parameter)) {
            task.debug('$(Rev) used in \'' + parameter + '\'');
            return true;
        }
    }

    return false;
}

function useParameter(name: string, value: string): string {
    task.debug('useParameter: ' + name);
    task.debug('value: ' + value);

    if (stringIsNullOrEmpty(value)) {
        return '';
    }

    value = expandVariables(name, value);

    return value;
}

function useNumericalParameter(name: string, value: string): number {
    task.debug('useNumericalParameter: ' + name);
    task.debug('value: ' + value);

    value = useParameter(name, value);

    if (stringIsNullOrEmpty(value)) {
        return Number.NaN;
    }

    if (Number.isNaN(Number(value))) {
        throw new Error('Invalid value for ' + name + '. \'' + value + '\'is not a valid numerical value.');
    }

    return Number(value);
}

function expandVariables(name: string, value: string): string {
    task.debug('expandVariables: ' + name);
    task.debug('value: ' + value);

    value = value.replace(/\$\(DayOfYear\)/g, dayOfYear());

    value = expandDateVariables(name, value);
    value = expandBuildNumberRevisionVariables(name, value);

    return value;
}

function expandDateVariables(name: string, value: string): string {
    task.debug('expandDateVariables: ' + name);
    task.debug('value: ' + value);

    var variables = value.match(/(\$\(Date:([^)]*))\)/g);
    task.debug('variables: ' + variables);

    if (!variables) {
        return value;
    }

    for (let variable of variables) {
        task.debug('variable: ' + variable);
        var formats = variable.match(/\$\(Date:([^)]*)\)/);
        var format = formats[1];
        task.debug('format: ' + format);

        var date = dateformat(new Date(), format);
        task.debug('date: ' + date);

        value = value.replace(variable, date);
        task.debug('value: ' + value);
    }

    return value;
}

function expandBuildNumberRevisionVariables(name: string, value: string): string {
    task.debug('expandBuildNumberRevisionVariables: ' + name);
    task.debug('value: ' + value);

    var variables = value.match(/(\$\(Rev:([^\)]*)\))/g);
    task.debug('variables: ' + variables);

    if (!variables) {
        return value;
    }

    for (let variable of variables) {
        task.debug('variable: ' + variable);
        var formats = variable.match(/\$\(Rev:([^\)]*)\)/);
        var format = formats[1];
        task.debug('format: ' + format);

        format = format.replace(/r/g, '0');
        task.debug('format: ' + format);

        value = value.replace(variable, numeral(buildNumberRevision).format(format));
        task.debug('value: ' + value);
    }

    return value;
}

function updateAttribute(options: AttributeUpdateOptions): IAttribute {
    task.debug('updateAttribute: ' + options.name);
    task.debug('attribute: ' + JSON.stringify(options.attribute))
    task.debug('value: ' + JSON.stringify(options.value));
    if (!options.attribute) {
        if (ensureAttribute && options.value) {
            options.attribute = ProjectFile.createAttribute();
        }
        else {
            return options.attribute;
        }
    }

    if (!options.value) {
        return options.attribute;
    }

    options.attribute.$text = options.value.toString();
    task.debug('attribute after update: ' + JSON.stringify(options.attribute))

    return options.attribute;
}

function updateBooleanAttribute(options: AttributeUpdateOptions): IAttribute {
    task.debug('updateBooleanAttribute: ' + options.name);
    task.debug('attribute: ' + JSON.stringify(options.attribute))
    task.debug('value: ' + JSON.stringify(options.value));

    if (options.value == 'none') {
        return options.attribute;
    }

    options.value = Boolean(options.value) ? 'True' : 'False';

    options.attribute = updateAttribute(options);

    return options.attribute;
}

function updateVersionAttribute(options: AttributeUpdateOptions): IAttribute {
    task.debug('updateVersionAttribute: ' + options.name);
    task.debug('attribute: ' + JSON.stringify(options.attribute))
    task.debug('value: ' + JSON.stringify(options.value));
    //if (!options.attribute) {
    //    return options.attribute;
    //}

    var currentVersion = new Version(Number.NaN, Number.NaN, Number.NaN, Number.NaN);

    if (options.attribute) {
        if (!Version.valid(options.attribute.$text)) {
            throw new Error(options.name + ' is not in a valid version format.');
        }
        currentVersion = Version.parse(options.attribute.$text);
    }

    //if (!Version.valid(options.attribute.$text)) {
    //    throw new Error(options.name + ' is not in a valid version format.');
    //}

    //var currentVersion = Version.parse(options.attribute.$text);
    task.debug('currentVersion: ' + currentVersion.toString());

    options.value = currentVersion.assign(options.value);

    if (Version.isEmpty(options.value)){
        return options.attribute;
    }

    options.attribute = updateAttribute(options);

    return options.attribute;
}

async function run() {
    try {
        var projectFiles = task.getPathInput('projectFiles', false, false);

        ensureAttribute = task.getBoolInput('ensureAttribute', false);
        var generateNuGet = task.getInput('generateNuGet', false);
        var requireLicenseAcceptance = task.getInput('requireLicenseAcceptance', false);
        var packageId = task.getInput('packageId', false);
        var authors = task.getInput('authors', false);
        var company = task.getInput('company', false);
        var product = task.getInput('product', false);
        var description = task.getInput('description', false);
        var copyright = task.getInput('copyright', false);
        var licenseUrl = task.getInput('licenseUrl', false);
        var projectUrl = task.getInput('projectUrl', false);
        var iconUrl = task.getInput('iconUrl', false);
        var repositoryUrl = task.getInput('repositoryUrl', false);
        var repositoryType = task.getInput('repositoryType', false);
        var tags = task.getInput('tags', false);
        var releaseNotes = task.getInput('releaseNotes', false);
        var neutralLanguage = task.getInput('neutralLanguage', false);

        var packageVersionMajor = task.getInput('packageVersionMajor', false);
        var packageVersionMinor = task.getInput('packageVersionMinor', false);
        var packageVersionBuild = task.getInput('packageVersionBuild', false);
        var packageVersionRevision = task.getInput('packageVersionRevision', false);

        var assemblyVersionMajor = task.getInput('assemblyVersionMajor', false);
        var assemblyVersionMinor = task.getInput('assemblyVersionMinor', false);
        var assemblyVersionBuild = task.getInput('assemblyVersionBuild', false);
        var assemblyVersionRevision = task.getInput('assemblyVersionRevision', false);

        var fileVersionMajor = task.getInput('fileVersionMajor', false);
        var fileVersionMinor = task.getInput('fileVersionMinor', false);
        var fileVersionBuild = task.getInput('fileVersionBuild', false);
        var fileVersionRevision = task.getInput('fileVersionRevision', false);

        var parameters: string[] = [
            packageId,
            authors,
            company,
            product,
            description,
            copyright,
            licenseUrl,
            projectUrl,
            iconUrl,
            repositoryUrl,
            repositoryType,
            tags,
            releaseNotes,
            neutralLanguage,
            packageVersionMajor,
            packageVersionMinor,
            packageVersionBuild,
            packageVersionRevision,
            assemblyVersionMajor,
            assemblyVersionMinor,
            assemblyVersionBuild,
            assemblyVersionRevision,
            fileVersionMajor,
            fileVersionMinor,
            fileVersionBuild,
            fileVersionRevision
        ];

        if (isBuildNumberRevisionVariableUsed(parameters)) {
            let enableAccessToken = task.getVariable('system.enableAccessToken');
            if (!enableAccessToken || !(enableAccessToken.toLowerCase() === 'true')) {
                throw new Error('\'Allow Scripts to Access OAuth Token\' must be enabled when using the $(Rev:r) variable');
            }

            buildNumberRevision = await BuildNumberRevision.get();
            task.debug('buildNumberRevision: ' + buildNumberRevision);
        }

        var packageVersion = new Version(
            useNumericalParameter("Package Version Major", packageVersionMajor),
            useNumericalParameter("Package Version Minor", packageVersionMinor),
            useNumericalParameter("Package Version Build", packageVersionBuild),
            useNumericalParameter("Package Version Revision", packageVersionRevision)
        );
        task.debug('packageVersion: ' + packageVersion.toString());

        var assemblyVersion = new Version(
            useNumericalParameter("Assembly Version Major", assemblyVersionMajor),
            useNumericalParameter("Assembly Version Minor", assemblyVersionMinor),
            useNumericalParameter("Assembly Version Build", assemblyVersionBuild),
            useNumericalParameter("Assembly Version Revision", assemblyVersionRevision)
        );
        task.debug('assemblyVersion: ' + assemblyVersion.toString());

        var fileVersion = new Version(
            useNumericalParameter("File Version Major", fileVersionMajor),
            useNumericalParameter("File Version Minor", fileVersionMinor),
            useNumericalParameter("File Version Build", fileVersionBuild),
            useNumericalParameter("File Version Revision", fileVersionRevision)
        );
        task.debug('fileVersion: ' + fileVersion.toString());

        packageId = useParameter('Package id', packageId);
        authors = useParameter('Authors', authors);
        company = useParameter('Company', company);
        product = useParameter('Product', product);
        description = useParameter('Description', description);
        copyright = useParameter('Copyright', copyright);
        licenseUrl = useParameter('License Url', licenseUrl);
        projectUrl = useParameter('Project Url', projectUrl);
        iconUrl = useParameter('Icon Url', iconUrl);
        repositoryUrl = useParameter('Repository Url', repositoryUrl);
        repositoryType = useParameter('Repository Type', repositoryType);
        tags = useParameter('Tags', tags);
        releaseNotes = useParameter('Release Notes', releaseNotes);
        neutralLanguage = useParameter('Assembly Neutral Language', neutralLanguage);

        var filePaths = glob.sync(projectFiles, { absolute: true });
        task.debug('filePaths: ' + JSON.stringify(filePaths));

        for (let filePath of filePaths) {
            var file = ProjectFile.read(filePath)

            if (!file.Project) {
                throw new Error('File \'' + filePath + '\' does not contain a root Project. Make sure it is a project file.');
            }
            if (!file.Project.PropertyGroup) {
                throw new Error('File \'' + filePath + '\' does not contain a PropertyGroup. Make sure it is a project file.');
            }

            var properties = file.Project.PropertyGroup;
            properties.Version = updateVersionAttribute(new AttributeUpdateOptions('Package version', properties.Version, packageVersion));
            properties.AssemblyVersion = updateVersionAttribute(new AttributeUpdateOptions('Assembly version', properties.AssemblyVersion, assemblyVersion));
            properties.FileVersion = updateVersionAttribute(new AttributeUpdateOptions('Assembly file version', properties.FileVersion, fileVersion));

            properties.GeneratePackageOnBuild = updateBooleanAttribute(new AttributeUpdateOptions('Generate NuGet Package On Build', properties.GeneratePackageOnBuild, generateNuGet));
            properties.PackageRequireLicenseAcceptance = updateBooleanAttribute(new AttributeUpdateOptions('Require License Acceptance', properties.PackageRequireLicenseAcceptance, requireLicenseAcceptance));
            properties.PackageId = updateAttribute(new AttributeUpdateOptions('Package Id', properties.PackageId, packageId));
            properties.Authors = updateAttribute(new AttributeUpdateOptions('Authors', properties.Authors, authors));
            properties.Company = updateAttribute(new AttributeUpdateOptions('Company', properties.Company, company));
            properties.Product = updateAttribute(new AttributeUpdateOptions('Product', properties.Product, product));
            properties.Description = updateAttribute(new AttributeUpdateOptions('Description', properties.Description, description));
            properties.Copyright = updateAttribute(new AttributeUpdateOptions('Copyright', properties.Copyright, copyright));
            properties.PackageLicenseUrl = updateAttribute(new AttributeUpdateOptions('License Url', properties.PackageLicenseUrl, licenseUrl));
            properties.PackageProjectUrl = updateAttribute(new AttributeUpdateOptions('Project Url', properties.PackageProjectUrl, projectUrl));
            properties.PackageIconUrl = updateAttribute(new AttributeUpdateOptions('Icon Url', properties.PackageIconUrl, iconUrl));
            properties.RepositoryUrl = updateAttribute(new AttributeUpdateOptions('Repository Url', properties.RepositoryUrl, repositoryUrl));
            properties.RepositoryType = updateAttribute(new AttributeUpdateOptions('Repository Type', properties.RepositoryType, repositoryType));
            properties.PackageTags = updateAttribute(new AttributeUpdateOptions('Tags', properties.PackageTags, tags));
            properties.PackageReleaseNotes = updateAttribute(new AttributeUpdateOptions('Release Notes', properties.PackageReleaseNotes, releaseNotes));
            properties.NeutralLanguage = updateAttribute(new AttributeUpdateOptions('Assembly Neutral Language', properties.NeutralLanguage, neutralLanguage));

            ProjectFile.write(filePath, file);
        }
    } catch (error) {
        task.setResult(task.TaskResult.Failed, error.message);
    }
}

run();