# synchronode
A semi-decentralized file synchronization tool based on WebSockets.

## High-level Design
Several instances of this app can run on separate servers. Each instance can act as a master and as a slave.

A slave communicates to the master via WebSocket the files available as well as a token.

A client can send the master HTTP / WebDAV requests to access the shared files. 

## Configuration
Configuration is defined as a Node.js module, by default in `config.js` in the application's root.

### Options
port (number): The port to listen for incoming requests on.
master (string): URL for the master of this instance. May be empty, if this is a Grandmaster.
shareRoot (string): path to the folder relative to which the paths are shared

### Example: master
```JSON
{
	"port": 3000,
	"shareRoot": ".",
}
```

### Example: slave
```JSON
{
	"port": 80,
	"master": "example.com",
	"shareRoot": "/home/billg/Documents",
}
```

### Example: Apache reverse proxy configuration on master
Assuming Apache does the reverse proxying, these site configurations do the job. 
We are assuming that :
- HTTP requests are redirected to use HTTPS
- Let's Encrypt is set up for the domain
- The master is reachable via *example.org* via standard ports (80, 443)
- The master's Synchronode instance is set up to use port 3000.  

#### HTTP redirecting to HTTPS
```
<VirtualHost *:80>
	# Redirect traffic to HTTPS
	
	ServerName example.org
	ProxyRequests off

	<Proxy *>
		Order deny,allow
		Allow from all
	</Proxy>

	ProxyPass /ws/ ws://localhost:3000/ws/
	ProxyPassReverse /ws/ ws://localhost:3000/ws/

	ProxyPass / http://localhost:3000/
	ProxyPassReverse / http://localhost:3000/

	ErrorLog ${APACHE_LOG_DIR}/error.log
	CustomLog ${APACHE_LOG_DIR}/access.log combined

	RewriteEngine on
	RewriteCond %{SERVER_NAME} =example.org
	RewriteRule ^ https://%{SERVER_NAME}%{REQUEST_URI} [END,NE,R=permanent]
</VirtualHost>

# vim: syntax=apache ts=4 sw=4 sts=4 sr noet
```

#### HTTPS traffic redirected to localhost:3000 
```
<IfModule mod_ssl.c>
  <VirtualHost *:443>
    # 
    
    ServerName example.org
    ProxyRequests off

    <Proxy *>
      Order deny,allow
      Allow from all
    </Proxy>

    ProxyPass	/ws/ ws://localhost:3000/ws/
    ProxyPassReverse /ws/ ws://localhost:3000/ws/

    ProxyPass	/ http://localhost:3000/
    ProxyPassReverse	/ http://localhost:3000/


    ErrorLog ${APACHE_LOG_DIR}/error.log
    CustomLog ${APACHE_LOG_DIR}/access.log combined
    SSLCertificateFile /etc/letsencrypt/live/example.org/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/example.org/privkey.pem
    Include /etc/letsencrypt/options-ssl-apache.conf
  </VirtualHost>
</IfModule>
```

## Endpoints
The master exposes these endpoints:

GET /browse/**hostId** : browse files shared by **hostId**

GET /register : get a **hostId** for a new slave.
