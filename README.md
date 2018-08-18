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
	"master": "example.org",
	"shareRoot": "/home/billg/Documents",
}
```

# Reverse Proxy Configuration
Below examples can be used to configure the master. They assume that :
- you are running synchronode behind a reverse proxy, which takes care of the certificates for the HTTPS connection (Let's Encrypt's Certbot was used)
- the master is reachable on *https://example.org*
- the synchronode instance is listening on port 3000
## Apache
### Example: Apache reverse proxy configuration on master
Assuming Apache does the reverse proxying, these site configurations do the job. 
We are assuming that HTTP requests are redirected to use HTTPS

### HTTP redirecting to HTTPS
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

	ProxyPass /browserWs/ ws://localhost:3000/browserWs/
	ProxyPassReverse /browserWs/ ws://localhost:3000/browserWs/

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

### HTTPS traffic redirected to localhost:3000 
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
		
		ProxyPass /browserWs/ ws://localhost:3000/browserWs/
		ProxyPassReverse /browserWs/ ws://localhost:3000/browserWs/

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
## nginx
### Reverse Proxy Configuration for nginx
```
server {        
		# redirect to HTTPS                                                                    
    if ($host = example.org) {                                                  
        return 301 https://$host$request_uri;                                          
    }                                                            
		listen 80 default_server;                                                      
    listen [::]:80 default_server;                                                 
                                                                                       
    return 404;                                                                                
}                                    

server {
	listen example.org:443 ssl; 
	server_name example.org;
	ssl_certificate /etc/letsencrypt/live/example.org/fullchain.pem;
	ssl_certificate_key /etc/letsencrypt/live/example.org/privkey.pem;
	include /etc/letsencrypt/options-ssl-nginx.conf;
	ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
	# normal HTTP requests
	location / { 
			proxy_bind 127.0.0.1;
			proxy_pass http://127.0.0.1:3000;
	}
	# websocket requests coming from other synchronode instances
	location /ws {
			proxy_bind 127.0.0.1;
			proxy_pass http://127.0.0.1:3000;       
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade; 
			proxy_set_header Connection "upgrade";  
	}
	# websocket requests coming from the browser
	location /browserWs {
			proxy_bind 127.0.0.1;
			proxy_pass http://127.0.0.1:3000;
			proxy_http_version 1.1;
			proxy_set_header Upgrade $http_upgrade;
			proxy_set_header Connection "upgrade";
	}
}
```

## Endpoints
The master exposes these endpoints:

GET /browse/**hostId** : browse files shared by **hostId**

GET /register : get a **hostId** for a new slave.
