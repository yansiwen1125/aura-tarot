import {readdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
const files=['app.js','core.js','content.js','simulator.js','server.mjs'];
for(const dir of ['server','shared','client'])for(const file of await readdir(dir))if(/\.(js|mjs)$/.test(file))files.push(`${dir}/${file}`);
for(const file of files){const result=spawnSync(process.execPath,['--check',file],{stdio:'inherit'});if(result.status)process.exit(result.status);}
console.log(`Syntax verified: ${files.length} modules.`);
