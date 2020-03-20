# rdc-generator
This package can be use to generate Remote Desktop Connection Manager file !

# install
```
npm i rdc-generator
```

# code example
```javascript
const rdcGenerator = require('rdc-generator');
async function main(){
	let rdcm = new rdcGenerator({
	 	name : 'vps',			//default's a random string
	 	expanded : true			//is default
	},{
		programVersion : 2.7,	//is default
		schemaVersion : 3		//is default
	});

	//let rdcm = new rdcGenerator({ name : 'vps' });

	await rdcm.addServer({
		name : '161.202.160.20',
		password : 'vpsPassword',
		userName : 'Administrator',		//default's Administrator
		domain : 'YourComputerName'		//default's your computer name
	},{
		logonCredentialsProperties : {
			inherit : 'None'			//default's None
		},
		profileNameProperties : {
			value : 'Custom',			//default's Custom
			scope : 'Local'				//default's Local
		}
	});

	await rdcm.addServer({
		name : '146.243.56.21',
		password : 'vpsPassword2',
	});

	//rdcm.export('file','vps.rdg');
	
	let xml = rdcm.export('string');
	console.log(xml)
}

main();
```
