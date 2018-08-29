import tmrm = require('vsts-task-lib/mock-run');
import path = require('path');

let taskPath = path.join(__dirname, '..', 'index.js');
let tmr: tmrm.TaskMockRunner = new tmrm.TaskMockRunner(taskPath);

tmr.setInput('projectFiles', '**\\*.csproj');

tmr.setInput('packageVersionMajor', '$(Date:dd)$(Date:mm)');
tmr.setInput('packageVersionMinor', '$(DayOfYear)$(DayOfYear)');

//tmr.setInput('assemblyVersionMajor', '9');
tmr.setInput('assemblyVersionMinor', '3');
//tmr.setInput('assemblyVersionBuild', '9');
//tmr.setInput('assemblyVersionRevision', '9');


//tmr.setInput('fileVersionMajor', '9');
//tmr.setInput('fileVersionMinor', '9');
tmr.setInput('fileVersionBuild', '3');
tmr.setInput('fileVersionRevision', '3');

tmr.run();