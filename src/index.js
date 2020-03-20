const xml_convert = require('xml-js');
const powerShell = require("powershell");
const child_process = require('child_process');
const os = require('os');
const fs = require('fs');

function writeFile(path,newData){
	return new Promise(function(resolve,reject){
		fs.writeFile(path, newData, 'utf8', function(err) {
		    if(!err)
		    	resolve();
		    else{
		    	console.log(err);
		    	process.exit();
		    }
		});
	});
}

function rdcGenerator(fileProperties = {},rdcmanProperties = {}){
	fileProperties.expanded = fileProperties.expanded || true;
	fileProperties.expanded = (fileProperties.expanded) ? 'True' : 'False';
	this.defaultDomain = os.hostname();
	this.rdcman = {
		properties : {
			programVersion : rdcmanProperties.programVersion || 2.7,
			schemaVersion : rdcmanProperties.schemaVersion || 3
		}
	}
	this.file = {
		properties : {
			expanded : fileProperties.expanded,
			name : fileProperties.name || Math.random().toString(36).substring(7)
		},
		servers : []
	}
}

rdcGenerator.prototype.encryptPassword = function(password,callback){
	let ps = new powerShell(`
		Add-Type -AssemblyName System.Security;
		Function EncryptPassword {
		    [CmdletBinding()]
		    param([String]$PlainText = $null)

		    # convert to RDCMan format: (null terminated chars)
		    $withPadding = @()
		    foreach($char in $PlainText.ToCharArray()) {
		        $withPadding += [int]$char
		        $withPadding += 0
		    }

		    # encrypt with DPAPI (current user)
		    $encrypted = [Security.Cryptography.ProtectedData]::Protect($withPadding, $null, 'CurrentUser')
		    return $base64 = [Convert]::ToBase64String($encrypted)
		}
		$plainText = '${password}'
		$encrypted = EncryptPassword($plainText)
		Write-Host "$encrypted"
	`);
	ps.on("output",function(encryptedPassword){
		callback(encryptedPassword);
	});
}

rdcGenerator.prototype.addServer = function(serverInfo = {},properties = { logonCredentialsProperties : {}, profileNameProperties : {} }){
	let self = this;
	return new Promise(function(resolve,reject){
		self.encryptPassword(serverInfo.password,function(encryptedPassword){
			self.file.servers.push({
				serverInfo : {
					name : serverInfo.name,
					userName : serverInfo.userName || 'Administrator',
					password : encryptedPassword,
					domain : serverInfo.domain || self.defaultDomain
				},
				properties : {
					logonCredentialsProperties : {
						inherit : properties.logonCredentialsProperties.inherit || 'None'
					},
					profileNameProperties : {
						value : properties.profileNameProperties.value || 'Custom',
						scope : properties.profileNameProperties.scope || 'Local'
					}
				}
			});
			resolve();
		});
	});
}

rdcGenerator.prototype.export = function(type = 'string',filePath = ''){
	let self = this;
	let servers = self.file.servers;
	let xml = `
		<?xml version="1.0" encoding="utf-8"?>
		<RDCMan programVersion="${self.rdcman.properties.programVersion}" schemaVersion="${self.rdcman.properties.schemaVersion}">
		  	<file>
			    <credentialsProfiles />
			    <properties>
			      	<expanded>${self.file.properties.expanded}</expanded>
			      	<name>${self.file.properties.name}</name>
			    </properties>
		  	</file>
		  	<connected />
		  	<favorites />
		  	<recentlyUsed />
		</RDCMan>
	`;
	let obj = JSON.parse(xml_convert.xml2json(xml, {compact: true, spaces: 4}));
	obj.RDCMan.file.server = [];
	for(let i=0;i<servers.length;i++){
		obj.RDCMan.file.server.push({
			properties : {
				name : servers[i].serverInfo.name
			},
			logonCredentials : {
				_attributes : {
					inherit : servers[i].properties.logonCredentialsProperties.inherit
				},
				profileName : {
					_attributes : {
						scope : servers[i].properties.profileNameProperties.scope
					},
					_text : servers[i].properties.profileNameProperties.value
				},
				userName : {
					_text : servers[i].serverInfo.userName
				},
				password : {
					_text : servers[i].serverInfo.password
				},
				domain : {
					_text : servers[i].serverInfo.domain
				},
			}
		});
	}
	xml = xml_convert.js2xml(obj, {compact: true, spaces: 4});
	if(type == 'string'){
		return xml;
	}
	if(type == 'file'){
		writeFile(filePath,xml);
	}
}


module.exports = rdcGenerator;