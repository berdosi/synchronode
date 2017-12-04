# synchronode
A semi-decentralized file synchronization tool based on WebSockets.

## High-level Design
Several instances of this app can run on separate servers. Each instance can act as a master and as a slave.

A slave communicates to the master via WebSocket the files available as well as a token.

A client can send the master HTTP / WebDAV requests to access the shared files. 

## Configuration
Configuration is defined a Node.js module, by default in `configuration.js`

### Options
port (number): The port to listen for incoming requests on.
master (string): URL for the master of this instance. May be empty, if this is a Grandmaster.
shareRoot (string): path to the folder relative to which the paths are shared
folders (Array<Folder>): an array of the folders to share.

A Folder object has these properties:

path (string): path of the folder relative to shareRoot

permissions (string): r/rw

visibility ("peers"|"swarm"|"masters"): 
if set to "masters", it will be visible merged with the master's content in case the master has a further master higher in the hierarchy. If "swarm", then the content is visible on the master's /swarm endpoint. If "peers" the content is only visible when the peer's own endpoint is opened.

include (Array<RegExp>): an array of regular expressions specifying the files to share

exclude (Array<RegExp>): an array of regular expressions specifying the files to omit from the shared ones 

### Example: top-level master
```JSON
{
	port: 80,
	master: "",
	shareRoot: ".",
	folders: []
}
```

### Example: slave
```JSON
{
	port: 80,
	master: "example.com/synchronode",
	shareRoot: "/home/billg/Documents",
	folders: [
		{
			path: "/ActivityReports",
			permissions: "r",
			visibility: "swarm",
			include: [ 
				/.*.doc.?/, 
				/.*.gif/
			], 
			exclude: [ 
				/.*porn.*/ 
			] 
		}
	]
}
```

## Endpoints
Each node exposes these endpoints:

GET /browse : browse files shared by the peers.

GET /browse/**hostId** : browse files shared by **hostId**

GET /browse/swarm : browse all the files 

GET /register : get a **hostId**

GET /me : Show own host ID

POST /login : log on to the master.

PUT /list : update slave's list of files on master. 

WSS /list/add : update slave's list of files on master. 

WSS /list/delete : update slave's list of files on master. 

## Further Plans
* WebDAV may be implemented on /browse in the future 