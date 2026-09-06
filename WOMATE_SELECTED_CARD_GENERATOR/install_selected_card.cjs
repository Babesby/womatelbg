const fs=require('fs');
const path=require('path');

const project=process.cwd();

const mainFile=
  path.join(project,'src','main.jsx');

const packageRoot=__dirname;

const sourceDir=
  path.join(
    packageRoot,
    'src',
    'selected'
  );

const targetDir=
  path.join(
    project,
    'src',
    'selected'
  );

if(!fs.existsSync(mainFile)){
  console.error(
    'ERROR: src/main.jsx was not found.'
  );

  console.error(
    'Run this installer from the WOMATE project root.'
  );

  process.exit(1);
}

fs.mkdirSync(
  targetDir,
  {recursive:true}
);

for(
  const name of
  fs.readdirSync(sourceDir)
){
  fs.copyFileSync(
    path.join(sourceDir,name),
    path.join(targetDir,name)
  );
}

let source=
  fs.readFileSync(
    mainFile,
    'utf8'
  );

if(
  source.includes(
    'WOMATE_SELECTED_ROUTE_GATE'
  )
){
  console.log(
    'Selected Card route is already installed.'
  );

  process.exit(0);
}

if(
  /^\s*export\s/m.test(source)
){
  console.error(
    'ERROR: src/main.jsx contains top-level exports. Route gate was not installed.'
  );

  process.exit(2);
}

const lines=
  source.split(/\r?\n/);

let lastImport=-1;

for(
  let i=0;
  i<lines.length;
  i++
){
  if(
    /^\s*import\b/.test(lines[i])
  ){
    lastImport=i;
  }
}

if(lastImport<0){
  console.error(
    'ERROR: Could not locate imports in src/main.jsx.'
  );

  process.exit(3);
}

const importLines=
  lines.slice(
    0,
    lastImport+1
  );

const bodyLines=
  lines.slice(
    lastImport+1
  );

const gate=[
  '',
  '// WOMATE_SELECTED_ROUTE_GATE',
  "const __WOMATE_SELECTED_ROUTE__ = window.location.pathname.replace(/\\/$/,'') === '/selected';",
  '',
  'if(__WOMATE_SELECTED_ROUTE__){',
  "  import('./selected/selectedStandalone.jsx');",
  '}else{',
  bodyLines.join('\n'),
  '}',
  ''
].join('\n');

const next=
  importLines.join('\n')+
  '\n'+
  gate;

const backup=
  mainFile+
  '.before-selected-card.bak';

if(!fs.existsSync(backup)){
  fs.copyFileSync(
    mainFile,
    backup
  );
}

fs.writeFileSync(
  mainFile,
  next,
  'utf8'
);

console.log('');
console.log(
  'INSTALLED: WOMATE Selected Card Generator'
);
console.log(
  'ROUTE: /selected'
);
console.log('');
console.log(
  'Next: npm run build'
);
