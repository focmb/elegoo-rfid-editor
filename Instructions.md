# Changes made with support from claude

# Changes to the original repo:

- added spoolman integration

# Test

- clone the repo
- go into repo dir
- nmp install
- npm run dev -- --host 0.0.0.0
- in the editor set the spoolman URL (IP:Port)

# Requirement

- selfhosted spoolman (Docker)
- spoolman and elegoo-rfid-editor are reachable via https (domains with real certificates)
- VHost for Nginx Reverse Proxy

```
server {
    listen 443 ssl;
    http2 on;
    server_name rfideditor.domain.de;
    ssl_certificate ...;
    ssl_certificate_key ...;

    location / {
        proxy_pass http://172.16.1.4:8092;  # port and ip from elegoo-rfid-editor docker container
        proxy_set_header Host $host;
    }

    location /spoolman/ {
        proxy_pass http://172.16.1.4:7912/; # port and ip from spoolman docker container
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

or

- CORS option ist set in spoolman
  
```
  spoolman:
    image: ghcr.io/donkie/spoolman:latest
    container_name: centauri-spoolman
    restart: unless-stopped
    volumes:
      - type: bind
        source: ./spoolman-data
        target: /home/app/.local/share/spoolman
    ports:
      - "172.16.1.4:7912:8000"
    environment:
      - TZ=Europe/Berlin
      - SPOOLMAN_CORS_ORIGIN=http://172.31.0.3:5173 #IP and port of the elegoo-rfid-editor
```
  <img width="1849" height="1185" alt="Bildschirmfoto vom 2026-07-08 13-44-56" src="https://github.com/user-attachments/assets/c901e4e4-1f7b-4e26-82ae-8f5ab0009954" />
