# Deployment Plan for Farm Website (Frontend) and GBros API (Backend) on Ubuntu 24.04 LTS

---

## Overview of the Deployment Architecture

Deploy both the **farm-website** frontend and **gbros-api** backend on a single Ubuntu 24.04 LTS host.  

- The goal is to serve the **Svelte/Tailwind frontend** publicly (via **Cloudflare Tunnel**), while keeping the **FastAPI backend** accessible only to the local host for security.  
- In production, the frontend will be a **static web app** (built with Vite) served through a lightweight web server, and it will communicate with the backend via an **internal reverse proxy**.  
- This ensures the backend (running on port `8000`) is not exposed to the internet, fulfilling the requirement that the API only accepts requests from `localhost`.  
- Cloudflare Tunnel will handle external access to the frontend (solving dynamic DNS issues and avoiding open ports) and can optionally enforce **Zero-Trust access control**.  

**High-level plan:**
1. Build the frontend into static assets with Vite and configure it to call the backend’s API via relative paths (through a proxy).  
2. Containerize/configure the backend using the existing Docker setup for production (Gunicorn + Uvicorn on port 8000) with environment variables and data volume.  
3. Set up a reverse proxy (Nginx or Caddy) to serve frontend static files and forward `/api` requests to the backend on `localhost`.  
4. Run Cloudflare Tunnel on the host, forwarding your domain (e.g. `farm.greenhill.net.au`) to the frontend server.  
5. Lock down backend access by binding to `127.0.0.1` or firewalling, so only the reverse proxy can communicate with it.  

This results in a **hands-off, self-hosted deployment**: services run continuously (via Docker Compose or systemd) without manual dev server management.

---

## Preparing and Building the Frontend (Svelte + Vite + Tailwind)

1. **Install Node and build tools**:  
   Ensure Node.js, npm/yarn, and project dependencies are installed (`package.json`). Add Vite + Svelte if missing, and configure Vite for Svelte.

2. **Configure API URLs for production**:  
   - Replace local file URLs with backend endpoints (`/api/data/farm` instead of `data/farm.geojson`).  
   - Use environment variables via `import.meta.env` (e.g. `VITE_API_BASE="/api"`).  
   - Or adjust config/constants at build time.  

3. **Run the production build**:  
   Run `npm run build` to generate optimized static files in `dist/`.  
   If you have a separate Tailwind build step (e.g. `npm run build:css`), run that too.

4. **Verify the build**:  
   Open `dist/index.html` locally. Ensure assets load and API calls are proxied correctly.  

At the end, you’ll have a static `dist/` directory ready to deploy.

---

## Deploying the Backend API with Docker

1. **Install Docker & Compose** on the Ubuntu server. Add your user to the `docker` group if desired.  

2. **Prepare environment variables**:  
   - Store in `.env` file.  
   - Include Ecowitt API keys (`ECOWITT_APP_KEY`, `ECOWITT_API_KEY`, `ECOWITT_DEVICE_ID`).  
   - Set `FRONTEND_ORIGIN=https://farm.greenhill.net.au`.  
   - Configure `DATA_DIR=/var/lib/farmapp` for persistence.  

3. **Use production Docker setup**:  
   - Build with:  
     ```bash
     docker build -f Dockerfile.prod -t farmapp:prod .
     ```  
   - Or use Compose:  
     ```bash
     docker compose -f dockerfile-compose.yml.prod up -d --build
     ```  
   - This seeds the database and runs Gunicorn on port `8000`.  

4. **Restrict API service to localhost**:  
   - Bind port: `"127.0.0.1:8000:8000"` in Compose.  
   - Or remove port mapping and use Docker DNS.  
   - Or firewall using UFW.  

5. **Confirm backend operation**:  
   ```bash
   curl http://127.0.0.1:8000/api/health
   ```  
   Should return `{"status": "ok"}`.  
   Logs: `docker compose logs -f api`.

---

