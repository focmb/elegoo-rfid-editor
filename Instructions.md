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

or

- CORS option ist set in spoolman

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

  <img width="1849" height="1185" alt="Bildschirmfoto vom 2026-07-08 13-44-56" src="https://github.com/user-attachments/assets/c901e4e4-1f7b-4e26-82ae-8f5ab0009954" />
