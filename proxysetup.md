# Proxy setup instructions (for Claude in Chrome)

Hand this file to Claude in Chrome. It sets up the Ultraviolet web proxy on the user's own Oracle Cloud VM, using only the browser.

## Setting it up again

This file can be run again on a machine that already has some of it. Every step below is safe to repeat: it updates the existing copy and replaces the old container instead of failing. Before step 1, ask the user whether the proxy should run on:

- **their own PC** (already works for them at `http://localhost:8080`): you cannot run commands on their PC from the browser, so give them the commands in the "Own PC" section at the end and let them run them in PowerShell, or
- **their Oracle VM** (steps 1 to 8), which needs HTTPS to work properly.

## Goal

Run the open-source [Ultraviolet](https://github.com/titaniumnetwork-dev/Ultraviolet-App) and [Scramjet](https://github.com/MercuryWorkshop/scramjet) web proxies together in one Docker container on the user's existing Oracle Cloud Ubuntu VM, with one start page (tabs, engine choice in its Settings, DuckDuckGo search), so the user can reach both from one address.

## Rules (read first)

- Work only with the user's own Oracle Cloud account and VM. Do not create new paid resources, and never enter payment details.
- If you hit a login, 2FA, captcha or SSH key prompt, **stop and ask the user**. Do not guess or try to bypass it.
- Never ask for, copy or paste the user's password or private key into any chat. The user uploads or selects their own key.
- Before changing any firewall or network rule, show the user the exact rule and wait for a yes.
- Do not open any port to the whole internet (`0.0.0.0/0`) unless the user explicitly says to. Prefer the user's own public IP.
- This kind of proxy can get around school or work web filters. Remind the user to use it only where their network's rules allow it.
- If a step fails, show the user the exact error text and stop. Do not retry blindly.

## What you need from the user

1. They are logged in to `cloud.oracle.com`.
2. The name of the VM (Compute, Instances) to use, and confirmation that it runs Ubuntu.
3. Their SSH private key file. Cloud Shell needs it to log in to the VM, and the user has to upload it themselves.

## Steps

### 1. Open Cloud Shell
In the Oracle console, click the terminal icon (`>_`) at the top right. Wait for the shell to start.

### 2. Log in to the VM
Ask the user to upload their key with Cloud Shell's upload option (gear or menu icon). Then run, replacing the names:
```sh
chmod 600 <keyfile>
ssh -i <keyfile> ubuntu@<vm-public-ip>
```
The public IP is on the instance's details page. Type `yes` if it asks about the fingerprint. The prompt should change to `ubuntu@...`.

### 3. Install Docker if it is missing
```sh
docker --version || (sudo apt-get update && sudo apt-get install -y docker.io git)
sudo systemctl enable --now docker
```

### 4. Get the combined proxy and build it
The proxy is one server that runs **both Ultraviolet and Scramjet** on port 8080, with a new start page. It lives in the `proxy-server/` folder of the repo `pebbleford/gnmath`. Get or update the repo, then build:
```sh
if [ -d ~/gnmath/.git ]; then git -C ~/gnmath pull --ff-only; else git clone --depth 1 https://github.com/pebbleford/gnmath ~/gnmath; fi
cd ~/gnmath/proxy-server
head -3 public/index.html
sudo docker build -t gnmath-proxy .
```
`head` should show `<!doctype html>`. The build can take several minutes. If it errors, show the user the last 20 lines.

### 5. Run it
The old proxy containers use the same port, so stop them first. Tell the user before removing anything, and do not delete the old image.
```sh
sudo docker rm -f ultraviolet-app scramjet-app gnmath-proxy 2>/dev/null
sudo docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy
sudo docker ps
sudo docker logs gnmath-proxy | tail -5
```
`docker ps` should show `gnmath-proxy` with `0.0.0.0:8080->8080/tcp`, and the log should say `Listening on`.
### 6. Open the port (ask the user first)
Oracle blocks ports in two places. Show the user each change before making it.

a. **In the Oracle console:** open the instance, then its subnet, then its **Security List** (or Network Security Group). Add an **Ingress Rule**:
   - Source CIDR: the user's own public IP followed by `/32` (ask the user for it, or have them look it up). Use `0.0.0.0/0` only if the user explicitly says so.
   - IP protocol: TCP
   - Destination port: 8080

b. **On the VM:**
```sh
sudo iptables -I INPUT -p tcp --dport 8080 -j ACCEPT
sudo apt-get install -y iptables-persistent
sudo netfilter-persistent save
```

### 7. HTTPS (needed for the proxy to work properly)
Ultraviolet uses service workers, which browsers only allow on HTTPS pages or on `localhost`. Plain `http://<vm-ip>:8080` will most likely not work.

**Stop here and ask the user how they want to get HTTPS.** Do not set up any tunnel or public exposure yourself. Common choices are a domain with a certificate in front of the proxy, or running the proxy on their own PC (where `http://localhost:8080` works) instead of the VM. Only continue once the user has chosen and told you exactly what to do.

### 8. Check it works
Open the HTTPS address the user chose in step 7 in Chrome or Edge. Type `duckduckgo.com` or a search term in the box. A page should load. If the browser says the service worker failed or the page is blank, the usual cause is that the address is not HTTPS.

### 9. Point the website at the proxy
The user's website is already hosted on **bunny.net** and already set up. Do not set up any hosting, and do not touch GitHub Pages. Just switch to the new UI:
1. Open the user's bunny.net site address (ask the user for it if you do not have it).
2. Check that it shows the **new UI**: a **Proxy** button in the top bar and a **Settings** button at the bottom right. If it does, continue at step 4.
3. If it still shows the old UI, hold-refresh the page. There is no "switch UI" option in bunny.net: the new UI is just the newer site files from the repo `pebbleford/gnmath` (`index.html`, the `assets/` folder and `fern-proxy.html`). If the old UI persists, ask the user how their bunny.net site gets its files, then follow the matching case below. Ask before changing anything in the dashboard:
   - **Pull zone with an origin URL:** the new files must be at the origin. If they are, purge the cache (bunny.net, **CDN**, the pull zone, **Caching**, **Purge Cache**).
   - **Storage zone:** the user (or you, with their permission) uploads the new files over the old ones in the storage zone's file manager, then purges the pull zone's cache.
   Do not guess which case applies.
4. Click **Settings**, find **Web proxy**, enter the proxy address from step 7, and click **Save**.
5. Click **Proxy** in the top bar. The proxy should open in a new tab.

The address is saved in that browser only, so it has to be set on each device.

## Own PC (give these to the user to run themselves)
Docker Desktop must be open and running ("Engine running"). In PowerShell:
```powershell
cd ~/gnmath
git pull
cd proxy-server
docker rm -f ultraviolet-app scramjet-app gnmath-proxy
docker build -t gnmath-proxy .
docker run -d --name gnmath-proxy --restart unless-stopped -p 8080:8080 gnmath-proxy
```
If `~/gnmath` does not exist yet, first run `git clone https://github.com/pebbleford/gnmath ~/gnmath`. Then open `http://localhost:8080` in Chrome or Edge and hold-refresh (Ctrl+F5).

## Report back to the user
Say plainly what worked and what did not. Include:
- the address to use,
- the commands to stop and start it: `sudo docker stop gnmath-proxy` and `sudo docker start gnmath-proxy`,
- anything that failed, with the exact error text.

## Notes
- Ultraviolet is GPL-3.0 and its authors no longer maintain it; Scramjet is AGPL-3.0. If the user runs this for other people, they must offer the source.
- This is a separate program from Fern proxy, which is a PostgreSQL data-masking proxy and cannot proxy websites.
- The combined server was put together by reading the Ultraviolet and Scramjet app code and has not been tested end to end. If one engine fails, try the other and report the exact error.
- The old containers (`ultraviolet-app`, `scramjet-app`) are replaced by one container, `gnmath-proxy`, on port 8080. Port 8081 is no longer used.
- None of these steps have been run by the author of this file. Expect to troubleshoot.