## Setting Up the Frontend Server and Reverse Proxy

1. **Choose a web server**: Nginx (recommended), Caddy, or Apache.  

2. **Copy frontend files to server**:  
   Upload `dist/` to `/var/www/farmapp`.  

3. **Configure Nginx** (`/etc/nginx/sites-available/farmapp`):  
   ```nginx
   server {
       listen 80 default_server;
       server_name farm.greenhill.net.au;
       root /var/www/farmapp;
       index index.html;

       location / {
           try_files $uri $uri/ /index.html =404;
       }

       location /api/ {
           proxy_pass http://127.0.0.1:8000/;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

4. **Test Nginx locally**:  
   - Enable site (`ln -s`), run `nginx -t`, reload.  
   - Curl `/` and `/api/health` to check routing.  

5. **SSL/TLS Termination**: Handled by Cloudflare Tunnel, so Nginx can stay HTTP-only.  

6. **Alternative**: Use Nginx in a Docker container alongside the backend.

---

## Cloudflare Tunnel Configuration for External Access

1. **Install and login**:  
   ```bash
   cloudflared login
   ```

2. **Create tunnel**:  
   ```bash
   cloudflared tunnel create farm-tunnel
   ```
   Config (`~/.cloudflared/config.yml`):  
   ```yaml
   tunnel: <Tunnel-ID>
   credentials-file: /home/<user>/.cloudflared/<Tunnel-ID>.json

   ingress:
     - hostname: farm.greenhill.net.au
       service: http://localhost:80
     - service: http_status:404
   ```

3. **Run tunnel**:  
   ```bash
   cloudflared tunnel run farm-tunnel
   ```

4. **Run as service**:  
   ```bash
   cloudflared service install
   ```

5. **Optional – Cloudflare Access (Zero-Trust)**:  
   Configure login rules (email, SSO, or OTP) via Cloudflare dashboard. Free tier supports up to 50 users.

6. **Future domain changes**:  
   Update Cloudflare DNS + backend `FRONTEND_ORIGIN`.

---

## Verification and Monitoring

- **Frontend test**: Access via Cloudflare domain, check map/data loads correctly.  
- **Backend test**: Ensure port `8000` isn’t exposed externally.  
- **Logs**:  
  - `/var/log/nginx/access.log`  
  - `docker compose logs api`  
  - `journalctl -u cloudflared`  

**Performance**:  
- Nginx serves static files fast.  
- Gunicorn with 2 workers handles API calls.  
- Cloudflare adds slight latency but CDN caching helps.  

**Maintenance**:  
- Backend: rebuild Docker image and restart container on updates.  
- Frontend: rebuild and redeploy `dist/`.  
- Cloudflare Tunnel auto-reconnects.  
- Monitor logs for errors.

---

## References

- [Dockerfile.prod](https://github.com/greenhillth/gbros-api/blob/fac5ca980499ce140f8ea245d85c639e862f1f51/Dockerfile.prod)  
- [config.js](https://github.com/greenhillth/farm-website/blob/0ca7e6453956aca384e1bd2a5e79168cbf2db090/assets/js/config.js)  
- [farm.py](https://github.com/greenhillth/gbros-api/blob/fac5ca980499ce140f8ea245d85c639e862f1f51/farmapp/routes/farm.py)  
- [package.json](https://github.com/greenhillth/farm-website/blob/0ca7e6453956aca384e1bd2a5e79168cbf2db090/package.json)  
- [config.py](https://github.com/greenhillth/gbros-api/blob/fac5ca980499ce140f8ea245d85c639e862f1f51/farmapp/config.py)  
- [dockerfile-compose.yml.prod](https://github.com/greenhillth/gbros-api/blob/fac5ca980499ce140f8ea245d85c639e862f1f51/dockerfile-compose.yml.prod)  
- [main.py](https://github.com/greenhillth/gbros-api/blob/fac5ca980499ce140f8ea245d85c639e862f1f51/farmapp/main.py)
